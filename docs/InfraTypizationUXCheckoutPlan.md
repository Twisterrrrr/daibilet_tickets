# Инфраструктура, типизация, UX, Checkout — План на 26 PR

> Пакет задач (каждая = 1 PR). Порядок: инфра → типизация/кэш → UX/страницы → Supplier → Checkout.

---

## Правила исполнения

- Каждая таска = один PR, без смешивания «инфра+UX».
- T11–T12: кэш без сложной инвалидации — только TTL + опциональный `nocache`.
- T18: self-service — только drafts + moderation later, без полной публикации.

---

## Блок 1: Инфраструктура и надёжность

### T1. Nginx: static /uploads/

**Цель:** раздавать загрузки как статику.

**Где:** `infra/nginx/*.conf`, `docker-compose*.yml` (volumes).

**DoD:**
- `location /uploads/ { alias ...; }` (prod+staging)
- Cache-Control для картинок/файлов
- `GET /uploads/test.jpg` → 200

---

### T2. Feature Flags: Prisma модель + публичный endpoint

**Цель:** флаги фич (отключение EXTERNAL по городам и т.д.).

**Где:** Prisma schema, FeatureFlagsModule.

**DoD:**
- `FeatureFlag { key, enabled, rulesJson, updatedAt }` + unique index по key
- `GET /public/feature-flags` возвращает map `{ key: { enabled, rules } }`
- ETag/Cache headers или Redis TTL 30–60с

---

### T3. Feature Flags: frontend hook + helper

**Цель:** единая проверка `isEnabled(flag, ctx)`.

**Где:** `frontend/src/lib/featureFlags/*`, app init.

**DoD:**
- `useFeatureFlags()` грузит `/public/feature-flags`
- `isEnabled("EXTERNAL", { cityId })` поддерживает rulesJson
- fallback: если flags не загрузились → safe default (false для рисковых)

---

### T4. Pino structured logs: базовая интеграция в Nest

**Цель:** JSON-логи, requestId, длительность, статус.

**Где:** `backend/src/main.ts`, logger module, AppModule.

**DoD:**
- pino включён глобально
- request logs: `{ reqId, method, url, status, durationMs }`
- единый формат в prod/staging

---

### T5. Логи Checkout/Payments: корреляционные поля

**Цель:** связать packageId/orderId/paymentId/provider.

**Где:** `checkout.service.ts`, `payments/*`, webhooks.

**DoD:**
- во всех ключевых логах есть packageId, paymentId, provider
- ошибки оплаты: level=error + err объект

---

### T6. Sentry: backend (5xx + payment failures)

**Цель:** алерты на серверные ошибки и оплаты.

**Где:** `backend/src/sentry/*`, main.ts, exception filter/interceptor.

**DoD:**
- Sentry SDK подключён
- автозахват 5xx
- явный captureMessage/captureException на PAYMENT_FAILED
- tags: env, release, provider

---

### T7. Sentry: frontend (route errors + checkout)

**Цель:** ловить фронтовые падения + ошибки checkout.

**Где:** `frontend/src/sentry.ts`, main.tsx, router error boundary.

**DoD:**
- подключён SDK
- ошибки checkout помечаются tags (packageId)
- sourcemaps (если пайплайн есть)

---

### T11. Redis Cache: CacheService + ключи/TTL

**Цель:** ускорить каталог и детали.

**Где:** `backend/src/cache/*`, `redis.module.ts`.

**DoD:**
- `remember(key, ttl, fn)` + JSON serialize
- ключи: `catalog:list:{city}:{hash}` TTL 60–180s, `catalog:detail:{type}:{id}` TTL 5–30m
- метрика/log cacheHit/cacheMiss (debug)

---

### T12. N+1: подключить кэш к спискам/деталям каталога

**Цель:** реально задействовать кэш из T11.

**Где:** `catalog.service.ts`, `venues.service.ts`.

**DoD:**
- list endpoint кэшируется по фильтрам
- detail endpoint кэшируется по id/slug
- bypass по `?nocache=1` (для отладки)

---

### T26. Webhook устойчивость + идемпотентность платежей

**Цель:** исключить двойные оплаты/статусы.

**Где:** `payments/webhook.controller.ts`.

**DoD:**
- проверка idempotency (по paymentId)
- лог `duplicate webhook ignored`
- защита от повторного перехода статуса
- Sentry alert при несоответствии суммы

---

## Блок 2: Типизация и техдолг

### T8. Типизация tc-sync: TcEvent вместо any[]

**Цель:** убрать «дырку» без изменения поведения.

**Где:** `tc-sync/*`, DTO/mapper.

