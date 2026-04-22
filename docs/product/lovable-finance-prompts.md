# Lovable — пакет №2: Finance (Admin + Supplier)

**Проект:** Daibilet  
**Связь с пакетом №1:** [`lovable-admin-supplier-prompts.md`](lovable-admin-supplier-prompts.md) (MASTER CONTEXT + HARD CONSTRAINTS повторять в каждом запросе).

**Общие enum/DTO для вставки в промпты:** [`lovable-finance-shared-contracts.md`](lovable-finance-shared-contracts.md).

**Канон домена (не выдумывать вторую бухгалтерию):** [`finance.md`](finance.md).

> Endpoints и JSON ниже — **UI contract pack** для Lovable. Перед продакшеном выровнять с актуальными роутами и DTO в `packages/backend`.

---

## Ключевой принцип

- **Estimated ≠ final** — любые `*Estimated` помечать бейджами/подписями.
- **Source-aware** — internal / external / API отражать в таблицах и карточках.
- **Один Order** — разные представления admin / supplier / buyer; не плодить сущности.
- **Refunds** — в основном request/status workflow, не «автоматические деньги» без контракта.
- **Не придумывать** расчёты, выплаты, банк и ЭДО, если нет в переданном контракте.

---

## Порядок A — «короткий» (как ты задал)

| Шаг | Модуль |
|-----|--------|
| 1 | Admin Finance Overview |
| 2 | Supplier Revenue Overview |
| 3 | Settlement Periods (admin: список + деталь периода) |
| 4 | Supplier Settlement (список + деталь) |
| 5 | Payout Status / History (admin + supplier) |
| 6 | Documents / exports — **только если** в бэкенде уже есть контракты на экспорт |

---

## Порядок B — расширенный (с заказами до settlement)

Подходит, если сначала нужна **finance-aware** сущность заказа в UI.

1. Admin Finance Overview  
2. Supplier Revenue Overview  
3. Admin Orders (finance-aware list + detail)  
4. Supplier Orders / Sales  
5. Admin Settlement Periods (+ detail)  
6. Supplier Settlement Periods (+ detail)  
7. Admin Payout Operations  
8. Supplier Payout History  
9. Admin Financial Adjustments  
10. Finance Exports (условно)

---

## Промпт 1 — Admin Finance Overview

```
Task: Implement Admin Finance Overview for Daibilet

CONTEXT

This is frontend-only implementation.
Backend already exists and is fixed.
Do not redesign backend or invent calculations outside the provided contract.

Daibilet financial model is source-aware.
Orders may come from:
- internal checkout
- Ticketscloud mirror
- Teplohod ingestion
- partner API sync

The UI must distinguish:
- estimated values
- final statuses
- source breakdowns

HARD CONSTRAINTS

- Existing backend is fixed
- Do not invent endpoints
- Do not invent finance calculations
- Clearly label estimated vs final values
- Respect multi-source order model
- Use production-oriented React UI

MODULE SCOPE

Implement:
1. Admin Finance Overview page
2. KPI summary cards
3. Source breakdown section
4. Recent finance activity section
5. Period filter UI (URL-state for period/from/to)

BACKEND CONTRACT

Endpoint:
GET /api/v1/admin/finance/overview

Query params:
- period?: 'day' | 'week' | 'month' | 'custom'
- from?: string
- to?: string

Response DTO:
{
  grossSales: number
  ordersCount: number
  refundsAmount: number
  refundsCount: number
  platformCommissionEstimated: number
  supplierPayableEstimated: number
  currency: 'RUB'
  bySource: Array<{
    source: 'INTERNAL' | 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API'
    gross: number
    orders: number
    refundsAmount: number
  }>
  recentOrders: Array<{
    id: string
    orderNumber: string
    source: 'INTERNAL' | 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API'
    status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUND_REQUESTED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
    supplierName: string | null
    eventTitle: string | null
    amount: number
    currency: 'RUB'
    purchasedAt: string
  }>
}

FIELD RULES

- grossSales is aggregated platform gross
- platformCommissionEstimated must be labeled as Estimated
- supplierPayableEstimated must be labeled as Estimated
- refundsAmount is factual aggregated refund amount where available
- source breakdown must preserve source types exactly as given
- do not infer payout completion from payable estimates

ALLOWED ACTIONS

- change period filter
- open full finance modules
- open recent order detail
- export only from dedicated exports module if that contract exists

UI REQUIREMENTS

Summary cards:
- Gross Sales
- Orders Count
- Refunds Amount
- Platform Commission (Estimated)
- Supplier Payable (Estimated)

Sections:
- source breakdown table or compact chart + table
- recent finance activity / recent orders
- period selector

Required states:
- loading
- empty
- error

VISUAL RULES

- practical B2B finance dashboard
- no decorative analytics widgets
- clear Estimated labels
- clear source badges

OUTPUT

Generate:
- Finance Overview page
- KPI cards
- source breakdown component
- recent orders section
- no backend code
```

