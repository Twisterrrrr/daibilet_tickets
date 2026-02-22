# Checkout + Расписания + Event Studio

> Спецификация модуля расписаний, продаваемых слотов и унифицированного checkout.
> Версия: 2026-02-22.

## Цели

1. **Расписания** — управление сеансами (ONE_TIME, OPEN_DATE, RECURRENCE).
2. **Event Studio** — админка для контроля продаж (pause/resume, bulk-операции).
3. **Checkout API v1** — единая точка покупки (POST /checkout) с поддержкой SESSION и OPEN_DATE.

## Связь с текущей схемой

- **EventOffer** — офферы уже есть, `operatorId` как граница владения.
- **EventSession** — сеансы (occurrences) есть; расширяем полями `scheduleId`, `status`, `capacity`, `reschedule`.
- **CheckoutSession** — существует; CheckoutPackage привязывается к нему.
- **AuditLog** — используется для schedule edits, bulk ops, cancel/reschedule.
- **event_sessions** — партиционируется по `startsAt` (см. `docs/PartitioningPlan.md`).

---

## Задачи (порядок выполнения)

### Блок 1: Данные → Правила → API

| # | Задача | DoD |
|---|--------|-----|
| 1 | Prisma: EventSchedule + расширение EventSession + CheckoutPackage/Items | Миграции ок, seed примеры |
| 14 | PriceSnapshotService | buildSnapshot, priceSnapshotJson в package, неизменность при изменении pricing |
| 13 | AvailabilityService | checkOrThrow: offer/schedule/occurrence статусы, salesWindow, capacity, OPEN_DATE правила |
| 2 | ONE_TIME + OPEN_DATE генерация | ScheduleService.upsertSchedule создаёт 1 occurrence (ONE_TIME) и open-date режим |
| 3 | Recurrence generator (90 дней) | generateOccurrences(scheduleId, from, to), дедуп по (offerId, startAt) |
| 8 | OccurrencePolicyService | delete/cancel/reschedule с проверкой заказов, unit tests |
| 4 | Admin API: CRUD schedule/occurrences + generate + list | DTO типизированы, e2e |
| 9 | Checkout API v1: POST /checkout | создаёт package, валидирует availability, фиксирует priceSnapshot, возвращает packageId + paymentUrl |

### Блок 2: Админка UI

| # | Задача | DoD |
|---|--------|-----|
| 5 | Event Studio Summary | статус, ближайшие occurrences, pause/resume/generate |
| 6 | Schedule Builder wizard | создаёт/обновляет schedule, preview N, запускает generate |
| 7 | Occurrences list + Bulk edit | pause/resume, cancel, shift time, capacity, delete (если нет заказов) |

### Блок 3: Покупка (Frontend)

| # | Задача | DoD |
|---|--------|-----|
| 10 | /checkout/:packageId | прогресс-бар, контакты, qty, CTA «Оплатить»; mobile 375px, fixed bottom bar |
| 11 | /checkout/:packageId/status | paid/pending/failed/cancelled/expired, CTA «повторить» / «связаться» |
| 15 | /payment/success, /payment/fail | лендинги возврата из платежки |
| 16 | /orders/[id] + GET /orders/:id | трекинг заказа, состав, ваучер/QR |

### Блок 4: Аудит

| # | Задача | DoD |
|---|--------|-----|
| 12 | AdminAuditLog для операций | schedule edits, bulk ops, cancel/reschedule в AuditLog, просмотр (таблица) |

---

## Prisma: новые enum'ы

```prisma
enum ScheduleType {
  ONE_TIME    // разовое
  OPEN_DATE   // открытая дата (без конкретного времени)
  RECURRENCE  // повторяемое правило
}

enum SessionStatus {
  ACTIVE
  PAUSED
  CANCELLED
  SOLD_OUT
  RESCHEDULED
}

enum RescheduleReason {
  WEATHER
  TECHNICAL
  PROVIDER_REQUEST
  LOW_DEMAND
  OTHER
}

enum CheckoutPackageItemType {
  SESSION    // покупка конкретного сеанса
  OPEN_DATE  // покупка «дата посещения» без сеанса
}

enum CheckoutPackageStatus {
  CREATED
  LOCKED    // нельзя менять после создания платежа
  PAID
  FAILED
  CANCELLED
  EXPIRED
}
```

---

## Prisma: EventSchedule (новая таблица)

```prisma
model EventSchedule {
  id         String       @id @default(uuid()) @db.Uuid
  offerId    String       @unique @db.Uuid  // 1 schedule на 1 offer
  type       ScheduleType
  timezone   String       @default("Europe/Moscow")
  durationMin Int?
  salesFrom  DateTime?
  salesTo    DateTime?
  isActive   Boolean      @default(true)
  rule       Json         // startAt/endAt | allowedFrom/To | daysOfWeek/timeSlots
  version    Int          @default(0)
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt

  offer      EventOffer   @relation(fields: [offerId], references: [id], onDelete: Cascade)
  sessions   EventSession[]

  @@index([offerId])
  @@index([type, isActive])
  @@map("event_schedules")
}
```

---

## Prisma: расширение EventSession

Добавить в `EventSession`:

```prisma
scheduleId        String?     @db.Uuid
dateLocal         DateTime?   // UTC midnight для фильтров по дням
status            SessionStatus @default(ACTIVE)
capacityTotal     Int?
capacitySold      Int         @default(0)
rescheduledToId   String?     @db.Uuid
rescheduleReason  RescheduleReason?
rescheduleNote    String?
// schedule         EventSchedule? @relation(...)
// rescheduledTo    EventSession?  @relation("SessionReschedule", ...)
// rescheduledFrom  EventSession[] @relation("SessionReschedule")
```

