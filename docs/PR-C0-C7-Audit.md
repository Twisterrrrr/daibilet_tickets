# Аудит Checkout + Smart UX Pipeline (PR-C0 … PR-C7)

Дата: 2026-03-06. Цель: привести pipeline к единому рабочему состоянию без переписывания рабочих частей.

---

## 1. Существующие документы

| Документ | Содержание |
|----------|------------|
| **docs/PR-C.md** | Краткое описание C1–C5: read API, tags, checkout, holds, result. |
| **docs/PR-C2-C5-Spec.md** | Спецификация контрактов, SQL holds, план тестов. |
| **docs/Widget-Checkout-Quick-Guide.md** | Краткий гайд: CheckoutSession → PaymentIntent → Package (фактически FulfillmentItem для widget). |

**Пробелы:** C0 (контракты ошибок, типы), C6 (popularity), C7 (instant checkout) не описаны.

---

## 2. Backend: модули и сервисы

| Компонент | Файл | Статус |
|-----------|------|--------|
| Read API (widget event + sessions) | `widgets/widgets-api.service.ts` | Есть: getEventWithSessions, holds, paid, tags (SOONEST/BEST_PRICE/POPULAR). |
| Widget checkout | `widgets/widget-checkout.service.ts` | Есть: createWidgetCheckout → createPackage + updatePackageContacts + createPaymentIntent. |
| CheckoutSession + createPackage | `checkout/checkout.service.ts` | createPackage создаёт CheckoutSession (не Trip Planner Package), offersSnapshot, expiresAt. |
| PaymentIntent | `checkout/payment.service.ts` | createPaymentIntent, markPaid, idempotency по idempotencyKey. |
| Holds | `widgets/widgets-api.service.ts` (getHoldsMap) | Активные сессии STARTED/VALIDATED/REDIRECTED, expiresAt > now, агрегат по cartSnapshot. |
| Paid count | `widgets/widgets-api.service.ts` (getPaidBySessionId) | **Пробел:** считает только PackageItem + Package.status=PAID; widget flow не создаёт Package → paid=0 для виджетных продаж. |
| Order expiry | `scheduler/order-expiry.service.ts` | CheckoutSession с expiresAt < now → EXPIRED. |
| Webhook YooKassa | `checkout/checkout.controller.ts` → queue | processOnce (idempotency), job yookassa-webhook. |
| Fulfillment | `queue/fulfillment.processor.ts` | markPaid → startFulfillment → executeFulfillment (только PLATFORM). |
| FulfillmentItem | `checkout/fulfillment.service.ts` | Создание по offersSnapshot; reserve/confirm через BookingProvider. |

**Критический пробел:** `resolvePaymentFlow(WIDGET)=EXTERNAL` → для TEPLOHOD widget в offersSnapshot все позиции EXTERNAL → platformTotal=0 → createPaymentIntent выбрасывает «Нет PLATFORM-позиций». Нужно для widget checkout при оплате на нашей стороне трактовать поток как PLATFORM (например флаг в createPackage или переопределение в snapshot).

---

## 3. Prisma-модели (релевантные)

| Модель | Назначение |
|--------|------------|
| **Event** | Событие. |
| **EventSession** | Сеанс: startsAt, availableTickets, capacityTotal, prices. |
| **EventOffer** | Оффер (TC, TEPLOHOD, MANUAL), purchaseType (WIDGET/REDIRECT/REQUEST). |
| **CheckoutSession** | Корзина + TTL: cartSnapshot, offersSnapshot, status, expiresAt, shortCode. Индекс (status, expiresAt). |
| **PaymentIntent** | Попытка оплаты: idempotencyKey, amount, status, providerPaymentId. |
| **FulfillmentItem** | Позиция исполнения: checkoutSessionId, offerId, purchaseFlow, status (PENDING→RESERVING→RESERVED→CONFIRMED). |
| **Package** | Trip Planner (cityId, dateFrom, dateTo, adults, children…). |
| **PackageItem** | Строка пакета (sessionId, adultTickets, childTickets). Используется для paid count по сессиям; для widget после оплаты не создаётся. |