---

## Промпт 2 — Supplier Revenue Overview

```
Task: Implement Supplier Revenue Overview for Daibilet

CONTEXT

This is frontend-only.
Backend already exists and is fixed.
This module belongs to the Supplier application.

Supplier sees only supplier-scoped financial visibility.
This is not a payout engine and not a full accounting cabinet.
This is an operational revenue visibility surface.

HARD CONSTRAINTS

- No cross-supplier data
- No invented finance calculations
- Clearly distinguish estimated values
- No admin-only controls

MODULE SCOPE

Implement:
1. Supplier Revenue Overview page
2. KPI cards
3. Revenue by source section
4. Recent orders section
5. Pending refund/request summary (placeholder if no extra endpoint — use TODO, do not invent)

BACKEND CONTRACT

Endpoint:
GET /api/v1/supplier/finance/overview

Query params:
- period?: 'day' | 'week' | 'month' | 'custom'
- from?: string
- to?: string

Response DTO:
{
  grossSales: number
  ordersCount: number
  refundsAmount: number
  refundsCount: number
  commissionEstimated: number
  payableEstimated: number
  currency: 'RUB'
  bySource: Array<{
    source: 'INTERNAL' | 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API'
    gross: number
    orders: number
  }>
  recentOrders: Array<{
    id: string
    orderNumber: string
    source: 'INTERNAL' | 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API'
    status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUND_REQUESTED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
    eventTitle: string | null
    amount: number
    currency: 'RUB'
    purchasedAt: string
  }>
}

FIELD RULES

- commissionEstimated must be labeled Estimated
- payableEstimated must be labeled Estimated
- bySource should only show supplier-relevant orders
- recentOrders should not expose admin-only fields
- do not imply final settlement from overview values

ALLOWED ACTIONS

- change period
- open order detail
- navigate to settlement periods
- open refunds/orders section

UI REQUIREMENTS

Cards:
- Gross Sales
- Orders Count
- Refunds Amount
- Commission (Estimated)
- Payable (Estimated)

Sections:
- source breakdown
- recent orders
- refund/request summary

States:
- loading
- empty
- error

OUTPUT

Generate:
- supplier revenue overview page
- summary cards
- source breakdown block
- recent orders block
- no backend code
```

---

## Промпт 3 и 4 — Orders (finance-aware) — порядок B

Используй **после** обзоров (промпты 1–2), если нужны списки заказов с финансовыми колонками **до** settlement.

**Полные copy-paste блоки** (Admin list+detail + Supplier list+detail, примеры JSON, полевые правила):

→ **[`lovable-finance-prompts-orders-full.md`](lovable-finance-prompts-orders-full.md)**

Кратко: `GET /api/v1/admin/orders`, `GET /api/v1/admin/orders/:id`, `GET /api/v1/supplier/orders`, `GET /api/v1/supplier/orders/:id`; DTO — `OrderProjectionListItem` / `OrderProjectionDetail` в [`lovable-finance-shared-contracts.md`](lovable-finance-shared-contracts.md).

---

## Промпт 5 — Admin Settlement Periods (list + detail)

```
Task: Implement Admin Settlement Periods module for Daibilet (list + period detail).

CONTEXT: Frontend-only; settlement periods are finance workflow objects downstream from order projections.

HARD CONSTRAINTS: Do not invent settlement math beyond provided fields; respect status workflow.

BACKEND CONTRACT

GET /api/v1/admin/finance/settlements
GET /api/v1/admin/finance/settlements/:id

Query (list): status?: 'DRAFT'|'REVIEW'|'APPROVED'|'PAID'; from?; to?; page?; pageSize?

List items: id, periodStart, periodEnd, status, gross, refundsAmount, commission, payable, suppliersCount, currency 'RUB', updatedAt

Detail: same period fields + suppliers[] { supplierId, supplierName, supplierMode?, gross, refundsAmount, commission, payable }

UI: list table with filters URL-state; detail with header (period + status), totals cards, suppliers table, export/action area placeholder (wire to exports module if exists).

CRITICAL UX REQUIREMENT — встроенная сверка (Reconciliation):
- Settlement detail MUST include a dedicated “Reconciliation” tab (операторская сверка данных, не бухгалтерия).
- This tab is inspection and diagnostics UI: show errors/warnings clearly, provide filters.
- Do NOT frame reconciliation as automatic money movement.

Reconciliation UX model (tab):
- Purpose: compare system data vs external source for the same period, then block unsafe closing.
- Top summary cards (data-first):
  - orders (system)
  - orders (source)
  - gross (system)
  - gross (source)
  - mismatch count
- Mismatches table with:
  - order reference
  - source system
  - mismatch type: MISSING_IN_PROJECTION | MISSING_IN_SOURCE | AMOUNT_MISMATCH | STATUS_MISMATCH | DUPLICATE
  - system value
  - source value
  - severity (warning/error)
  - resolution status (read-only unless backend explicitly supports write)
- Filters:
  - mismatch type
  - severity
- Visual emphasis:
  - errors in red
  - warnings in yellow

Workflow rule (UI-side):
- clearly show that “CLOSED = read-only”
- if backend provides “Close Period” action, UI must warn/block attempt when critical mismatches exist (do not hide this rule).

ACTIONS: open detail; workflow transitions only if API exists (otherwise TODO).

OUTPUT: list page, detail page, badges, no backend code.
```

