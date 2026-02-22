# Билеты: квоты, категории, цены + политика возвратов + отчётность

> Спецификация. Версия: 2026-02-23.  
> Зависит от: `CheckoutSchedulesEventStudio.md`.

## Цели

1. **Квоты** — общая и по категориям билетов, с override на уровне слота.
2. **Категории билетов** — PRIMARY (можно купить отдельно) / ADDON (только с PRIMARY), allowedDays, описание.
3. **Цены** — на уровне Offer (не по слотам), с compareAtPriceCents для скидки.
4. **Событие** — isActive для скрытия из каталога.
5. **Политика отмен/возвратов** — шаблоны (Provider/Operator/Offer), snapshot в заказе, Refund Engine.
6. **Возвраты** — RefundRequest, EXTERNAL forwarding (teplohod/ticketscloud), Admin Inbox.
7. **Отчётность** — продажи, комиссии, возвраты, реестр ваучеров, акты, Usage Report.

---

## Разделение: «что продаём» vs «когда»

| Сущность | Роль |
|----------|------|
| EventOffer | Страница/товар в каталоге |
| EventSchedule | Правило расписания |
| EventSession | Конкретный слот (occurrence) |
| **TicketCategory** | Вид билета (взрослый, детский, VIP) |
| **TicketPrice** | Цена по категории на уровне Offer |
| **TicketQuotaDefault** | Лимиты: общий + по категориям (базово на Offer) |
| **TicketQuotaOverride** | Override квоты на Session |
| **TicketSalesCounter** | Продажи по категориям (sold count) |

---

## Блок 1: Категории, цены, квоты

### Enum'ы

```prisma
enum DayOfWeek { MON TUE WED THU FRI SAT SUN }

enum TicketCategoryKind {
  PRIMARY   // можно купить отдельно
  ADDON     // нельзя купить отдельно (только вместе с PRIMARY)
}

enum TicketPriceStatus { ACTIVE INACTIVE }
```

### TicketCategory

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid | PK |
| offerId | uuid | FK EventOffer |
| code | string | стабильный ключ ("adult", "child", "vip") |
| title | string | Название |
| description | string? | Текстовое примечание |
| kind | TicketCategoryKind | PRIMARY \| ADDON |
| allowedDays | DayOfWeek[] | null/пусто => доступна всегда |
| isActive | bool | Можно ли продавать |
| isDefaultForCard | bool | Главная для карточки (цена «от X») |
| sortOrder | int | Порядок вывода |

### TicketPrice (глобально на Offer)

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid | PK |
| offerId | uuid | FK |
| categoryId | uuid | FK TicketCategory |
| currency | string | RUB |
| priceCents | int | 199900 = 1999.00 |
| compareAtPriceCents | int? | старая цена (зачёркнутая) |
| status | TicketPriceStatus | ACTIVE \| INACTIVE |
| validFrom, validTo | datetime | история цены |

**Правило**: один активный прайс без validTo на категорию (partial unique).

### TicketQuotaDefault (базовые квоты на Offer)

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid | PK |
| offerId | uuid | FK |
| categoryId | uuid? | null => общая квота |
| capacityTotal | int? | null => безлимит |
| isActive | bool | |

**Правило**: ровно один «общий» на offer (categoryId is null) — partial unique.

### TicketQuotaOverride (override на Session)

| Поле | Тип |
|------|-----|
| sessionId | uuid |
| categoryId | uuid? |
| capacityTotal | int? |

### TicketSalesCounter (продажи по категориям)

| Поле | Тип |
|------|-----|
| sessionId | uuid |
| categoryId | uuid |
| soldQty | int |

### EventOffer.isActive

Добавить `isActive Boolean @default(true)` — если false, не показывать в каталоге и запрещать checkout.

---

## Блок 2: Политика отмен и возвратов

### Источники политики (приоритет)

