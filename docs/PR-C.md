# Widget & Checkout Pipeline (PR-C1…C5)

## Решение по архитектуре

**PR-C1 реализован; C2–C5 закрываем через текущую архитектуру CheckoutSession → PaymentIntent → Package: widget checkout endpoint, holds из CheckoutSession, success/fail/order по sessionId/shortCode, без Order/Payment.**

---

## PR-C1 (SessionPicker + read API) — готов

- Новый read endpoint: `GET /api/v1/widgets/:provider/event?eventId=`, SessionPicker с available, scarcity, tags (поле зарезервировано).
- Сеансы: isActive, canceledAt=null, startsAt > now, ORDER BY startsAt, LIMIT 30.
- Availability: availableTickets → capacityTotal → event.defaultCapacityTotal; `available = Math.max(0, Math.floor(availableBase))`.
- Ошибки: 400 с кодом `EVENT_ID_REQUIRED` при отсутствии eventId; 404 `EVENT_NOT_FOUND` если событие не найдено.
- В ответе event: id, **slug** (каноническое), title, imageUrl, priceFrom, currency. Поле `eventSlug` может дублировать slug для обратной совместимости.

## C2–C5 — реализовано (без Order/Payment)

- **C2:** В `GET /api/v1/widgets/:provider/event` для сессий считаются теги SOONEST, BEST_PRICE, POPULAR; сортировка: доступные первые, по startsAt, по цене. SOONEST/BEST_PRICE — по данным сессий; POPULAR — эвристика (доля оставшихся мест меньше 30%), без метрик продаж/просмотров.
- **C3:** `POST /api/v1/widgets/:provider/checkout` — создание CheckoutSession (cartSnapshot), валидация, PaymentIntent, возврат checkoutSessionId, shortCode, expiresAt, redirectUrl. Виджет собирает контакты и редиректит на redirectUrl.
- **C4:** Holds = активные CheckoutSession (STARTED, VALIDATED, REDIRECTED, expiresAt > now); effectiveAvailable = capacity − paid − holds; индекс `(status, expiresAt)` на CheckoutSession.
- **C5:** `/checkout/result?session=...` или `sessionId=...` → редирект на `/checkout/[id]?return=success|fail|cancel`. Публичный заказ: `GET /orders/:id` (id = shortCode или UUID сессии). Webhook YooKassa без изменений.

Контракты, SQL агрегата holds и план тестирования: **docs/PR-C2-C5-Spec.md**.
