# Buyer Account — Архитектурная спецификация MVP

> ЛК покупателя = единая точка входа для заказов, билетов, избранного и профиля. Совместимость с гостевой выдачей по коду и готовность к интеграции YooKassa.

---

## 1. Главная цель

**Личный кабинет покупателя** — раздел для авторизованного пользователя (User), где он может:

- видеть сводку (дашборд): количество заказов, активных билетов, избранного;
- просматривать список своих заказов и детали заказа;
- открывать «мои билеты» (позиции оплаченных заказов с ссылками на трекинг/внешние ресурсы);
- переходить в избранное (существующий функционал);
- просматривать и при необходимости редактировать профиль (имя, email; phone — опционально).

Гостевой сценарий (трекинг по коду из письма) **не заменяется** и остаётся отдельным потоком.

---

## 2. Роутинг

Рекомендуемая структура роутов (frontend):

| Маршрут | Назначение |
|---------|------------|
| `/account` | Dashboard ЛК: приветствие, счётчики, быстрые ссылки (в т.ч. «Мои покупки»). |
| **`/account/purchases`** | **Единый экран «Мои покупки / бронирования»** — один список с карточками разного типа (внутренний билет, партнёрский ваучер, ожидает подтверждения, ожидает оплаты). Основная точка входа после логина. |
| `/account/orders` | Список заказов (альтернативный вид; можно оставить или редирект на purchases). |
| `/account/orders/[id]` | Деталь заказа (только свой; id = UUID сессии или shortCode). |
| `/account/tickets` | Список билетов/позиций по оплаченным заказам (опционально; часть данных дублируется в purchases). |
| `/account/favorites` | Избранное — редирект на `/favorites` или встроенная обёртка. |
| `/account/profile` | Профиль: просмотр и редактирование (имя, email, при необходимости phone). |

Существующие маршруты **не менять**:

- `/orders/track` — поиск заказа по коду (guest).
- `/orders/[id]` — публичный просмотр заказа по id/shortCode (guest или любой знающий ссылку).

Все маршруты под `/account` требуют авторизации; при отсутствии токена — редирект на `/login` с returnUrl в `/account`.

---

## 3. Единый экран «Мои покупки» (UI-концепция)

**Не делать отдельные разделы «Мои заказы» и «Мои билеты» как главные.** Вместо этого — один экран **«Мои покупки / бронирования»** (`/account/purchases`), который показывает список **purchase records**. Каждая карточка имеет **тип** и визуально отличается:

| Тип карточки | displayStatus (пример) | Когда показывать | Действия |
|--------------|------------------------|------------------|----------|
| **INTERNAL_TICKET** | Билет доступен | Сессия COMPLETED, оплата PAID, есть trackUrl (внутреннее исполнение). | Открыть QR / Скачать PDF, Открыть трекинг. |
| **EXTERNAL_VOUCHER** | Подтверждено партнёром | Fulfillment EXTERNAL, есть externalPaymentUrl или внешний ваучер. | Посмотреть ваучер, Перейти к бронированию. |
| **BOOKING_CONFIRMATION** | Бронирование подтверждено | REQUEST flow, статус CONFIRMED/COMPLETED. | Открыть трекинг, инструкции. |
| **AWAITING_PAYMENT** | Ожидает оплаты | Сессия AWAITING_PAYMENT или оплата PENDING/PROCESSING. | Оплатить. |
| **MANUAL_CONFIRMATION** | Ожидает подтверждения | PENDING_CONFIRMATION, заявка на подтверждение. | — |

**Правило:** билет/ваучер показывается только если он **реально есть** (trackUrl, externalPaymentUrl или артефакт Ticket), а не «раз оплачено — значит есть билет». Импортированные события (покупка через виджет/редирект) отображаются как **EXTERNAL_VOUCHER** / **BOOKING_CONFIRMATION**, визуально отдельно от внутренних билетов.

## 4. Минимальные разделы ЛК (MVP)

| Раздел | Содержимое |
|--------|-------------|
| **Dashboard** | Приветствие (имя), счётчики, ссылка «Мои покупки», «Профиль», «Избранное». |
| **Мои покупки** | Единый список карточек по типам (см. выше). Пагинация, сортировка по дате desc. |
| **Деталь заказа** | Номер, дата, статусы (заказ + оплата), состав, сумма; блок «Билеты» (только если есть track/external); кнопки: открыть трекинг, при наличии — внешняя ссылка. |
| **Мои билеты** | Опционально; можно оставить как фильтр/вид «только с билетом» или убрать в пользу purchases. |
| **Избранное** | Переиспользовать `/favorites`. |
| **Профиль** | Имя, email; кнопка «Сохранить». |

---

## 5. Разделение Order / Payment / Fulfillment (доменная модель)