1. Offer.policyOverride (если задан)
2. Operator.defaultPolicy
3. Provider default (teplohod / ticketscloud)
4. Platform default

### CancellationPolicyTemplate

| Поле | Тип |
|------|-----|
| id | uuid |
| scopeType | PLATFORM \| PROVIDER \| OPERATOR \| OFFER |
| scopeId | uuid? (nullable для PLATFORM) |
| provider | TEPLOHOD \| TICKETS_CLOUD \| null |
| name | string |
| publicText | text (для страницы) |
| shortBadge | string? ("Бесплатная отмена за 48ч") |
| ruleJson | jsonb (mode, tiers, fees, exceptions) |
| version, isActive | |

### ruleJson (машиночитаемое)

- `mode`: FLEX | TIERED | NO_REFUND | MANUAL_ONLY
- `tiers`: интервалы до начала и % возврата (>=72h → 100%, 72h..24h → 50%, <24h → 0%)
- `refundFees`: platformFeeRefundable, paymentFeeRefundable, providerFeeRefundable
- `allowReschedule`, `contactFlow`

### Snapshot в CheckoutPackage

`cancellationPolicySnapshotJson` — immutable копия правил на момент покупки.

---

## Блок 3: Возвраты (RefundRequest)

### RefundRequest (статусы)

REQUESTED → CALCULATED → FORWARDED → WAITING_PROVIDER → APPROVED → REFUNDED / REJECTED / FAILED / CLOSED

Для EXTERNAL: не делаем refund сами, форвардим teplohod/ticketscloud, задача висит до закрытия админом.

### Поля

- paymentMode: PLATFORM | EXTERNAL | MIXED
- provider: TEPLOHOD | TICKETS_CLOUD
- forwardingChannel: API | EMAIL | MANUAL_URL
- policySnapshot, calcSnapshot (результат Refund Engine)
- requestedAmountCents, approvedAmountCents, refundedAmountCents

### Admin Inbox

Страница «Возвраты (в работе)»: фильтры, SLA, действия (отправить повторно, пометить подтверждённым, закрыть).

---

## Блок 4: Финансы и отчётность

### TicketIssued (1 строка = 1 билет)

- orderId, packageId, offerId, sessionId, openDate
- categoryId, categoryCode, categoryTitle
- provider, providerOrderRef, providerTicketRef
- operatorId, supplierId
- grossCents, commissionCents, paymentFeeCents, providerPayableCents
- voucherCode, qrPayload
- status: ISSUED | CANCELLED | REFUNDED | USED

**Комиссия считается per ticket** — для частичных возвратов.

### LedgerEntry (финансовые проводки)

- entryType: SALE_TICKET_GROSS, PLATFORM_COMMISSION, PROVIDER_PAYABLE, REFUND_TICKET, REVERSAL_*, PAYOUT_TO_PROVIDER
- amountCents (signed)
- ticketId, orderId, refundRequestId
- effectiveAt

### SettlementBatch (акты / взаиморасчёты)

- periodFrom, periodTo
- supplierId, operatorId, provider
- grossCents, commissionCents, refundsCents, payableCents
- status: DRAFT → SENT → ACCEPTED → PAID
- actPdfPath, xlsPath

### ReportRun (генерация отчётов)

- type: EVENTS_OVERVIEW, SALES, COMMISSIONS, REFUNDS, VOUCHER_REGISTER, USAGE_REPORT, SETTLEMENT_ACT
- status: QUEUED → RUNNING → READY | FAILED
- params (json), fileXlsPath, filePdfPath
- sendToEmail, emailedAt

### Отчёты (роли)

| Отчёт | Admin | Supplier/Operator |
|-------|-------|-------------------|
| Продажи | всё | свои operatorId |
| Комиссии | всё | свои |
| Возвраты | всё | свои |
| Реестр ваучеров | всё | свои |
| Акт выполненных работ | всё | свои контрагенты |
| Usage Report | всё | свои |

### Экспорт