**DoD:**
- type `TcEvent` (минимальный набор полей)
- все `any[]` → `TcEvent[]`
- компиляция проходит

---

### T9. Proto-generated types для gRPC: генерация + пилот

**Цель:** protoc generation + использование.

**Где:** `proto/*`, scripts `gen-proto.*`, `backend/src/generated/*`.

**DoD:**
- команда `pnpm gen:proto`
- generated types подключены хотя бы в 1 gRPC клиенте
- без ручных дублей типов

---

### T10. Prisma where builders: каркас + применение в 2 местах

**Цель:** типобезопасные фильтры вместо where: any.

**Где:** `backend/src/catalog/where-builders/*`.

**DoD:**
- `buildEventWhere(dto): Prisma.EventWhereInput`
- `buildVenueWhere(dto): Prisma.VenueWhereInput`
- 2 контроллера/метода переведены на builders

---

## Блок 3: Email

### T13. Email templates: order-confirmed (MVP)

**Цель:** письмо после успешной оплаты/создания заказа.

**Где:** `backend/src/email/templates/*`, `email.service.ts`.

**DoD:**
- шаблон HTML (mjml/handlebars) + рендер
- содержит: orderId, состав, контакты, ссылка /orders/[id]
- локальный preview script

---

### T14. Email templates: order-completed (MVP)

**Цель:** письмо после полного выполнения (ваучер/QR если есть).

**Где:** там же.

**DoD:**
- отдельный шаблон
- условные блоки: ваучер/QR (если данные есть)
- unit test на рендер

---

## Блок 4: Каталог и контент

### T15. Каталог: переключатель «карточки / широкие блоки»

**Цель:** grid/list mode + persist.

**Где:** `frontend/src/pages/catalog/*` или `components/catalog/*`.

**DoD:**
- toggle UI
- `localStorage('catalog:viewMode')`
- два layout-компонента, адаптивность

---

### T16. Шаблон «Музеи»: venue detail page (MVP)

**Цель:** детальная страница venue.

**Где:** `frontend/src/pages/venues/[slugOrId].tsx` + API client.

**DoD:**
- hero (фото), title, description
- блок «Инфо»: адрес/карта/время
- CTA «Купить» если есть offer
- skeleton loading

---

### T17. Teplohod.info widgets: справочник (модель + админ UI)

**Цель:** реестр виджетов и привязок.

**Где:** Prisma, admin/widgets страница, backend CRUD.

**DoD:**
- модели `ExternalWidgetProvider`, `ExternalWidget`
- админ: список/поиск/создать/редактировать
- копирование widgetId

---

## Блок 5: Supplier / RBAC

### T18. Supplier: RBAC + self-service drafts (портал)

**Цель:** Supplier создаёт черновики, RBAC защищает.

**Где:** `backend/src/supplier/*`, guards/decorators, `frontend/src/pages/supplier/*`.

**DoD:**
- `@Roles()` + RolesGuard
- SupplierGuard проверяет operatorId на ресурс
- `POST /supplier/events` создаёт draft (status=DRAFT, operatorId, createdBy)
- frontend: список черновиков + форма создания (минимальная)
- аудит: кто создал/обновил

---

## Блок 6: Checkout (новый flow: CheckoutPackage + YooKassa)

### T19. Страница /checkout/[packageId] (каркас + загрузка статуса)

**Цель:** точка входа нового чекаута.

**Где:** `frontend/src/app/checkout/[packageId]/page.tsx`, `frontend/src/lib/api/checkout.ts`.

**DoD:**
- загружает `GET /checkout/package/:id`
- отображает состав, сумму, статус
- polling `getCheckoutStatus`
- ошибка/не найден → fallback UI

---

### T20. Progress bar + пошаговый UX

**Цель:** пошаговый сценарий.

**Шаги:** Проверка состава → Контакты → Оплата → Успех/ошибка.

**Где:** `components/checkout/ProgressBar.tsx`, `components/checkout/Step*.tsx`.

**DoD:**
- прогресс-бар с активным шагом
- Back/Next логика
- состояние в React state (не старая корзина)

---

### T21. Создание пакета из каталога (frontend → POST /checkout/package)

**Цель:** кнопка «Купить» создаёт package.

**Где:** `EventPage.tsx`, `VenuePage.tsx`.

**DoD:**
- нажатие «Купить» → `createPackage(payload)`
- редирект на `/checkout/{packageId}`
- старый flow отключается через FeatureFlag `NEW_CHECKOUT_PACKAGE`

---

### T22. Интеграция YooKassa: старт оплаты

**Цель:** запустить оплату из package.