---

## Промпт 6 — Supplier Settlement Periods (list + detail)

```
Task: Implement Supplier Settlement Periods module (list + detail).

CONTEXT: Supplier app; read-only visibility; own settlements only.

BACKEND CONTRACT

GET /api/v1/supplier/finance/settlements
GET /api/v1/supplier/finance/settlements/:id

Detail includes orders[]: orderId/orderNumber, source, status, amount, refundAmount?, payableEstimated?, purchasedAt — read-only.

OUTPUT: list, detail with Overview + Orders in Period tabs, no backend code.
```

---

## Промпт 7 — Admin Payout Operations

```
Task: Implement Admin Payout Operations (list + detail).

CONTEXT: Admin-only; payouts are operational records; no banking invention.

BACKEND CONTRACT

GET /api/v1/admin/finance/payouts
GET /api/v1/admin/finance/payouts/:id

Query: status?, supplierId?, from?, to?, page?, pageSize?

List item: id, supplierId, supplierName, amount, currency 'RUB', status (PENDING|PROCESSING|PAID|FAILED|CANCELLED), settlementId?, payoutDate?, createdAt, updatedAt

Detail adds notes? for admin.

UI: table, filters, detail drawer/page, link to settlement when settlementId present. Status actions only if API documented.

OUTPUT: list, detail, no backend code.
```

---

## Промпт 8 — Supplier Payout History

```
Task: Implement Supplier Payout History (list + detail).

CONTEXT: Read-only; supplier-scoped.

BACKEND CONTRACT

GET /api/v1/supplier/finance/payouts
GET /api/v1/supplier/finance/payouts/:id

Fields: id, amount, currency, status, settlementId?, payoutDate?, createdAt, updatedAt

OUTPUT: history page, optional detail drawer, no backend code.
```

---

## Промпт 9 — Admin Financial Adjustments

```
Task: Implement Admin Financial Adjustments (list + detail).

CONTEXT: Manual correction records; admin-only.

BACKEND CONTRACT

GET /api/v1/admin/finance/adjustments
GET /api/v1/admin/finance/adjustments/:id

Query: type? ('REFUND_CORRECTION'|'MANUAL_COMMISSION'|'DISPUTE'|'OTHER'), supplierId?, from?, to?, page?, pageSize?

Item: id, type, supplierId?, supplierName?, amount (may be negative), currency, note?, createdAt, updatedAt

UI: distinguish positive/negative amounts; manual adjustment badges.

OUTPUT: list, detail, no backend code.
```

---

## Промпт 10 — Finance Exports (условный)

**Использовать только если** в бэкенде уже есть `POST/GET .../finance/exports` (или эквивалент) с известным телом ответа.

```
Task: Implement Finance Exports UI for Daibilet (Admin + Supplier variants).

HARD CONSTRAINTS: No fake file generation on frontend; status UI only; role-separated endpoints.

BACKEND CONTRACT (example)

POST /api/v1/admin/finance/exports
GET /api/v1/admin/finance/exports
POST /api/v1/supplier/finance/exports
GET /api/v1/supplier/finance/exports

Create body: { type: 'ORDERS'|'SETTLEMENTS'|'PAYOUTS', periodStart?, periodEnd?, format: 'CSV'|'XLSX' }

List items: id, type, format, status: 'REQUESTED'|'PROCESSING'|'READY'|'FAILED', createdAt, downloadUrl?

UI: modal to request export; history table; download when READY.

If endpoints do not exist: render disabled section + TODO instead of inventing API.

OUTPUT: export modal + history, no backend code.
```

---

## Как стыковать с Cursor после Lovable

1. Сверить пути (`/api/v1/...` vs фактический префикс в Nest).  
2. Заменить DTO на типы из `packages/backend` / OpenAPI.  
3. Пометить в UI поля из `finance.md`: ledger, payout request, отчёты — если отличаются от «overview».  
4. Не удалять бейджи **Estimated** при подключении реальных данных.
