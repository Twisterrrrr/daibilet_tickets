# Buyer Account — Аудит текущего состояния

> Дата: 2026-03-15. Цель: зафиксировать, что уже есть для ЛК покупателя и чего не хватает перед реализацией MVP.

---

## 1. Сущность покупателя

| Сущность | Наличие | Комментарий |
|----------|---------|--------------|
| **User** | ✅ Есть | Модель `User` в Prisma: id, email, passwordHash, name, isActive, refreshTokenHash, lastLoginAt, createdAt, updatedAt. Используется для регистрации/входа и избранного. |
| **Customer** | ❌ Нет | Отдельной модели Customer нет. Покупатель = User. |
| **Привязка заказа к пользователю** | ✅ Есть | В `CheckoutSession` опциональное поле `userId` (FK → User). |

**Вывод:** Использовать **User** как единственную сущность покупателя. Добавить связь CheckoutSession → User (userId, опционально для гостевых заказов).

---

## 2. Модель «заказа» в проекте

В проекте **нет модели Order**. Роль заказа выполняют:

- **CheckoutSession** — сессия оформления (корзина, контакты, статус, сумма, TTL).
- **OrderRequest** — заявки на подтверждение (REQUEST flow), привязаны к CheckoutSession.
- **PaymentIntent** — платёжное намерение, привязано к CheckoutSession.
- **FulfillmentItem** — исполнение по позициям (PLATFORM/EXTERNAL), привязано к CheckoutSession.

Поля CheckoutSession, релевантные для ЛК:

- id (UUID), shortCode (CS-XXXX), customerName, customerEmail, customerPhone
- status (CheckoutStatus), totalPrice, expiresAt, completedAt
- offersSnapshot (JSON), orderRequests, paymentIntents, fulfillmentItems
- **userId** (опционально, FK → User) — добавлено

Поля PaymentIntent (уже есть для YooKassa-ready):

- status (PaymentStatus: PENDING, PROCESSING, PAID, FAILED, CANCELLED, REFUNDED)
- provider, providerPaymentId, providerData, paidAt, failedAt, failReason

**Сопоставление с целевой моделью (Order / Payment / Ticket / Fulfillment):**

| Целевая сущность | В проекте | Комментарий |
|------------------|-----------|-------------|
| **Order** | CheckoutSession | Владение покупкой. userId добавлен. |
| **OrderItem** | offersSnapshot (JSON) + OrderRequest | Состав без отдельной таблицы; при необходимости read-model из snapshot. |
| **Payment** | PaymentIntent | Отдельная сущность: orderId = checkoutSessionId, provider, status, providerPaymentId. **Источник истины по оплате** — не дублировать в Order. |
| **Fulfillment** | FulfillmentItem | Режим: purchaseFlow (PLATFORM/EXTERNAL), status, externalOrderId, externalPaymentUrl. |
| **Ticket** | Нет отдельной | Для checkout: «билет» = trackUrl или externalPaymentUrl; внутренний QR/PDF — при появлении генерации. |

**Импортированные события (покупка вне сервиса):**

- Event имеет **EventSource** (TC, TEPLOHOD, MANUAL). EventOffer имеет **PurchaseType** (WIDGET, REDIRECT, REQUEST).
- При покупке через виджет/редирект оформляется та же CheckoutSession (корзина), но оплата и билет — у партнёра. FulfillmentItem.purchaseFlow = EXTERNAL, externalPaymentUrl — ссылка на оплату/ваучер у партнёра.
- В «Мои покупки» такие записи показываются с типом **EXTERNAL_VOUCHER** / **BOOKING_CONFIRMATION**, визуально отдельно от внутренних билетов.

**Вывод:** Не вводить новую модель Order. CheckoutSession = Order, PaymentIntent = Payment, FulfillmentItem = Fulfillment. Единый экран «Мои покупки» — presentation layer (агрегат по сессиям + payment + fulfillment), без объединения сущностей в одну таблицу.

---

## 3. Auth (покупатель)

| Элемент | Статус | Детали |
|---------|--------|--------|
| Регистрация / логин | ✅ | POST /user/auth/register, POST /user/auth/login. JWT accessToken + cookie user_refresh_token (refresh). |
| Сессия / JWT | ✅ | UserJwtStrategy (type: 'user'), UserJwtGuard. Access token в заголовке Bearer или из памяти/локального хранилища на фронте. |
| Профиль | ✅ | GET /user/auth/me — возвращает id, email, name, lastLoginAt, createdAt. Реализовано в UserAuthService.getProfile. |
| useUserAuth | ✅ | Frontend: useUserAuth, useUserAuthOptional в hooks/useUserAuth.tsx. Контекст: user, token, login, register, logout. |
| Поле phone у User | ❌ | В Prisma у User нет поля phone. Для профиля ЛК можно добавить phone (опционально) или брать только из заказа. |