**Где:** `frontend/src/lib/api/checkout.ts`, backend checkout.

**DoD:**
- POST создаёт платёж, получает confirmation_url
- redirect на YooKassa
- логи содержат packageId

---

### T23. Обработка return URL (success / fail / cancel)

**Цель:** корректный возврат после оплаты.

**Где:** `/checkout/[packageId]` (query parsing).

**DoD:**
- чтение параметров возврата
- запрос `getCheckoutStatus(packageId)`
- UI: PAID → успех, FAILED → ошибка, PENDING → ожидание

---

### T24. Страница /orders/[id] — трекинг заказа

**Цель:** публичная страница статуса.

**Где:** `frontend/src/app/orders/[id]/page.tsx`.

**DoD:**
- статус, состав, контакты
- кнопка «Повторить отправку письма» (если допустимо)
- `GET /orders/:id`

---

### T25. Email при оплате (hook в CheckoutService)

**Цель:** письмо при переходе в PAID.

**Где:** `checkout.service.ts`.

**DoD:**
- при PAID → отправляется order-confirmed
- логируется отправка
- ошибка письма не ломает checkout

---

### T26. (см. Блок 1) Webhook устойчивость

---

## Миграции Prisma (порядок применения)

### M1 — feature_flags

```prisma
model FeatureFlag {
  id        String   @id @default(cuid())
  key       String   @unique
  enabled   Boolean  @default(false)
  rulesJson Json?    // { cityIds?: string[], operatorIds?: string[], ... }
  note      String?
  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())

  @@index([enabled])
  @@index([updatedAt])
}
```

---

### M2 — external_widgets_registry

```prisma
enum ExternalWidgetProviderKind { TEPLOHOD }

model ExternalWidgetProvider {
  id        String   @id @default(cuid())
  kind      ExternalWidgetProviderKind @unique
  name      String
  baseUrl   String?
  isActive  Boolean  @default(true)
  metaJson  Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  widgets   ExternalWidget[]
  @@index([isActive])
}

model ExternalWidget {
  id          String   @id @default(cuid())
  providerId  String
  provider    ExternalWidgetProvider @relation(fields: [providerId], references: [id], onDelete: Cascade)
  externalId  String
  title       String?
  url         String?
  metaJson    Json?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([providerId, externalId])
  @@index([providerId])
  @@index([isActive])
  @@index([updatedAt])
}
```

Опционально в Event: `externalWidgetId`, relation.

---

### M3 — rbac_roles_permissions (условно)

Если RBAC уже в коде — пропустить. Иначе: `role AppRole`, `operatorId` в AdminUser, индексы.

---

### M4 — supplier_self_service_drafts

**Вариант A:** в Event добавить `status EventLifecycleStatus`, `createdById`, `updatedById`, индексы.

**Вариант B:** отдельная `SupplierDraftEvent`.

---

### M5 — audit_log

```prisma
enum AuditAction { CREATE, UPDATE, DELETE, STATUS_CHANGE, PAYMENT_EVENT, WEBHOOK, EMAIL }

model AuditLog {
  id         String      @id @default(cuid())
  action     AuditAction
  entityType String
  entityId   String
  actorType  String?
  actorId    String?
  operatorId String?
  diffJson   Json?
  metaJson   Json?
  createdAt  DateTime @default(now())

  @@index([entityType, entityId])
  @@index([action])
  @@index([operatorId])
  @@index([createdAt])
}
```

---

### M6 — idempotency_keys

```prisma
enum IdempotencyScope { YOOKASSA_WEBHOOK, CHECKOUT_CREATE, EMAIL_SEND, EXTERNAL_CALLBACK }

model IdempotencyKey {
  id        String           @id @default(cuid())
  scope     IdempotencyScope
  key       String
  entityId  String?
  status    String?
  metaJson  Json?
  createdAt DateTime @default(now())
  expiresAt DateTime?

  @@unique([scope, key])
  @@index([expiresAt])
  @@index([entityId])
}
```

---

### M7 — checkout_package_enhancements (условно)

Добавить только недостающие поля: status enum, amount, currency, customerEmail, customerPhone, provider, paymentId, confirmationUrl, индексы.

---

### M8 — order_tracking_public (условно)

Если нужен публичный трекинг по коду — `publicCode` в Order.

---

## Итоговая структура

| Группа | Таски |
|--------|-------|
| Инфраструктура и надёжность | T1–T7, T11–T12, T26 |
| Типизация и техдолг | T8–T10 |
| Email | T13–T14, T25 |
| Каталог и контент | T15–T17 |
| Supplier / RBAC | T18 |
| Checkout | T19–T26 |
