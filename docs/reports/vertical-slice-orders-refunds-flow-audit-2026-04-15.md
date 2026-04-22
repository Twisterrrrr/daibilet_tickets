## Вертикальный срез “каталог → PDP → купить → заказ в БД → ЛК → админка → refund request → ручная обработка” (2026-04-15)

### 1) Public catalog
- **Список событий**: `packages/frontend/src/app/events/EventsPageClient.tsx` (дергает `api.getEvents()` → `GET /api/v1/events`)
- **Роут каталога**: `packages/frontend/src/app/events/*`

### 2) Public PDP (карточка события)
- **Страница события**: `packages/frontend/src/app/events/[slug]/page.tsx` → рендерит `EventPageView`
- **UI PDP**: `packages/frontend/src/components/events/EventPageView.tsx`

### 3) Buy action (MVP: фиксируем заказ в системе)
**Критичный вывод аудита:** на PDP были варианты покупки, которые **обходили** внутренний checkout:
- `TcWidgetButton` (Ticketscloud overlay) — без записи `CheckoutSession`
- `BuyModal` (`POST /api/v1/checkout/tc`) — создаёт заказ в TC, но **не создаёт** `CheckoutSession`
- прямые внешние `deeplink` (redirect) — покупка “вне системы”

**Исправление в рамках MVP вертикального среза:**
- primary CTA на PDP теперь ведёт через **внутренний checkout** (`/checkout`), чтобы гарантировать запись в БД и видимость в ЛК/админке.

### 4) DB write: где фиксируется “order record”
- **Canonical order record**: `CheckoutSession` (`checkout_sessions`)
- Создание: backend `POST /api/v1/checkout/session` (см. `packages/frontend/src/app/checkout/CheckoutClient.tsx`)
- Сервисы: `packages/backend/src/checkout/checkout.service.ts` (создание и оркестрация checkout session)

### 5) Buyer account (ЛК)
- Backend:
  - `GET /account/orders`, `GET /account/orders/:id`, `POST /account/refund-requests` — `packages/backend/src/account/account.controller.ts`
  - Read-model: `PurchaseReadService` (проекция `CheckoutSession` → карточки ЛК) — `packages/backend/src/account/purchase-read.service.ts`
- Frontend:
  - Деталь заказа: `packages/frontend/src/app/account/orders/[id]/page.tsx` (есть action “запросить возврат”)
  - Список заказов редиректится на unified purchases: `packages/frontend/src/app/account/orders/page.tsx` → `/account/purchases`

### 6) Admin visibility
- Admin V3:
  - Заказы (checkout sessions): `packages/frontend-admin-v3/src/modules/orders/pages/CheckoutOrdersListPage.tsx` → `GET /admin/checkout/sessions`
  - Деталь: `CheckoutOrderDetailPage.tsx` → `GET /admin/checkout/sessions/:id`
- Backend admin endpoints:
  - `packages/backend/src/admin/admin-checkout.controller.ts` (`/admin/checkout/sessions`, `/admin/checkout/sessions/:id`, ...)

### 7) Refund requests (status process, manual)
- DB model: `RefundRequest` (привязан к `FulfillmentItem` + `PaymentIntent`)
- Buyer create:
  - `POST /account/refund-requests` (`CreateAccountRefundRequestDto`) — `AccountController`
- Admin list/approve/reject/process:
  - `GET /admin/refunds/requests`, `POST /admin/refunds/:id/approve|reject|process` — `packages/backend/src/admin/admin-refunds.controller.ts`
  - UI: `packages/frontend-admin-v3/src/modules/refunds/pages/RefundsListPage.tsx`

### 8) GAPS (которые реально мешали замкнуть поток)
1. **Покупка с PDP могла не фиксироваться в БД** (widget/TC order endpoint/redirect) → не появлялась в ЛК/админке.

### 9) Минимальный smoke checklist (ручной)
- Public:
  - `/events` → открыть `/events/[slug]` → нажать “Купить” → попасть на `/checkout`
  - оформить checkout → убедиться, что появился `CheckoutSession` и статус меняется по процессу
- Buyer:
  - `/account/purchases` → увидеть покупку
  - `/account/orders/[id]` → создать refund request по позиции
- Admin:
  - `/admin-v3/orders` → увидеть checkout session
  - `/admin-v3/refunds` → увидеть заявку и сменить статус (approve/reject/process)

