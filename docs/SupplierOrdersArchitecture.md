# Supplier Orders Architecture (Phase 2)

> Source: OrderRequest, CheckoutSession, PaymentIntent. No SupplierOrder table.

## Goal
Supplier видит заказы (заявки), фильтрует, подтверждает/отклоняет. Mixed baskets: видит только свои OrderRequest.

## Existing
- OrderRequest, EventOffer.operatorId, CheckoutSession
- PaymentIntent.supplierId
- tryTransitionOrderRequest, tryTransitionCheckout
- Partner API: GET/POST orders (filter by eventIds broken)

## Projection
OrderRequest where eventOffer.operatorId = operatorId (или event.operatorId). Нет SupplierOrder.

## API
- GET /supplier/orders (status, from, to, eventId, page, limit)
- GET /supplier/orders/:id
- POST /supplier/orders/:id/confirm { notes? }
- POST /supplier/orders/:id/reject { reason }

## DTO
SupplierOrderDto: id, type, status, shortCode, eventTitle, quantity, priceSnapshot, customerName/Email, slaMinutes, expiresAt, createdAt.

## Backend
- SupplierOrdersService: list, getOne, confirm, reject
- Fix Partner listOrders: where eventId in eventIds

## Frontend
- Supplier: OrdersListPage (PageHeader, filters, DataTable, drawer)
- Admin: OrdersList link to CheckoutSession

## Indexes
order_requests(event_id), events(operator_id) — есть. Достаточно.

## Definition of Done
- Supplier list OrderRequest, filters, detail, confirm/reject
- Partner listOrders фильтрует по eventIds
- Admin order→checkout link
