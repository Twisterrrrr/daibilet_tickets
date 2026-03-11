# Widget & Checkout Pipeline (PR-C0 … PR-C7)

Единый pipeline: контракты ошибок, read API, smart sorting, checkout, holds, webhook, popularity, instant checkout.

---

## PR-C0 — Фундамент контрактов (типизация + ошибки)

- **packages/shared/src/api-error.ts:** тип `ApiErrorBody` (code, message, details?, fieldErrors?, retryable?), константы `CheckoutErrorCode`.
- Ошибки widget/checkout возвращают `{ code, message }` (NestJS BadRequestException/NotFoundException). Коды: EVENT_ID_REQUIRED, EVENT_NOT_FOUND, SESSION_NOT_FOUND, NOT_ENOUGH_AVAILABLE, EVENT_NOT_AVAILABLE, NO_OFFER и др.
- State machine: `checkout-state-machine.ts` — переходы CheckoutSession, PaymentIntent, OrderRequest.

---

## PR-C1 (Read API) — готов

- `GET /widgets/:provider/event?eventId=` (или под префиксом /api/v1 в зависимости от роутинга).
- Сеансы: isActive, canceledAt=null, startsAt > now, ORDER BY startsAt, LIMIT 30.
- Availability: effectiveAvailable = capacity − paid − holds. Paid: PackageItem (Trip Planner) + FulfillmentItem CONFIRMED (widget).
- Ошибки: 400 EVENT_ID_REQUIRED, 404 EVENT_NOT_FOUND.
- В ответе: event (id, slug, eventSlug, title, imageUrl, priceFrom, currency), sessions (id, startsAt, price, available, isSoldOut, scarcityLevel, tags, soldLast24h?, bestOption?).

---

## C2 — Smart sorting + «лучший вариант»

- Теги: SOONEST (ближайший доступный), BEST_PRICE (мин. цена), POPULAR (precomputed soldLast24h > 0 или эвристика остаток < 30%).
- Сортировка: сначала доступные, по startsAt, по цене.
- **bestOption:** ровно один сеанс на событие — с минимальным startsAt среди доступных (не sold out). Совпадает с сеансом, помеченным SOONEST. Правило зафиксировано в коде и в docs/PR-C0-C7-Final.md §6.

---

## C3 — Checkout endpoint + redirect

- `POST /widgets/:provider/checkout`: body eventId, sessionId, qty, buyer (name, email, phone), idempotencyKey?, returnUrl?, lang?.
- Ответ: checkoutSessionId, shortCode, expiresAt, redirectUrl.
- Для виджета на нашей странице используется **forcePlatformPayment: true** (оплата через YooKassa, PLATFORM), иначе при purchaseType=WIDGET сумма была бы 0.
- Валидация: сеанс доступен, qty 1..10, достаточное effectiveAvailable.

---

## C4 — Hold timer + expiry

- Holds: CheckoutSession со status IN (STARTED, VALIDATED, REDIRECTED, **AWAITING_PAYMENT**) и expiresAt > now. Агрегат по cartSnapshot (eventId:sessionId → qty).
- effectiveAvailable = capacity − paid − holds. Paid учитывает PackageItem (PAID) и FulfillmentItem (CONFIRMED) по sessionId из offersSnapshot.
- Cron: order-expiry переводит сессии с expiresAt < now в EXPIRED.
- **Payment после expiry:** при успешной оплате после истечения сессии: PaymentIntent → PAID, CheckoutSession остаётся EXPIRED (state machine), fulfillment выполняется (билет выдаётся). В логах: late_payment_after_expiry. Подробно: docs/PR-C0-C7-Final.md §8.
- **Last seats:** при создании checkout по виджету (forcePlatformPayment) доступность перепроверяется в createPackage (capacity − paid − holds).

---

## C5 — Webhook платежей + выдача билета

- YooKassa: POST /checkout/webhook/yookassa, idempotency (PaymentEventLog.logOnce + processOnce), очередь → markPaid, startFulfillment, executeFulfillment.
- Дубликат webhook: 200 OK, без повторного job/fulfillment; лог webhook_duplicate_ignored.
- PaymentIntent → PAID, CheckoutSession → COMPLETED (если сессия не EXPIRED). FulfillmentItem создаётся, reserve/confirm для PLATFORM.
- Result: /checkout/result?session=… → редирект на /checkout/[id]?return=success|fail|cancel. Публичный заказ: GET /orders/:id (shortCode или UUID).

---

## C6 — «Популярно / купили за сутки»

- Таблица **event_session_stats** (sessionId, soldLast24h, totalPaid, updatedAt). Cron каждые 15 мин (SessionStatsService.recompute).
- В read API сессии приходят с полем **soldLast24h** (из stats). POPULAR использует soldLast24h > 0 или эвристику.
- Миграция: `20260306120000_event_session_stats`.

---

## C7 — Instant checkout (saved customer)

- Таблица **last_customer_snapshots** (email unique, name, phone, updatedAt). Обновляется при успешной оплате (markPaid).
- `GET /widgets/:provider/last-customer?email=…` — возвращает { name, email, phone } для префолла формы. MVP: повторный покупатель может подставить данные и оформить в 1 клик.
- Миграция: `20260306130000_last_customer_snapshot`.

---

## Документация

- Контракты и план тестов: **docs/PR-C2-C5-Spec.md**.
- Аудит и детали: **docs/PR-C0-C7-Audit.md**.
- Итог C0–C7 и E2E validation: **docs/PR-C0-C7-Final.md**.
- Краткий гайд: **docs/Widget-Checkout-Quick-Guide.md**.
