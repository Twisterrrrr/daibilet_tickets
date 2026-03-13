# Reports & Supplier Ledger (MVP)

> Последнее обновление: 2026-03-12

## Цели

- Предоставить **отчёты по продажам** для админки и ЛК поставщиков.
- Использовать **только оплаченные пакеты** как источник правды.
- Не трогать checkout‑pipeline и не вводить полноценный бухучёт.
- Подготовить фундамент для **Supplier Ledger**, не подключая его к отчётам.

---

## 1. Архитектура Reports

### 1.1. Модуль

- `packages/backend/src/reports/reports.module.ts`
- Состав:
  - `ReportsRepository` — тяжёлые SQL‑запросы через `prisma.$queryRaw`.
  - `ReportsService` — нормализация диапазонов дат, маппинг типов/агрегаций.
  - DTO: `ReportQueryDto` (`from`, `to`, `cityId`, `operatorId`, `source`, `category`).

Источник данных **всегда**:

- `Package` (статус `PAID`)
- `PackageItem` (кол-во билетов, суммы)

---

## 2. Базовые отчёты (SQL)

### 2.1. SALES BY DAY × OPERATOR × SOURCE

Repository: `ReportsRepository.getSalesByOperatorDay(query)`

- Группировка:
  - день оплаты (`DATE_TRUNC('day', p."paidAt")`)
  - `Event.operatorId`
  - `Event.source`
- Метрики:
  - `ordersCount` — кол-во уникальных пакетов
  - `ticketsSold` — суммарное кол-во билетов (adult+child)
  - `grossRevenue` — сумма `PackageItem.subtotal`
  - `commissionAmount` — `subtotal * operator.commissionRate`
  - `netAmount` — `grossRevenue - commissionAmount`
- Фильтры:
  - `from` / `to` (по `Package.paidAt`)
  - `cityId`, `operatorId`, `source`, `category`

### 2.2. SALES BY EVENT

Repository: `ReportsRepository.getSalesByEvent(query)`

- Группировка:
  - `Event.id`
- Метрики:
  - `ticketsSold` — суммарное кол-во билетов
  - `revenue` — сумма `PackageItem.subtotal`
  - `avgTicketPrice` — `revenue / ticketsSold`
  - `lastSaleAt` — последняя дата продажи
- Фильтры:
  - `from` / `to` по `paidAt`
  - опционально `cityId`, `operatorId`, `source`, `category`

### 2.3. SESSION OCCUPANCY

Repository: `ReportsRepository.getSessionOccupancy(query)`

- База:
  - `EventSession.capacityTotal`
  - `PackageItem` + `Package.status = 'PAID'`
- Метрики:
  - `soldQty` — продано мест
  - `availableQty` — `capacityTotal - soldQty`
  - `occupancyPct` — заполненность в %
- Фильтры:
  - интервал по `EventSession.startsAt`
  - опционально `operatorId`, `cityId`, `category`

---

## 3. Admin Reports API

Контроллер: `AdminReportsController`  
Маршрут: `/admin/reports`

### 3.1. JSON‑эндпоинты

- `GET /admin/reports/sales`
  - Возвращает `sales by day × operator × source`.
- `GET /admin/reports/events`
  - Возвращает продажи по событиям.
- `GET /admin/reports/sessions`
  - Возвращает заполняемость сеансов.

Общие query‑параметры:

- `from`, `to` — ISO‑даты (по умолчанию последние 30 дней).
- `cityId`, `operatorId`, `source`, `category` — фильтры домена.

### 3.2. CSV‑экспорт

- `GET /admin/reports/sales.csv`
- `GET /admin/reports/events.csv`
- `GET /admin/reports/sessions.csv`

Особенности:

- Используется общий утилитарный стример `streamCsv` (батчи, BOM, защитный `HARD_LIMIT`).
- Для простоты в первой версии данные загружаются в память и порционно отдаются в CSV (идентификатор батча — синтетическое поле `id`).

---

## 4. Supplier Reports API

Контроллер: `SupplierController`  
Маршрут: `/supplier/*` (JWT, Supplier RBAC).

### 4.1. Dashboard