Связь: Widget оплата → CheckoutSession + PaymentIntent (PAID) + FulfillmentItem (CONFIRMED). Package/PackageItem — отдельно (Trip Planner и пока не виджет).

---

## 4. Что уже закрыто / частично

| PR | Статус | Замечания |
|----|--------|-----------|
| **C0** | Частично | Ошибки разбросаны (code + message в throw), единого DTO ошибок нет. Есть коды EVENT_ID_REQUIRED, EVENT_NOT_FOUND, SESSION_NOT_FOUND, NOT_ENOUGH_AVAILABLE, EVENT_NOT_AVAILABLE, NO_OFFER. |
| **C1** | Готов | GET /api/v1/widgets/:provider/event?eventId=, event + sessions, available (effectiveAvailable), tags. |
| **C2** | Готов | SOONEST, BEST_PRICE, POPULAR (эвристика), сортировка. |
| **C3** | Частично | POST checkout есть; для TEPLOHOD WIDGET получается platformTotal=0 → ошибка. Нужен флаг оплаты на платформе. |
| **C4** | Частично | Holds считаются; paid только по PackageItem → для widget 0. Нужен учёт FulfillmentItem (CONFIRMED) + sessionId в snapshot. |
| **C5** | Готов | Webhook idempotent, markPaid, startFulfillment, executeFulfillment. Result page, track by shortCode. |
| **C6** | Нет | Precomputed popularity / sold last 24h не реализованы. |
| **C7** | Нет | Saved customer / instant checkout нет. |

---

## 5. Пробелы по пунктам

- **Типизация:** часть ответов/ошибок без общих типов; в тестах встречается `any`.
- **DTO:** widget request/response в dto/widget-checkout.dto.ts; общие типы в shared не полные.
- **Error handling:** нет единого формата { code, message, details?, retryable? }; фронт может ожидать другой shape.
- **Idempotency:** есть по idempotencyKey для PaymentIntent и для webhook (processOnce).
- **Stats/precompute:** нет; POPULAR только эвристика (остаток < 30%).
- **Saved customer:** нет сущности/поля.
- **Instant checkout:** нет.

---

## 6. План реализации (кратко)

1. **C0:** Ввести общий тип ошибки API (code, message, details?, retryable?), константы кодов, использовать в widget/checkout; убрать лишние any.
2. **C3/C4 (критично):** В createPackage поддержать «оплата на платформе» для widget (например forcePlatformPayment или paymentFlow: 'PLATFORM') чтобы сумма не была 0. В getPaidBySessionId учитывать FulfillmentItem CONFIRMED по sessionId (sessionId в offersSnapshot — добавить в snapshot при создании).
3. **C6:** Таблица или джоба precomputed stats по session/event (soldLast24h, totalPaid), в read API отдавать и использовать для POPULAR.
4. **C7:** Минимальный saved customer (например last customer по email/cookie или по CheckoutSession), API «повторить с теми же данными» + 1-click подтверждение.
5. **Документация:** Обновить PR-C.md и PR-C2-C5-Spec.md, добавить PR-C0-C7-Final.md с итоговыми контрактами.

---

## 7. Файлы для изменений (предварительно)

- `packages/backend/src/common/` — типы ошибок API (новый или в существующем).
- `packages/backend/src/checkout/dto/checkout.dto.ts` — CreatePackageDto: опция forcePlatformPayment или paymentFlow.
- `packages/backend/src/checkout/checkout.service.ts` — построение offersSnapshot с учётом PLATFORM для widget; при необходимости sessionId в snapshot.
- `packages/backend/src/checkout/cart-partitioning.ts` — SnapshotLineItem: опционально sessionId.
- `packages/backend/src/widgets/widgets-api.service.ts` — getPaidBySessionId: учитывать FulfillmentItem + sessionId из snapshot; bestOption/labels.
- `packages/backend/src/widgets/widget-checkout.service.ts` — передать флаг оплаты на платформе.
- `packages/backend/prisma/schema.prisma` — при C6: модель SessionStats или аналог; при C7: сохранённый customer (минимально).
- Документация: PR-C.md, PR-C2-C5-Spec.md, PR-C0-C7-Final.md.
