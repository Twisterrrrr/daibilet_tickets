# Витрина SupplierDailyStat — проектирование

**Цель:** убрать тяжёлые агрегаты по `PaymentIntent` с пути дашборда и отчётов поставщика. При 100k+ оплаченных заказах один запрос `aggregate({ where: { supplierId, status: 'PAID' }, _sum: {...}, _count })\)` даёт нагрузку на индекс и таблицу. Витрина даёт **один быстрый скан по маленькой таблице** (одна строка на поставщика на день).

**Фаза:** Phase 5 — Analytics & Heavy Ops (Pre-aggregation).

---

## 1. Источник истины

- **Таблица:** `payment_intents`.
- **Условие:** `status = 'PAID'`, `supplierId IS NOT NULL`, `paidAt IS NOT NULL`.
- **Группировка:** по `(supplierId, DATE(paidAt))` в UTC. Один календарный день = одна строка витрины на поставщика.

Суммы уже хранятся в копейках: `grossAmount`, `platformFee`, `supplierAmount`. Дополнительно считаем `COUNT(id)` как число оплаченных заказов за день.

---

## 2. Схема таблицы (Prisma)

```prisma
// ========================
// Витрина: дневная статистика по поставщику (Phase 5)
// ========================

model SupplierDailyStat {
  id                  String   @id @default(cuid())
  operatorId          String   @db.Uuid
  statDate            DateTime @db.Date   // День в UTC (DATE_TRUNC day от paidAt)

  ordersPaidCount     Int      @default(0)
  grossAmountCents    Int      @default(0)
  platformFeeCents    Int      @default(0)
  supplierAmountCents Int      @default(0)

  // Расширение Phase 5: возвраты (опционально)
  refundsCount        Int?     @default(0)
  refundAmountCents   Int?     @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  operator Operator @relation(fields: [operatorId], references: [id], onDelete: Cascade)

  @@unique([operatorId, statDate])
  @@index([operatorId])
  @@index([statDate])
  @@index([operatorId, statDate])
  @@map("supplier_daily_stats")
}
```

В модели **Operator** добавить:

```prisma
supplierDailyStats SupplierDailyStat[]
```

**Типы:** все суммы в копейках (Int), дата — только день (PostgreSQL `DATE` / Prisma `@db.Date`), без времени.

---

## 3. Заполнение витрины

### 3.1. Ежедневный cron (рекомендуемый вариант)

- **Расписание:** раз в сутки (например 02:00 UTC).
- **Логика:** для каждого дня `d`, по которому ещё нет полного среза (или только «вчера»):
  - Выполнить агрегат по `PaymentIntent`: `supplierId`, `status = 'PAID'`, `paidAt >= d 00:00`, `paidAt < d+1 00:00`.
  - Для каждой пары `(operatorId, d)` — `upsert` в `SupplierDailyStat` (по `@@unique([operatorId, statDate])`).
- **Идемпотентность:** повторный прогон за тот же день перезаписывает строку теми же данными (без дубликатов).

### 3.2. Backfill (первый запуск)

- За один проход (или по частям по месяцам) для всех `PaymentIntent` с `status = 'PAID'` и `paidAt IS NOT NULL`:
  - Сгруппировать по `(supplierId, DATE(paidAt))`.
  - Вставить/обновить строки в `SupplierDailyStat`.
- Можно ограничить глубину (например последние 2 года), чтобы не трогать старые данные, если они не нужны для отчётов.

### 3.3. Реал-тайм (не в MVP)

- При переходе платежа в `PAID` (webhook или внутренний переход) инкрементировать строку за `DATE(paidAt)` (например через `UPDATE ... SET ordersPaidCount = ordersPaidCount + 1, ... WHERE operatorId = ? AND statDate = ?`). Требует аккуратной конкурентности (lock или advisory lock по `(operatorId, statDate)`).

---

## 4. Использование в Dashboard и отчётах

### 4.1. Текущий контракт Dashboard (sales)

Сейчас ответ содержит:

```ts
sales: {
  totalOrders: number;   // _count.id по всем PAID
  grossRevenue: number; // _sum.grossAmount (копейки)
  platformFee: number;   // _sum.platformFee
  netRevenue: number;   // _sum.supplierAmount
}
```

**Замена:** один запрос к витрине:

```ts
const totals = await prisma.supplierDailyStat.aggregate({
  where: { operatorId },
  _sum: {
    grossAmountCents: true,
    platformFeeCents: true,
    supplierAmountCents: true,
  },
  _sum: { ordersPaidCount: true }, // в Prisma нет _sum для count, поэтому отдельно:
});
// В Prisma _sum для Int даёт сумму чисел; ordersPaidCount нужно суммировать через raw или groupBy
```

В Prisma для «суммы количества заказов» по всем дням лучше сделать:

```ts
const rows = await prisma.supplierDailyStat.aggregate({
  where: { operatorId },
  _sum: {
    grossAmountCents: true,
    platformFeeCents: true,
    supplierAmountCents: true,
  },
  _count: { id: true },
});
// Но _sum(ordersPaidCount) нет в aggregate. Варианты:
// 1) Raw: SELECT SUM(orders_paid_count), SUM(gross_amount_cents), ... FROM supplier_daily_stats WHERE operator_id = ?
// 2) Или оставить один раз в день обновлять денормализованную таблицу SupplierTotals (одна строка на оператора) из этой витрины.
```

Практичный вариант: **сырой SQL** для дашборда:

```sql
SELECT
  COALESCE(SUM(orders_paid_count), 0) AS total_orders,
  COALESCE(SUM(gross_amount_cents), 0) AS gross_revenue,
  COALESCE(SUM(platform_fee_cents), 0) AS platform_fee,
  COALESCE(SUM(supplier_amount_cents), 0) AS net_revenue
FROM supplier_daily_stats
WHERE operator_id = $1;
```

Один индекс по `operatorId` — полный скан только по строкам одного поставщика (десятки/сотни строк за годы).

### 4.2. Отчёты по периоду (reports/sales, графики)

- **За последние N дней:** `WHERE operatorId = ? AND statDate >= ? AND statDate < ?` — те же суммы и `ordersPaidCount` по дням для графиков.
- **Сравнение недель:** два диапазона дат по витрине, без обращения к `PaymentIntent`.

### 4.3. Совместимость контракта

- Ответ API **не меняется**: те же поля `totalOrders`, `grossRevenue`, `platformFee`, `netRevenue` в тех же единицах (копейки).
- Переключение: в `SupplierController.dashboard()` вместо `prisma.paymentIntent.aggregate(...)` вызывать сервис/репозиторий, который читает из `SupplierDailyStat`; при отсутствии данных (новый поставщик, витрина ещё не заполнена) — fallback на старый агрегат по `PaymentIntent` или явный 0.

---

## 5. Риски и ограничения

- **Задержка данных:** при только cron раз в сутки дашборд «отстаёт» до конца дня. Для большинства B2B-дашбордов суточная задержка приемлема; при необходимости добавить реал-тайм инкремент позже.
- **Возвраты:** сейчас в витрине опционально `refundsCount` / `refundAmountCents`. Их заполнение — отдельный шаг (агрегат по PaymentIntent со status REFUNDED или по ledger REFUND).
- **Сверка:** периодически можно сверять `SUM(supplierDailyStat)` с `PaymentIntent` за тот же диапазон для контроля целостности.

---

## 6. Дальнейшие расширения (Phase 5+)

- **SupplierTotals (одна строка на оператора):** кумулятивные поля `totalOrdersLifetime`, `totalNetRevenueCents`, обновляемые раз в день из витрины — даёт O(1) для главного экрана без даже SUM по дням.
- **Когорты и тренды:** витрина уже по дням — удобно для сравнения «эта неделя / прошлая», помесячно и т.д.
- **Financial reconciliation:** те же дневные суммы можно сравнивать с ledger/SupplierReport для автоматической сверки взаиморасчётов и rolling reserve.

---

## 7. План внедрения (кратко)

1. Добавить модель `SupplierDailyStat` в `schema.prisma`, миграция.
2. Реализовать job/cron: агрегат из `PaymentIntent` (PAID, paidAt за выбранный день) → upsert в `SupplierDailyStat`.
3. Backfill за последние 1–2 года (или с даты первого PAID).
4. В `dashboard()` переключить чтение sales на витрину (с fallback на PaymentIntent при пустой витрине).
5. (Опционально) Добавить `SupplierTotals` и обновлять из витрины раз в день для ещё более быстрого дашборда.

После этого дашборд будет «летать» даже при 100k+ заказах, а аналитика и графики смогут опираться на ту же витрину без нагрузки на операционную таблицу платежей.
