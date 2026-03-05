# PR-C2…C5 — Спецификация и контракты

Закрытие C2–C5 через текущую архитектуру CheckoutSession → PaymentIntent → Package (без Order/Payment).

---

## A) Список файлов и изменений

### Backend

| Файл | Изменения |
|------|-----------|
| `packages/backend/prisma/schema.prisma` | Индекс `@@index([status, expiresAt])` на `CheckoutSession` для выборки holds. |
| `packages/backend/src/widgets/widgets-api.service.ts` | C2: теги SOONEST/BEST_PRICE/POPULAR и сортировка сессий. C4: расчёт holds, effectiveAvailable = capacity - paid - holds. |
| `packages/backend/src/widgets/widgets-api.controller.ts` | Добавить `POST :provider/checkout` → `WidgetsApiService.createWidgetCheckout()`. |
| `packages/backend/src/widgets/widget-checkout.service.ts` | **Новый**: создание CheckoutSession из payload виджета (eventId, sessionId, qty, buyer), валидация, вызов PaymentService.createPaymentIntent, возврат shortCode + redirectUrl. |
| `packages/backend/src/widgets/dto/widget-checkout.dto.ts` | **Новый**: DTO запроса/ответа widget checkout. |
| `packages/backend/src/widgets/widgets.module.ts` | Подключить WidgetCheckoutService, зарегистрировать DTO. |
| `packages/backend/src/checkout/checkout.service.ts` | Опционально: метод `getSessionByShortCodeOrId(id)` для C5 (уже есть getOrderById(sessionId/shortCode)). |
| `packages/backend/src/checkout/payment.service.ts` | Без изменений; returnUrl для виджета передаётся при создании PaymentIntent (через параметр returnUrl в createWidgetCheckout). |

### Frontend (widgets)

| Файл | Изменения |
|------|-----------|
| `packages/frontend/src/app/widgets/[provider]/SessionPickerClient.tsx` | Кнопка «Купить билеты»: вызов `POST /api/v1/widgets/:provider/checkout` с sessionId, qty, buyer (email/name/phone), idempotencyKey; редирект `window.top.location.href = redirectUrl`. |
| `packages/frontend/src/app/checkout/result/page.tsx` | Принимать `sessionId` или `session` в query; редирект на `/checkout/[sessionId]?return=success|fail|cancel`. |
| `packages/frontend/src/app/checkout/[packageId]/CheckoutPackageClient.tsx` | На success показывать Package/CheckoutSession; при return=fail/cancel — сообщение + «Попробовать снова». Поддержка поллинга статуса по GET /checkout/:packageId/status. |

### Общие типы (packages/shared)

| Файл | Изменения |
|------|-----------|
| `packages/shared/src/dto/widgets/widget-checkout.dto.ts` | (опционально) Типы для widget checkout request/response для переиспользования на фронте. |

### Документация

| Файл | Изменения |
|------|-----------|
| `docs/PR-C.md` | Обновить: C2–C5 закрыты; перечислить endpoint, holds, tags, success/fail. |

---

## B) Контракты запрос/ответ

### 1) GET /api/v1/widgets/:provider/event?eventId=&lang=

**Без изменений формата.** Дополнения:
- В каждом элементе `sessions[]`: поле `tags: ('SOONEST'|'BEST_PRICE'|'POPULAR')[]` заполняется на бэкенде (C2).
- `available` в сессиях считается как **effectiveAvailable** (capacity − paid − holds) (C4).

**Ответ (фрагмент):** Каноническое поле события — `event.slug`. Поле `eventSlug` может отдаваться как алиас для обратной совместимости (равен `slug`).
```json
{
  "event": { "id": "...", "slug": "...", "title": "...", "imageUrl": null, "priceFrom": 150000, "currency": "RUB" },
  "sessions": [
    {
      "id": "uuid",
      "startsAt": "2026-03-10T18:00:00.000Z",
      "price": 150000,
      "available": 12,
      "isActive": true,
      "isSoldOut": false,
      "scarcityLevel": "LOW",
      "tags": ["SOONEST", "BEST_PRICE"]
    }
  ]
}
```

---

### 2) POST /api/v1/widgets/:provider/checkout (новый, C3)

**Request (application/json):**
```json
{
  "eventId": "uuid",
  "sessionId": "uuid",
  "qty": 2,
  "buyer": {
    "name": "Иван Иванов",
    "email": "user@example.com",
    "phone": "+79001234567"
  },
  "lang": "ru",
  "returnUrl": "https://partner.com/thank-you",
  "idempotencyKey": "uuid-from-client"
}
```

- `eventId` (string, required) — UUID события.
- `sessionId` (string, required) — UUID сеанса (EventSession.id).
- `qty` (number, required, 1..10).
- `buyer` (object, required): `name`, `email`, `phone` (минимум контакты).
- `lang` (string, optional).
- `returnUrl` (string, optional) — куда вернуть после оплаты (если поддерживается провайдером).
- `idempotencyKey` (string, optional) — для идемпотентности создания PaymentIntent; если не передан — генерируется на бэкенде.

**Response 200:**
```json
{
  "checkoutSessionId": "uuid",
  "shortCode": "CS-XXXX",
  "expiresAt": "2026-03-05T12:20:00.000Z",
  "redirectUrl": "https://yookassa.ru/checkout/... или https://daibilet.ru/checkout/uuid"
}
```

- `redirectUrl` — либо paymentUrl от YooKassa, либо наш `/checkout/[checkoutSessionId]` (если оплата на нашей странице). Виджет делает `window.top.location.href = redirectUrl`.