**Вывод:** Текущий auth для покупателя достаточен. Для MVP профиля можно обойтись без phone в User; при необходимости — добавить миграцию phone позже.

---

## 4. Страницы и роутинг (frontend)

| Путь | Наличие | Назначение |
|------|---------|------------|
| /login | ✅ | Вход / регистрация. После входа редирект на /favorites. |
| /orders/track | ✅ | Отслеживание заказа по коду (guest). OrdersTrackClient — форма ввода кода, запрос к API. |
| /orders/[id] | ✅ | Деталь заказа по id (UUID или shortCode). Публичный доступ, без auth. Запрос GET /api/v1/orders/:id. |
| /favorites | ✅ | Избранное. useFavorites: при auth — API user/favorites + sync с localStorage; без auth — только localStorage. |
| /account, /account/* | ❌ | Нет. Нужно ввести единую точку входа ЛК. |

**Вывод:** Роуты /account, /account/orders, /account/orders/[id], /account/tickets, /account/favorites, /account/profile — добавить. Не заменять /orders/track и /orders/[id]: гостевой трекинг остаётся по shortCode; в ЛК — только «свои» заказы по userId.

---

## 5. Хранение данных заказа и билетов

| Что | Где хранится | Комментарий |
|-----|--------------|-------------|
| Order items | CheckoutSession.offersSnapshot (JSON) + OrderRequest | Состав заказа в snapshot; заявки — в OrderRequest. |
| Payment status | PaymentIntent.status, PaymentIntent.paidAt | По сессии — через связь CheckoutSession → PaymentIntent. |
| Ticket / voucher / QR | Нет отдельной сущности для checkout-flow | Trip Planner: Voucher (packageId, shortCode, qrCodeUrl, pdfUrl, publicUrl). Для checkout: после оплаты клиенту даётся ссылка на трекинг: /orders/track?code=CS-XXXX. Фактически «билет» = страница трекинга с данными по FulfillmentItem (externalOrderId, externalPaymentUrl, providerData). |
| Access / tracking code | CheckoutSession.shortCode | Используется в письмах и для guest track. |
| Email/phone покупателя | CheckoutSession.customerEmail, customerPhone; User — только email, name | Для гостя — только в сессии. Для авторизованного — можно дополнять из User. |

**Вывод:** Read-model для «билетов» в ЛК: по оплаченным сессиям пользователя (status COMPLETED, PaymentIntent PAID) отдавать список позиций из offersSnapshot + FulfillmentItem (внешние ссылки, статус). Отдельную таблицу Ticket для checkout-flow на MVP не вводить; при необходимости — позже.

---

## 6. Механизм выдачи билетов после оплаты

- Письмо с ссылкой на трекинг (trackUrl = /orders/track?code=...) отправляется при создании заказа и при успешной оплате (где реализовано).
- Фактическая «выдача» — страница /orders/track с данными сессии (состав, операционная информация, ссылки на внешнюю оплату при EXTERNAL).
- Отдельного «генератора PDF/QR билета» для checkout-flow в коде не найдено; для MVP достаточно ссылки на трекинг и, при наличии, externalPaymentUrl / providerData из FulfillmentItem.

**Вывод:** Для ЛК «мои билеты» = агрегация оплаченных позиций по своим заказам с ссылками на трекинг и внешние ресурсы. Генерацию PDF/QR можно добавить следующим этапом.

---

## 7. API для orders и profile

| Endpoint | Наличие | Auth | Назначение |
|----------|---------|------|------------|
| GET /orders/:id | ✅ | Нет | Публичный трекинг по id (UUID или shortCode). OrdersController → CheckoutService.getOrderById. |
| GET /checkout/track/:shortCode | ✅ | Нет | Публичный трекинг по shortCode. CheckoutController.trackOrder → trackByShortCode. |
| GET /checkout/session/:id | ✅ | Нет | Получение сессии по id. Публичный. |
| GET /user/auth/me | ✅ | Да (UserJwtGuard) | Профиль текущего пользователя. |
| GET /user/favorites | ✅ | Да | Список slugs избранного. |
| POST/DELETE /user/favorites, sync | ✅ | Да | Добавление/удаление/синхронизация избранного. |
| GET /account/me | ✅ | Да | Сводка ЛК (user, ordersCount, activeTicketsCount, favoritesCount). |
| GET /account/orders | ✅ | Да | Список заказов текущего пользователя. |
| GET /account/orders/:id | ✅ | Да | Деталь заказа с проверкой ownership. |
| GET /account/tickets | ✅ | Да | Список билетов/позиций по оплаченным заказам. |
| GET /account/purchases | ✅ | Да | Единый список покупок/бронирований с типами карточек (INTERNAL_TICKET, EXTERNAL_VOUCHER, BOOKING_CONFIRMATION, AWAITING_PAYMENT, MANUAL_CONFIRMATION). |
| GET/PATCH /account/profile | ✅ | Да | Профиль. |

**Вывод:** Ввести префикс /account с обязательной auth и ownership: GET /account/me, GET /account/orders, GET /account/orders/:id, GET /account/tickets, GET/PATCH /account/profile. Избранное — переиспользовать user/favorites или дать обёртку из account.

---

## 8. Frontend: layout, header, user menu

| Элемент | Статус |
|---------|--------|
| Header | ✅ Есть. Компонент Header (layout). |
| User menu | ✅ Есть. При auth: «Мои покупки» → /account/purchases, «Личный кабинет» → /account, «Выйти». |
| Избранное в header | ✅ Иконка Heart + счётчик, ссылка на /favorites. |
| Entry в ЛК | ✅ «Мои покупки» в user menu и мобильном меню → /account/purchases. После логина редирект на /account/purchases (или returnUrl). |

**Вывод:** Реализовано: «Мои покупки» как основной entry point, «Личный кабинет» — обзор; редирект после логина по умолчанию на /account/purchases.

---

## 9. Пробелы (обязательные для MVP)

1. **Привязка заказа к пользователю:** В CheckoutSession добавить опциональное поле `userId` (FK → User). При создании сессии, если пользователь авторизован — записывать userId.
2. **Account API:** Новый модуль (или контроллер) account: GET /account/me, /account/orders, /account/orders/:id, /account/tickets, GET/PATCH /account/profile. Все эндпоинты под UserJwtGuard; для orders/:id — проверка ownership (session.userId === req.user.id).
3. **Guest flow не трогать:** GET /orders/:id и GET /checkout/track/:shortCode остаются публичными; доступ к «чужим» заказам только по знанию id/shortCode (как сейчас). В ЛК показывать только заказы с userId = current user.
4. **Frontend:** Роуты /account, /account/orders, /account/orders/[id], /account/tickets, /account/favorites, /account/profile; account layout (sidebar или табы); состояния loading/empty/error/unauthorized.
5. **Навигация:** В header в user menu добавить ссылку на /account (Личный кабинет / Мои заказы).
6. **Профиль:** GET уже есть (/user/auth/me). Для MVP PATCH /account/profile — имя, при необходимости email (если допустимо политикой). Поле phone в User опционально на будущее.

---

## 10. Что можно переиспользовать

- **User**, UserAuthService, UserJwtGuard, UserJwtStrategy — без изменений (расширить только при необходимости phone/профиль).
- **CheckoutService.createCheckoutSession** — добавить опциональный параметр userId; при наличии — записывать в CheckoutSession.
- **CheckoutService.getOrderById / trackByShortCode** — не менять; использовать внутри account для «своего» заказа после проверки ownership.
- **UserFavoritesController** — оставить как есть; в ЛК дать ссылку на /favorites или обёртку.
- **Формат ответа трекинга** (formatTrackingResultSync и аналог) — переиспользовать для account order detail, чтобы не дублировать логику.
- **PaymentIntent, FulfillmentItem** — не менять; использовать для отображения статуса оплаты и билетов в ЛК.

---

## 11. Опционально (не блокирует MVP)

- Поле **phone** в User и в PATCH /account/profile — при необходимости.
- **YooKassa metadata:** В payment init передавать metadata.orderId, metadata.userId (или customerId) для последующего маппинга в webhook. Заложить в PaymentService/провайдере при интеграции YooKassa.
- Отдельная сущность **Ticket** для checkout-flow — не делать на MVP; read-model на основе FulfillmentItem + offersSnapshot достаточно.
- Повторная отправка билетов на email — если уже есть API (например, admin resend), в ЛК можно добавить кнопку; иначе — следующий этап.

---

## 12. Итог

| Область | Есть | Нет / добавить |
|---------|------|-----------------|
| Сущность покупателя | User | — |
| Связь заказа с пользователем | userId в CheckoutSession | — |
| Auth | login, register, me, refresh, logout | — |
| Страницы | login, orders/track, orders/[id], favorites, account/* | Единый экран /account/purchases |
| API orders (публичный) | GET /orders/:id, GET /checkout/track/:shortCode | — |
| API account | GET /account/me, orders, orders/:id, tickets, profile | GET /account/purchases (unified) |
| Избранное API | user/favorites | обёртка или ссылка из account |
| Header / user menu | Личный кабинет, Выйти, Избранное | «Мои покупки» → /account/purchases |
| Билеты | Трекинг по shortCode, FulfillmentItem | Read-model; билет показывать только если есть (track/external) |

Минимальные обязательные изменения для MVP: **Prisma: userId в CheckoutSession; backend: account module + guards + ownership; checkout: передача userId при создании сессии; frontend: account layout + страницы + пункт в header.**
