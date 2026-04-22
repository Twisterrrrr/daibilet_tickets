# Lovable — Finance: полные промпты Orders (Admin + Supplier)

Используй вместе с [`lovable-finance-prompts.md`](lovable-finance-prompts.md) и [`lovable-finance-shared-contracts.md`](lovable-finance-shared-contracts.md).

---

## Промпт A — Admin Orders / Finance-aware (полный)

```
Task: Implement Admin Orders module with finance-aware list and detail for Daibilet

CONTEXT

This is frontend-only.
Backend already exists.
Admin sees the full operational representation of orders.

One core Order may be visible in:
- Admin
- Buyer account
- Supplier cabinet

Do not model them as separate entities.
Admin sees the full source-aware and finance-aware projection.

HARD CONSTRAINTS

- Existing backend is fixed
- Do not invent endpoints
- Do not invent finance rules
- Respect multi-source order model
- Clearly show order source and visibility

MODULE SCOPE

Implement:
1. Orders List page
2. Order Detail page
3. Refund Requests section inside order detail

BACKEND CONTRACT

Endpoints:
GET /api/v1/admin/orders
GET /api/v1/admin/orders/:id

Query params:
- search?: string
- source?: 'INTERNAL' | 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API'
- status?: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUND_REQUESTED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
- supplierId?: string
- refundStatus?: 'NEW' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED'
- from?: string
- to?: string
- page?: number
- pageSize?: number
- sortBy?: 'purchasedAt' | 'amount' | 'updatedAt'
- sortOrder?: 'asc' | 'desc'

List response DTO:
{
  "items": [
    {
      "id": "ord_1",
      "orderNumber": "DB-2026-000341",
      "source": "INTERNAL",
      "ingestionSource": "CHECKOUT",
      "status": "PAID",
      "supplierName": "Невский Фарватер",
      "customerEmail": "user@example.com",
      "eventTitle": "Пять разводных мостов",
      "amount": 4200,
      "currency": "RUB",
      "refundAmount": 0,
      "platformCommissionEstimated": 630,
      "supplierPayableEstimated": 3570,
      "isVisibleInBuyerAccount": true,
      "isVisibleInSupplierCabinet": true,
      "purchasedAt": "2026-04-21T10:24:00Z",
      "updatedAt": "2026-04-21T10:25:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 3812
}

Detail response DTO: use OrderProjectionDetail shape from lovable-finance-shared-contracts.md (financials.*Estimated labeled in UI).

FIELD RULES

- platformCommissionEstimated and supplierPayableEstimated must be clearly marked Estimated
- source and ingestionSource must be visible in admin UI
- isVisibleInBuyerAccount and isVisibleInSupplierCabinet must be visible in detail
- refund requests are operational request objects, not guaranteed instant money flow
- internal IDs like paymentIntentId/checkoutSessionId should be shown only in admin detail context
- external source metadata must be visible but not editable

ALLOWED ACTIONS

List:
- open detail
- filter/sort/search
- export from dedicated finance module if available

Detail:
- inspect order
- inspect refund requests
- open linked customer/supplier/event if available
- change refund request workflow only if allowed by backend

UI REQUIREMENTS — LIST

Filters:
- search
- source
- status
- supplier
- refund status
- date range

Columns:
- order number
- source
- status
- supplier
- customer email
- event
- amount
- commission est.
- payable est.
- purchasedAt
- visibility indicators
- actions

UI REQUIREMENTS — DETAIL

Tabs:
- Overview
- Customer
- Item / Event
- Financials
- Source / Channel
- Refund Requests
- Activity

Required states:
- loading
- empty
- error
- no results
- refund-request present
- external source record
- buyer/supplier visibility mismatch

OUTPUT

Generate:
- orders list page
- order detail page
- refund requests section
- finance-aware badges and summary blocks
- no backend code
```

---

## Промпт B — Supplier Orders / Sales (полный)

```
Task: Implement Supplier Orders / Sales module for Daibilet

CONTEXT

This is frontend-only.
This module belongs to the Supplier application.

Supplier sees only orders relevant to their own inventory.
The same core Order exists in admin and buyer account as well, but supplier sees a scoped representation.

HARD CONSTRAINTS

- No cross-supplier data
- No admin-only internals
- No invented payout logic
- Keep operational + revenue visibility clear

MODULE SCOPE

Implement:
1. Supplier Orders / Sales list
2. Supplier Order detail
3. Refund/request section inside order detail

BACKEND CONTRACT

Endpoints:
GET /api/v1/supplier/orders
GET /api/v1/supplier/orders/:id

Query params:
- search?: string
- source?: 'INTERNAL' | 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API'
- status?: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUND_REQUESTED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
- refundStatus?: 'NEW' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED'
- from?: string
- to?: string
- page?: number
- pageSize?: number

List response example:
{
  "items": [
    {
      "id": "ord_51",
      "orderNumber": "DB-2026-001122",
      "source": "TEPLOHOD",
      "status": "PAID",
      "eventTitle": "Воскресный джаз на воде",
      "customerName": "Иван Петров",
      "amount": 10000,
      "currency": "RUB",
      "refundAmount": 0,
      "supplierPayableEstimated": 8500,
      "purchasedAt": "2026-04-20T15:00:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 148
}

Detail DTO: supplier-scoped; financials.gross, refundAmount, supplierPayableEstimated (Estimated); refundRequests[]; customer limited by business rules; no paymentIntentId in UI.

FIELD RULES

- supplierPayableEstimated must be marked Estimated
- supplier should not see admin-only IDs or internal payment objects
- customer info must stay limited to what business rules allow
- refunds are request-based workflow objects
- source must remain visible because sales can come from multiple channels

ALLOWED ACTIONS

List:
- search/filter
- open detail

Detail:
- inspect order
- inspect refund request status
- navigate to support flow if needed

UI REQUIREMENTS — LIST

Columns:
- order number
- source
- status
- event
- customer
- amount
- payable est.
- purchasedAt
- actions

UI REQUIREMENTS — DETAIL

Tabs:
- Overview
- Item
- Customer
- Financials
- Refund Requests

States:
- loading
- empty
- error
- no results
- refund-request present

OUTPUT

Generate:
- supplier orders list
- supplier order detail
- status badges
- supplier-readable finance blocks
- no backend code
```
