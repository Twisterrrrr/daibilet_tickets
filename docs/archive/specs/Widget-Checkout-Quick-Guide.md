# Widget Checkout Pipeline (Developer Quick Guide)

Краткое описание архитектуры оплаты для виджетов. Цель — за 2–3 минуты понять, как работает покупка билета.

---

## 1. Главное правило архитектуры

В системе **нет сущностей Order и Payment**.

Используется цепочка:

**CheckoutSession** → **PaymentIntent** → **Package**

- **CheckoutSession** — корзина + hold билетов (TTL)
- **PaymentIntent** — попытка оплаты через платёжного провайдера
- **Package** — фактический оплаченный заказ

---

## 2. Полный поток покупки

1. **Пользователь открывает виджет**  
   `GET /api/v1/widgets/:provider/event`  
   Backend возвращает: event, sessions, availability, tags.

2. **Пользователь выбирает сеанс**  
   SessionPicker. В availability уже учтены: **capacity − paid − holds**.

3. **Пользователь вводит контакты**  
   Имя, Email, Телефон.

4. **Виджет вызывает checkout**  
   `POST /api/v1/widgets/:provider/checkout`  
   Body: eventId, sessionId, qty, buyer { name, email, phone }, idempotencyKey.

5. **Backend создаёт checkout pipeline**  
   CheckoutSession (cartSnapshot: eventId, sessionId, qty; expiresAt = now + TTL, обычно 10 мин).  
   Затем: createPackage(), createPaymentIntent().

6. **Backend возвращает redirect**  
   Response: checkoutSessionId, shortCode, expiresAt, **redirectUrl**.  
   Frontend: `window.top.location.href = redirectUrl`.

7. **Пользователь оплачивает**  
   YooKassa → webhook `POST /checkout/webhook/yookassa`.

8. **Webhook обновляет систему**  
   PaymentIntent → PAID → CheckoutSession → COMPLETED → Fulfillment → Package → PAID.

9. **Пользователь возвращается**  
   `/checkout/result?sessionId=...` → редирект на `/checkout/[id]?return=success`.

---

## 3. Hold механика

Hold создаётся автоматически через CheckoutSession.

**Активные holds:** status IN (STARTED, VALIDATED, REDIRECTED) и **expiresAt > now()**.

Количество holds считается из **cartSnapshot**.

**Availability:**  
`effectiveAvailable = capacity − paid − holds`

---

## 4. Paid билеты

Paid считаются из **PackageItem**.

- Условие: **Package.status = PAID**
- Количество: **adultTickets + childTickets**

---

## 5. Теги сеансов

- **SOONEST** — ближайший сеанс
- **BEST_PRICE** — минимальная цена
- **POPULAR** — эвристика: remainingSeats / capacity < 30%

---

## 6. Idempotency

Checkout endpoint поддерживает **idempotencyKey**.  
Повторный запрос с тем же ключом возвращает тот же checkoutSession/redirectUrl.

---

## 7. Производительность

Holds могут быть дорогими. Рекомендуется:

- кеш агрегата holds, TTL 30–60 с;
- ключ кеша: `widget:holds:{eventId}`.

---

## 8. Совместимость

- **Старый endpoint:** `POST /widgets/teplohod/checkout` — оставлен для обратной совместимости.
- **Новый основной:** `POST /api/v1/widgets/:provider/checkout`.

---

## 9. Публичный заказ

`GET /orders/:id`  
где **id** — shortCode (CS-XXXX) или UUID CheckoutSession.

---

## 10. Коротко

Виджет не создаёт Order. Вся покупка:

```
Widget → CheckoutSession (hold) → PaymentIntent (оплата) → Package (заказ)
```

Подробные контракты и план тестов: **docs/PR-C2-C5-Spec.md**, **docs/PR-C.md**.