- `GET /supplier/dashboard`
- Базируется на `ReportsService.getSupplierDashboard(operatorId)` (пакеты/позиции).
- Ответ:
  - `operator` — базовая информация об операторе (как и раньше).
  - `events` — счётчики событий.
  - `offers` — счётчики офферов.
  - `sales`:
    - `ticketsSold`
    - `grossRevenue`
    - `commissionAmount`
    - `netAmount`
  - `report` — развёрнутая структура:
    - `ticketsSold`, `grossRevenue`, `commissionAmount`, `netAmount`
    - `topEvents` — топ‑5 событий по выручке
    - `upcomingSessions` — ближайшие сеансы (до 30 дней вперёд)

### 4.2. Supplier reports (JSON)

- `GET /supplier/reports/sales`
  - Исторический отчёт по платежам (через `PaymentIntent`) **сохранён для обратной совместимости UI**.
  - В будущем может быть переведён на пакетный источник правды.

- `GET /supplier/reports/sessions`
  - Заполняемость будущих сеансов конкретного оператора.
  - Внутри использует `ReportsService.getSessionOccupancy()` с фильтром `operatorId`.

### 4.3. CSV‑экспорт

- `GET /supplier/reports/sales/export`
  - Полноценный CSV с построчным выводом платежей (`PaymentIntent`), батчи через `streamCsv`.
- `GET /supplier/reports/sales.csv`
  - Краткий алиас, перенаправляющий на `export`.

Ограничения:

- Максимальный период выгрузки: 93 дня.

---

## 5. Supplier Ledger (foundation)

### 5.1. Prisma‑модель

Модель в `schema.prisma`:

```text
model SupplierLedgerEntry {
  id            String   @id @default(cuid())

  operatorId    String   @db.Uuid

  type          SupplierLedgerEntryType

  amount        Decimal  @db.Decimal(12, 2)

  currency      String   @default("RUB")

  referenceType String?
  referenceId   String?

  note          String?  @db.Text

  createdAt     DateTime @default(now())

  @@index([operatorId])
  @@map("supplier_ledger_entries")
}

enum SupplierLedgerEntryType {
  SALE
  COMMISSION
  REFUND
  PAYOUT
  ADJUSTMENT
}
```

Назначение:

- Append‑only журнал операций поставщика:
  - `SALE` — начисление за продажу.
  - `COMMISSION` — списание комиссии платформы.
  - `REFUND` — возвраты.
  - `PAYOUT` — выплаты поставщику.
  - `ADJUSTMENT` — ручные корректировки.

### 5.2. Сервис

Файл: `packages/backend/src/ledger/supplier-ledger.service.ts`

Методы:

- `recordSale(operatorId, amount, referenceType?, referenceId?, note?)`
- `recordCommission(operatorId, amount, referenceType?, referenceId?, note?)`
- `recordPayout(operatorId, amount, referenceType?, referenceId?, note?)`

Особенности:

- Использует `ConfigService` и флаг `SUPPLIER_LEDGER_ENABLED`.
- Если флаг **ложный** — методы **ничего не записывают** (no‑op).
- В текущей версии сервис **нигде не вызывается** — подключение к checkout/выплатам будет отдельной задачей.

### 5.3. Feature‑flag

Env‑переменная:

- `SUPPLIER_LEDGER_ENABLED=false` (по умолчанию)

Семантика:

- `false` / `0` / отсутствие переменной — ledger полностью отключён (без побочных эффектов).
- `true` / `1` — можно постепенно включать запись операций (после интеграции с checkout).

---

## 6. Ограничения и будущие шаги

- Отчёты **не являются** финансовым учётом:
  - нет проводок по счетам,
  - нет гарантии бухгалтерской точности (фокус на операционной аналитике).
- Все ключевые агрегаты строятся **из оплаченных пакетов**, что упрощает миграцию к более сложной модели.

Возможные следующие шаги:

- Перевести supplier‑отчёты по продажам полностью на `Package`/`PackageItem`.
- Подключить `SupplierLedgerService` к моментам оплаты/возвратов.
- Добавить агрегированный отчёт «Выплаты и баланс» на основе `SupplierLedgerEntry`.