- **Order** в проекте = CheckoutSession (userId, status, totalPrice, offersSnapshot). Владение покупкой.
- **Payment** = PaymentIntent (отдельная сущность: checkoutSessionId, provider, status, providerPaymentId). **Источник истины по оплате**; Order.status агрегируется/синхронизируется на основании Payment при необходимости.
- **Fulfillment** = FulfillmentItem (purchaseFlow PLATFORM/EXTERNAL, status, externalOrderId, externalPaymentUrl). Исполнение по позициям; для импортированных событий — EXTERNAL + внешняя ссылка.
- **Ticket** — отдельной сущности для checkout нет; «билет» = наличие trackUrl или externalPaymentUrl / артефакта. Показывать в UI только если реально есть что открыть.

Единый экран «Мои покупки» — **presentation layer**: агрегат по CheckoutSession + PaymentIntent + FulfillmentItem. В БД сущности не объединять.
В реализации MVP агрегат оформлен в виде read‑сервиса `PurchaseReadService` + маппер `PurchaseReadService.mapSessionToPurchase`, который собирает `PurchaseListItemDto`. Артефакты билетов/ваучеров для отображения нормализуются через `TicketCapabilityService.getTicketCapability(session, appUrl)`.

## 6. Привязка заказа к пользователю

**Правило:**

- При создании **CheckoutSession** (createCheckoutSession), если запрос выполнен **с авторизацией** (есть JWT пользователя), в сессию записывается `userId` (FK на User). Данные покупателя (name, email, phone) по-прежнему берутся из тела запроса (корзина/форма); при желании можно подставлять из профиля User значения по умолчанию.
- Если пользователь **не авторизован** — `userId` остаётся `null` (гостевой заказ). Трекинг только по shortCode; в ЛК такой заказ не появится.
- **Привязка гостевого заказа к аккаунту** (claim by email/код) в MVP не реализуется; архитектурно можно зарезервировать возможность последующего обновления `userId` по правилам (например, совпадение email + код).

**Реализация:** опциональный параметр `userId` в `createCheckoutSession`; в контроллере при наличии `req.user` передавать `req.user.id`.

---

## 7. Связь с YooKassa (архитектура, без реального подключения)

Заложить контракт метаданных и маппинга для последующей интеграции:

**Метаданные при создании платежа (payment init):**

- `metadata.orderId` — id CheckoutSession (UUID).
- `metadata.userId` — id User (если авторизован); иначе отсутствует или `guest`.
- По желанию: `metadata.source` = `daibilet-web`, `metadata.environment` = staging/production.

**При обработке webhook (payment.succeeded / payment.canceled):**

- По `payment.id` или сохранённой связке PaymentIntent ↔ providerPaymentId находим PaymentIntent и CheckoutSession.
- Обновление статуса PaymentIntent и сессии; при необходимости — запись `paidAt` на сессию (если вынесено из PaymentIntent в read-model).
- Идентификатор пользователя для «мои заказы» уже есть в CheckoutSession.userId; дополнительный маппинг по metadata не обязателен, но metadata.userId полезен для аудита и отладки.

**Поля в CheckoutSession (опционально на MVP):** если нужен быстрый read без джойна к PaymentIntent, можно добавить `paidAt` (дублирование с PaymentIntent.paidAt при успешной оплате). Минимально достаточно текущей схемы: оплата хранится в PaymentIntent; для списка заказов в ЛК статус оплаты берётся из связи CheckoutSession → PaymentIntent.

---

## 8. Статусы

**CheckoutSession (CheckoutStatus):** уже определены в проекте. Не менять значения enum.

- STARTED, VALIDATED, REDIRECTED, PENDING_CONFIRMATION, CONFIRMED, AWAITING_PAYMENT, COMPLETED, EXPIRED, CANCELLED.

**PaymentIntent (PaymentStatus):** уже определены.

- PENDING, PROCESSING, PAID, FAILED, CANCELLED, REFUNDED.

**Fulfillment (FulfillmentStatus):** для отображения исполнения по позициям.

- PENDING, RESERVING, RESERVED, CONFIRMED, FAILED, CANCELLED, REFUNDED.

Для ЛК достаточно отображать статус сессии и агрегированный статус оплаты (например: «Оплачен», если есть PaymentIntent со статусом PAID). Детали FulfillmentItem — в карточке заказа и в «Мои билеты».

---

## 9. Доступы и безопасность

- **Все маршруты `/account/*`** доступны только авторизованному пользователю (UserJwtGuard). Иначе — 401 и на фронте редирект на `/login`.
- **GET /account/orders** — возвращает только заказы, где `CheckoutSession.userId = req.user.id`.
- **GET /account/orders/:id** — перед выдачей данных проверять ownership: заказ должен принадлежать текущему пользователю (`session.userId === req.user.id`). Иначе — 403 Forbidden. Параметр `id` — UUID сессии или shortCode; резолв через существующий getOrderById с последующей проверкой userId.
- **GET /account/tickets** — только позиции из заказов текущего пользователя (сессии с userId = req.user.id и статус оплаты PAID / сессия COMPLETED).
- **Guest tracking** остаётся отдельно: GET /orders/:id и GET /checkout/track/:shortCode — без проверки userId; доступ по знанию id/shortCode (как сейчас). Не смешивать с account API.