**Ошибки:**
- **400** — невалидный запрос: отсутствуют или пустые eventId/sessionId, qty вне диапазона 1..10, недостаточно мест с учётом holds (sold out).
- **404** — ресурс не найден: событие или сеанс не найдены в БД (или недоступны).

---

### 3) GET /checkout/track/:shortCode (существующий)

Без изменений. Используется для публичного просмотра заказа по shortCode.

---

### 4) GET /orders/:id (существующий)

`id` = shortCode (например CS-XXXX) или UUID CheckoutSession. Ответ без изменений (уже возвращает данные сессии/заказа).

---

### 5) /checkout/result (C5)

- Текущий URL: `?session=<checkoutSessionId>` и опционально `return=success|fail|cancel`.
- Рекомендуется также принимать `sessionId=` (синоним `session=`).
- Редирект на `/checkout/[sessionId]?return=success|fail|cancel`.
- На странице `/checkout/[packageId]`: при return=success показывать Package или CheckoutSession + статус «Оплата подтверждается»; при fail/cancel — сообщение и кнопка «Попробовать снова».

---

## C) Prisma и SQL для holds

### Индекс в schema.prisma

В модели `CheckoutSession` добавить составной индекс для выборки активных сессий с неистёкшим TTL:

```prisma
@@index([status])
@@index([customerEmail])
@@index([status, expiresAt])  // для выборки holds: status IN (STARTED, VALIDATED, REDIRECTED) AND expiresAt > now()
@@map("checkout_sessions")
```

### Агрегат holds (в коде, не отдельная таблица)

Таблицу Order/HOLD не вводим. Holds считаются так:

1. Выбрать активные `CheckoutSession`: `status IN ('STARTED', 'VALIDATED', 'REDIRECTED')` и `expiresAt > now()`. (Рекомендуется лимит или окно по `createdAt` и/или кеш — см. конец раздела C.)
2. Для каждой сессии распарсить `cartSnapshot` (JSON-массив элементов `{ eventId, sessionId?, quantity }`).
3. Агрегировать в Map<(eventId, sessionId), sum(quantity)>.
4. В `GET /api/v1/widgets/:provider/event` для каждого сеанса: `holds = map.get((eventId, sessionId)) ?? 0`, затем `paid` (см. ниже). Тогда:
   - `effectiveAvailable = max(0, capacity - paid - holds)`
   - `isSoldOut = effectiveAvailable <= 0`
   - `scarcityLevel` от effectiveAvailable.

**Единый источник истины для paid:** количество оплаченных билетов по сеансу = сумма по всем `PackageItem` с данным `sessionId`, у которых `Package.status = 'PAID'`. В схеме нет поля «qty»/«ticketsCount» — используется сумма полей `adultTickets + childTickets` (таблица `package_items`, поля `adultTickets`, `childTickets`). В коде: `findMany` по `sessionId` и `package.status = PAID`, затем в приложении суммирование `adultTickets + childTickets` по sessionId.

Эквивалент одним SQL-запросом (соответствует фактической схеме):

```sql
SELECT pi."sessionId", SUM(pi."adultTickets" + COALESCE(pi."childTickets", 0)) AS paid
FROM package_items pi
JOIN packages p ON p.id = pi."packageId"
WHERE p.status = 'PAID'
GROUP BY pi."sessionId";
```

Holds агрегируются в приложении по `cartSnapshot`, т.к. JSON не даёт эффективного GROUP BY в SQL без расширений.

**Ограничение производительности holds:** выборка «все активные CheckoutSession» при большом числе сессий может стать узким местом. Рекомендуется: ограничить выборку (например, лимит по количеству записей или окно по `createdAt` — только последние N минут/часов) и/или кешировать результат агрегата holds на короткое время (например 30–60 с) с ключом по eventId.

---

## D) План ручного тестирования (5–7 шагов)

1. **GET widget event (C2, C4)**  
   Вызвать `GET /api/v1/widgets/teplohod/event?eventId=<uuid>`. Проверить: в ответе у сессий заполнены `tags` (SOONEST, BEST_PRICE, при необходимости POPULAR), сессии отсортированы (сначала доступные и ближайшие). Создать активную CheckoutSession с этим eventId+sessionId в корзине, повторить запрос — убедиться, что `available` уменьшился на qty (holds).

2. **POST widget checkout (C3)**  
   Вызвать `POST /api/v1/widgets/teplohod/checkout` с телом eventId, sessionId, qty, buyer, idempotencyKey. Проверить: 200, в ответе checkoutSessionId, shortCode, expiresAt, redirectUrl. Повтор с тем же idempotencyKey — тот же redirectUrl (идемпотентность).

3. **Редирект и оплата**  
   Открыть redirectUrl в браузере. Убедиться, что открывается страница оплаты (YooKassa или /checkout/[id]). После успешной оплаты — редирект на /checkout/result?session=... и далее на /checkout/[id]?return=success (C5).

4. **Success/fail UX (C5)**  
   На странице /checkout/[id] при return=success проверить отображение заказа (или «Оплата подтверждается»). При return=cancel или return=fail — сообщение и возможность попробовать снова.

5. **Публичный заказ**  
   Открыть GET /orders/:id где id = shortCode (CS-XXXX). Должны отображаться данные заказа (по CheckoutSession).

6. **Истечение сессии (cron)**  
   Убедиться, что order-expiry переводит сессии с expiresAt < now в EXPIRED. После истечения повторить шаг 1 — hold по этой сессии не должен учитываться (available вернулся).

7. **Старый Teplohod checkout**  
   Вызвать `POST /widgets/teplohod/checkout` (старый маршрут). Проверить, что ответ по-прежнему возвращает checkoutUrl; новый поток через `POST /api/v1/widgets/teplohod/checkout` остаётся предпочтительным и возвращает redirectUrl.