- `startsAt`/`endsAt` — nullable для OPEN_DATE (или OPEN_DATE вообще без EventSession).
- Для OPEN_DATE: при покупке храним выбранную дату в `CheckoutPackageItem.openDate`.

---

## Prisma: CheckoutPackage + CheckoutPackageItem

```prisma
model CheckoutPackage {
  id                 String               @id @default(uuid()) @db.Uuid
  checkoutSessionId  String               @db.Uuid
  status             CheckoutPackageStatus @default(CREATED)
  email              String
  phone              String?
  priceSnapshotJson  Json
  snapshotAt         DateTime             @default(now())
  paymentProvider    String?
  paymentId          String?
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt

  checkoutSession    CheckoutSession      @relation(...)
  items              CheckoutPackageItem[]

  @@index([checkoutSessionId])
  @@index([status, createdAt])
  @@map("checkout_packages")
}

model CheckoutPackageItem {
  id            String                 @id @default(uuid()) @db.Uuid
  packageId     String                 @db.Uuid
  type          CheckoutPackageItemType
  offerId       String                 @db.Uuid
  sessionId     String?                @db.Uuid   // SESSION
  openDate      DateTime?              @db.Date   // OPEN_DATE (UTC midnight)
  qty           Int                    @default(1)
  itemSnapshot  Json
  createdAt     DateTime               @default(now())

  package       CheckoutPackage        @relation(...)
  offer         EventOffer             @relation(...)
  session       EventSession?          @relation(...)

  @@unique([packageId, offerId, sessionId, openDate])
  @@index([packageId])
  @@index([offerId])
  @@index([sessionId])
  @@map("checkout_package_items")
}
```

CHECK-ограничения (SQL):
- `(type = 'SESSION' AND sessionId IS NOT NULL AND open_date IS NULL) OR (type = 'OPEN_DATE' AND sessionId IS NULL AND open_date IS NOT NULL)`
- `qty > 0`

---

## Миграционный план

### Миграция 001: event_schedules
Создать таблицу `event_schedules` (см. модель выше).

### Миграция 002: расширение event_sessions
Добавить nullable колонки: `schedule_id`, `status` (DEFAULT 'ACTIVE'), `capacity_total`, `capacity_sold` (DEFAULT 0), `rescheduled_to_id`, `reschedule_reason`, `reschedule_note`, `date_local`.  
FK: `schedule_id -> event_schedules(id) ON DELETE SET NULL`, `rescheduled_to_id -> event_sessions(id) ON DELETE SET NULL`.

### Миграция 003: checkout_packages + checkout_package_items
Создать таблицы по схеме выше.

### Дополнительные CHECK (по готовности сервисного слоя)
- `event_sessions`: `capacity_sold <= capacity_total`, `(status <> 'RESCHEDULED') OR (rescheduled_to_id IS NOT NULL)`.
- Partial indexes: `status = 'ACTIVE' AND starts_at IS NOT NULL` для частых запросов.

---

## RBAC: Admin vs Supplier

| Роль | Создание schedule | Редактирование | Pause/Resume | Перенос/отмена |
|------|-------------------|----------------|--------------|----------------|
| Admin | Да (всё) | Да (всё) | Да | Да |
| Supplier | Да (только свои offerId) | Только свои | Только свои | Только свои |

**Правило:** во всех supplier endpoints — `operatorId` только из токена, никогда из body.

```ts
where: { id: offerId, operatorId: req.user.operatorId }
// Если count === 0 → 404 / 403
```

---

## PriceSnapshotService

- `buildSnapshot({ offerId, occurrenceId?, qty, openDate? })` → `{ basePrice, fees, commission, currency, lineItems, calculatedAt, pricingVersion? }`
- Сохранять в `CheckoutPackage.priceSnapshotJson`
- Изменение pricing config не меняет уже созданные packages

---

## AvailabilityService

- `checkOrThrow(...)` — единая проверка:
  - статусы offer / schedule / occurrence
  - salesWindow (salesFrom/salesTo)
  - capacity: `capacityTotal - capacitySold - holds`
  - OPEN_DATE: дата допустима, если в окне продаж
- Используется в POST /checkout и admin bulk (delete/cancel)

---

## OccurrencePolicyService

- **delete**: запрещён, если есть заказы (CheckoutPackageItem.sessionId = occurrenceId).
- **reschedule**: создать новый occurrence → старый `status = RESCHEDULED`, `rescheduledToId = newId`.
- **cancel**: `status = CANCELLED`, `rescheduleNote` = reason.
- Unit tests на все сценарии.

---

## Адаптация к текущей схеме

- **EventSession.tcSessionId** — оставить; для новых сессий из Schedule генератор создаёт уникальный ID.
- **EventSession.startsAt** — для OPEN_DATE оставить `null` или не создавать EventSession (дата в package).
- **CheckoutSession** — CheckoutPackage связан с ним; после оплаты можно обновлять CheckoutSession.status.
- **FulfillmentItem** — при PAY flow создаётся после оплаты; CheckoutPackageItem — это «корзина» до оплаты.

---

## Источники

- Спецификация от пользователя (22.02.2026)
- `docs/PartitioningPlan.md`
- `docs/SupplierArchitecture.md`
- `docs/Diary.md` — CheckoutSession, PaymentIntent, state machine