---

## 10. Совместимость с текущим guest flow

- **Не менять** поведение публичных эндпоинтов: GET /orders/:id, GET /checkout/track/:shortCode, GET /checkout/session/:id. Они остаются без авторизации.
- **Не менять** создание гостевой сессии: при отсутствии JWT `userId` в CheckoutSession не заполняется.
- ЛК — **дополнение**: пользователь видит только свои заказы (где указан его userId). Гостевые заказы по-прежнему доступны только по ссылке/коду.
- После успешной оплаты в письме по-прежнему можно давать ссылку на `/orders/track?code=...`; в ЛК тот же заказ (если был оформлен под пользователем) появится в «Мои заказы» и будет открываться и по `/account/orders/[id]`.

---

## 11. DTO / read-model

- Не отдавать сырой Prisma-объект. Использовать явные DTO/response-типы:
  - **AccountSummaryDto:** user (id, name, email), ordersCount, activeTicketsCount, favoritesCount.
  - **PurchaseListItemDto** (для GET /account/purchases): purchaseId (id сессии или составной ключ по позиции), eventTitle, purchaseDate, eventDate, displayStatus, purchaseType (INTERNAL_TICKET | EXTERNAL_VOUCHER | BOOKING_CONFIRMATION | AWAITING_PAYMENT | MANUAL_CONFIRMATION), ticketAvailable (boolean), primaryAction ({ label, url }?), secondaryAction ({ label, url }?), shortCode.
  - **AccountOrderListItemDto:** id, shortCode, createdAt, status, paymentStatus, totalAmount, currency, itemsPreview, hasTickets/trackUrl.
  - **AccountOrderDetailDto:** расширенная версия формата трекинга (shortCode, status, totalPrice, buyer info, items, payment info, voucher/track links).
  - **AccountTicketItemDto:** orderId/shortCode, eventTitle, eventSlug, sessionStartsAt, status, trackUrl или externalUrl.
  - **AccountProfileDto:** name, email, phone (если есть).
- В проекте при наличии паттерна fields=card/full или mapper layer — использовать его для консистентности.

**Текущий статус реализации read‑model:**

- `CheckoutSession` выступает как **Order‑подобный агрегат** (владение покупкой, userId, статус, сумма).
- `PaymentIntent` реализует слой **Payment** (provider, status, суммы, paidAt).
- `FulfillmentItem` — слой **Fulfillment** (purchaseFlow, status, внешние ссылки).
- `PurchaseListItemDto`/`PurchaseReadService` формируют **Purchase read‑model** для `/account/purchases`.
  Маппинг типа карточки и доступных действий вынесен в `getPurchaseDisplayType` + `derivePurchaseActions` с unit‑тестами.
  Наличие «артефакта билета» (что реально можно открыть) нормализовано через helper `computeTicketAvailable` (trackUrl или externalUrl) и каркас сервиса `TicketCapabilityService`, который собирает артефакты и используется в `PurchaseReadService`. Всё покрыто unit‑тестами.

## 13. Тестовая матрица Buyer Account (backend)

- **Unit-тесты:**
  - `purchase-display.util.spec.ts` — правила `getPurchaseDisplayType`, `derivePurchaseActions`, `computeTicketAvailable`.
  - `purchase-read.service.spec.ts` — маппинг `CheckoutSession` → `PurchaseListItemDto` для INTERNAL_TICKET, EXTERNAL_VOUCHER, BOOKING_CONFIRMATION, AWAITING_PAYMENT (через `TicketCapabilityService`).
  - `ticket-capability.service.spec.ts` — артефакты билетов/ваучеров и флаги доступности (internal ticket, external voucher, отсутствие артефактов).
- **Controller-level (mini-e2e) тесты:**
  - `account.e2e.spec.ts` — контракты `/account/purchases`, `/account/orders`, `/account/orders/:id` (включая 403 при чужом заказе), `/account/tickets`.
  - `track-order.e2e.spec.ts` — публичный трекинг `/checkout/track/:shortCode`.

---

## 12. Следующие этапы (после MVP)

- Реальная интеграция YooKassa: payment init, webhook, payment status sync, success/fail страницы.
- Повторная отправка билетов на email (если появится API).
- Claim гостевого заказа в аккаунт (по email + код).
- Возвраты/отмены в ЛК.
- История платежей, бонусы/промокоды, support/disputes в ЛК.