- XLSX (exceljs)
- PDF (HTML→PDF)
- Отправка на email (async job)

---

## Cursor Auto Pipeline

### Блок T: Категории и квоты (8 задач)

| # | Задача | DoD |
|---|--------|-----|
| T1 | Prisma: DayOfWeek, TicketCategoryKind, TicketPriceStatus, TicketCategory, TicketPrice | Миграция ок |
| T2 | Prisma: TicketQuotaDefault, TicketQuotaOverride, TicketSalesCounter | Миграция ок |
| T3 | EventOffer.isActive | Альтернатива: использовать status |
| T4 | Data migration: base категория + цена из priceFrom/oldPrice | Скрипт |
| T5 | Admin UI: CRUD категорий + цены/compareAt | В EventEdit |
| T6 | Admin UI: квоты по умолчанию + override на слот | EventStudio / Session |
| T7 | AvailabilityService: остатки по категориям, allowedDays, ADDON rules | |
| T8 | PriceSnapshotService: snapshot с compareAtPriceCents | В package |

### Блок C: Политика возвратов (4 задачи)

| # | Задача | DoD |
|---|--------|-----|
| C1 | Prisma: CancellationPolicyTemplate + связи | |
| C2 | Admin UI: выбор политики в Offer, test-калькулятор | |
| C3 | Snapshot политики в CheckoutPackage | |
| C4 | Refund Engine v1 (tiers, breakdown) | calcSnapshot |

### Блок R: Возвраты и EXTERNAL (6 задач)

| # | Задача | DoD |
|---|--------|-----|
| R1 | Prisma: RefundRequest, LedgerEntry, TicketIssued | Миграция |
| R2 | RefundRequest API: create, list, approve, reject, close | |
| R3 | PLATFORM refund: YooKassa refund, LedgerEntry, TicketIssued.status | |
| R4 | EXTERNAL forwarding: teplohod/ticketscloud, inbox | |
| R5 | Admin Inbox UI: Возвраты (в работе) | |
| R6 | Ticket issuance: создание TicketIssued при PAID | |

### Блок O: Отчётность (6 задач)

| # | Задача | DoD |
|---|--------|-----|
| O1 | Prisma: SettlementBatch, ReportRun | Миграция |
| O2 | Report queries: Sales, Refunds, Commissions, Voucher Register | RBAC scope |
| O3 | ReportRun job (BullMQ): queued → running → ready | |
| O4 | XLS export (exceljs) | |
| O5 | PDF export (HTML→PDF) | |
| O6 | Email delivery отчётов | |

---

## SQL Constraints (Prisma не выражает)

```sql
-- Один активный прайс на категорию
CREATE UNIQUE INDEX ticket_prices_one_active_per_category
ON ticket_prices (category_id)
WHERE status = 'ACTIVE' AND valid_to IS NULL;

-- Одна общая квота на offer
CREATE UNIQUE INDEX ticket_quota_defaults_offer_total_unique
ON ticket_quota_defaults (offer_id)
WHERE category_id IS NULL;

-- Один общий override на session
CREATE UNIQUE INDEX ticket_quota_overrides_session_total_unique
ON ticket_quota_overrides (session_id)
WHERE category_id IS NULL;

-- Один открытый refund на ticket
CREATE UNIQUE INDEX refund_requests_one_open_per_ticket
ON refund_requests (ticket_id)
WHERE ticket_id IS NOT NULL
  AND status IN ('REQUESTED','CALCULATED','FORWARDED','WAITING_PROVIDER','APPROVED','PROCESSING');
```

---

## Миграция «старой цены»

Если в EventOffer/Event есть priceFrom, oldPriceCents (или pricingConfig):

1. Создать base-категорию (code=base, isDefaultForCard=true)
2. Создать TicketPrice: priceCents=priceFrom, compareAtPriceCents=oldPriceCents
3. Карточка события: брать цену из TicketPrice (defaultForCard или min PRIMARY)
