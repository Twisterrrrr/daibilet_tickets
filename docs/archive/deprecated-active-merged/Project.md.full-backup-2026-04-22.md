# Project — Дайбилет (daibilet.ru)

> Последнее обновление: 2026-04-20 (питание как `contentTemplateData.catering`, фасеты лендингов)

## Миссия

Агрегатор билетов на экскурсии, музеи и мероприятия с умным подбором программы поездки. Стартовые города: Москва, Санкт-Петербург, Казань, Калининград, Владимир, Ярославль.

## Конкурентная стратегия

Главный конкурент: [Tripster](https://experience.tripster.ru/) — лидер рынка экскурсий в России.

Прямое соревнование по UX/дизайну нецелесообразно. Побеждаем на трёх полях, где Tripster структурно слаб:

1. **Посадочные страницы** — многоуровневая таксономия (города, регионы, площадки, категории, подкатегории, теги, комбо) даёт десятки уникальных SEO-страниц. У Tripster — плоский каталог (город → экскурсии от гидов).

2. **AI-контент** — масштабируемое создание SEO-статей и описаний с привязкой к реальным данным (цены, наличие, расписание). Формула: AI-каркас + ручная редактура + уникальные фото + перелинковка.

3. **Планировщик туров** — killer feature, отсутствующая у всех конкурентов (Tripster, GetYourGuide, Viator, Sputnik8). Пользователь выбирает город + даты + состав группы → получает готовую программу с билетами.

## Центральные документы

- **Архитектура проекта**: `Project.md` (этот файл).
- **Классификация каталога / publish-gate (category + subcategories)**: `Catalog-Classification-Policy.md`.
- **Taxonomy + SEO Audit (единый слой структуры и качества каталога)**: `SeoAudit-Taxonomy-MasterPlan.md`.
- **Финансы (Buyer + Supplier + Admin)**: `finance.md`.
- **Личный кабинет покупателя / Buyer Account**: `BuyerAccountSpecs.md`.
- **Система доверия поставщикам / Supplier Trust System**: `archive/specs/SupplierTrustSpec.md`.
- **Посадочные страницы и хабы (включая сезонные лендинги)**: `Landings-Architecture.md`.
- **Композиция лендингов (блоки, темы, CITY/MULTI_CITY, SEO audit, публичный renderer)**: `Landing-Composition-System.md`.
- **Паритет узкого гастро-лендинга (эталон Lovable ↔ витрина `/cities/...`)**: `lovable-dinner-cruise-landing-parity.md`.
- **B2B / внешние ticket providers (capability foundation)**: `TicketProviderCapabilityFoundation.md`, матрица: `TicketProviderCapabilityMatrix.md`, подготовка Wave 1 (Radario/Qtickets, env + HTTP): `Wave1-Radario-Qtickets-Prep.md`.
- **Дорожная карта (3 спринта × 2 недели: каталог/редакция → admin-v2/ЛК → поставщик + YooKassa + SEO)**: `Roadmap-3-Sprints-Catalog-Admin-Supplier.md`.
- **Событие + сеансы (продуктовый контракт эпика Event, admin + supplier; Venue как отдельная сущность — в том же файле §6–7):** `Event-Sessions-Product-Contract.md`.
- **Admin V3 (легковесная оболочка поверх текущего backend):** `admin-v3-plan.md`, `admin-v3-routing.md`, `admin-v3-ux.md`, `admin-v3-components.md`.
- **Чат и поддержка (витрина + тикеты + Admin V3):** `Chat-Support.md` — инвентаризация API, UI, inbox-бейджа, пробелов (закрытие диалога, userId в виджете, Telegram-заготовка).
- **Логи (Admin V3, аудит/инциденты):** `Logs.md` — MVP на AuditLog + план расширения (платежи/вебхуки/провайдеры).
- **Каталог: derived sections (5 разделов) и маппинг PRIMARY → section:** `catalog-sections-backend.md`.

Перечисленные выше документы (включая дорожную карту спринтов) образуют «центр тяжести»; остальные спецификации — детализация или архив и должны ссылаться на них при изменениях.

## Venue PDP (template-driven + venue program)

- **Публичный контракт:** `VenueDetail` включает нормализованный `template` (разделы `intro`, `gallery`, `visitInfo`, `collections`, `permanentExposition`, `accessibility`, `amenities`, `faq`, `eventsCopy`), формируемый в `VenueService.buildVenuePublicTemplate`.
- **Пайплайн данных:** `venueTemplateData` (Prisma) -> `parseVenueTemplateData` (`@daibilet/shared`) -> normalized `template.sections` (backend) -> `buildVenueTemplateSections` (frontend helper) -> `VenuePageView`.
- **Fallback-контракт:** template value -> legacy field -> section hidden; это гарантирует отсутствие регрессий для старых venue без template.
- **Блок программы площадки:** используется read-model `GET /venues/:slug/program`; presentation-layer группирует элементы в `featured/current/upcoming` через helper `buildVenueProgramGroups` без изменения domain/read-model.
- **SEO-ready основа:** описание для метаданных venue выбирается через template-aware `buildVenueTemplateSections` с fallback на legacy и существующий `getSeoMeta`.

## Venue geo + Trip routes (эволюция 2026‑04)

- **Инвариант dual-read:** публичные строки **`district` / `metro`** остаются в API как сейчас, но заполняются из справочников (`District` / `MetroStation`) при наличии FK; иначе — fallback на legacy строки в `Venue`.
- **Справочники:** `District` и `MetroStation` уникальны в рамках города (`@@unique([cityId, slug])`); админские CRUD — `GET/POST/PATCH/DELETE` под `/admin/geo/*`.
- **Операторский флаг:** `Venue.isHiddenGem` — витринный бейдж «секретное место» (не влияет на публикацию).
- **Маршруты (нормализованный слой):** `Route` может принадлежать событию (`Route.eventId`, уникально, 1:1 MVP). `RoutePoint` имеет `targetType` (`VENUE` | `EVENT`) и XOR FK на `Venue` или `Event`; порядок — `order`, уникален в рамках `routeId`. Legacy‑связь `Event.routeId` сохранена; при сохранении из карточки события выставляются оба поля. **Админ (событие):** `GET/PUT/DELETE /api/v1/admin/events/:eventId/route` — атомарная замена точек. **Публично:** блок `route` в `GET /api/v1/catalog/events/:slug` только если `Route.isPublished`; точки с неактивными целями отфильтровываются. Старые эндпоинты `/admin/routes/*` / точки по `routeId` остаются для низкоуровневого редактирования.
- **SEO aliases (только 301):** короткие пути `/event/:slug` → `/events/:slug` и `/place/:slug` → `/venues/:slug` в `packages/frontend/next.config.ts` (каноника `/events` и `/venues` не меняется).

## Архитектура

| Слой | Технология | Каталог |
|------|-----------|---------|
| Публичный сайт | Next.js 14+ (App Router), SSR/SSG, TailwindCSS | `packages/frontend` |
| Админ-панель | Vite + React + React Router + Tailwind | `packages/frontend-admin` |
| Backend API | NestJS + TypeScript + Prisma + PostgreSQL + Redis | `packages/backend` |
| Общие типы | TypeScript barrel-файлы | `packages/shared` |
| БД | PostgreSQL 16 (Docker) | — |
| Кэш/очереди | Redis 7 + BullMQ | — |
| Инфраструктура | Docker Compose, Nginx, Certbot, pnpm workspaces | корень |

### Admin V2 и ЛК поставщика V2 — роль в продукте

- **Интерфейс управления, не «перенос legacy»:** V2 — тонкий слой списков, карточек и integration blueprints; параллельно качаются **каталог**, **SEO/лендинги** и **B2B API**.
- **Три слоя смысла:** **ядро** — каталог + API; **growth** — лендинги (в т.ч. topic hub, агрегация нескольких `LandingPage` по slug), маркетинговая зона в админке; **интеграция** — партнёры поверх API.
- **ComboPage:** не переносить в V2 до **единой корзины** — иначе фиксируются две логики (страница программы и checkout); после корзины комбо логичнее как слой поверх одной модели покупки.
- **Контракты UI:** **DetailPage** = `PageHeader + Tabs + Data + States`; **Supplier** — те же UX-паттерны, что у админа, с **RBAC** и другим API. Новые и перерабатываемые экраны **обязаны** опираться на примитивы **`@daibilet/shared-ui`** по мере их появления (admin-v2 и supplier-v2 — композиция, не второй UI-kit).
- **Лендинги и slug:** каноническая пара для публичной витрины — **город + slug** (модель `LandingPage`, публичный контракт в `Landings-Architecture.md`). При агрегации тем по slug нужны осознанные **canonical URL**, редиректы с дублей и правила SEO; уникальность в БД при подключении API — отдельное решение.
- **Осознанный долг:** стандарт DTO и нормализация на клиенте, стратегия кеширования/инвалидации, evolution blueprint из текста в runtime (связь с data fetching, правами и состоянием UI). Детальный пофазный план — внутренний roadmap (`admin_v2_roadmap_*.plan.md` в Cursor).

### Admin V3 — цель и границы (2026‑04)

- **Цель:** быстрый и чистый UI для операционных задач **без** переписывания backend; миграция экранов поштучно (phased migration).
- **Scope на первом этапе:** Events List + Event Detail с акцентом на **классификацию каталога** (5 derived sections + canonical PRIMARY подкатегории) и работу со **смешанными данными** (новые links + legacy enum fallback).
- **Инварианты данных (обязательные):**
  - **Источник истины:** `EventSubcategoryLink` + справочник `Subcategory` (каноника).
  - **Legacy fallback:** `Event.subcategories[]` используется только для чтения старых данных при отсутствии links.
  - **Derived section:** вычисляется **только** через `section-map` по slug PRIMARY подкатегории; для любого события section должен резолвиться через канонику/compat mapping.
  - **UI‑правило:** не предлагать неактивные/legacy подкатегории в выборе, но **показывать** их если они уже стоят у события (read‑only, с пометкой legacy).
- **Событие (операционный стандарт V3, 2026‑04):** список и деталь опираются на обогащённые admin DTO (`readinessSummary`, расписание, минимальная цена, поставщик/площадка). Коммерческий слой в интерфейсе именуется **«Категории и цены»**; данные по-прежнему маппятся из **`EventOffer`** без переименования persistence. Вкладка **«Расписание»** в V3 — **read-only** просмотр слотов (в т.ч. горизонт до 365 дней, остаток мест, `isActive`). См. `docs/Diary.md` за 14.04.2026.
- **Речные / ужины (контентная типизация):** питание и меню не храним в `Event` как «каталожную истину»; вместо этого используем типизированный блок **`EventOverride.contentTemplateData.catering`** (`enabled`, `type`, `includedInPrice`, `menuMarkdown`). Это позволяет делать узкие лендинги (ужины, гастро) без раздувания модели события и без “самолёта” в админке.

#### Settings (Admin V3) — управление системой (scope 2026‑04)

**Ключевая идея:** Settings = управление **поведением системы**, доступами и интеграциями, а не контентом/каталогом.

- **Не входит в Settings:** каталог, контент, операционные сущности (events, tickets, sessions, orders и т.д.).
- **Входит в Settings:**
  - пользователи админки и роли (RBAC),
  - интеграции (Ticketscloud, teplohod.info, будущие провайдеры, webhooks),
  - платежи (провайдер + режимы + ключи),
  - уведомления (каналы + шаблоны),
  - SEO (дефолтные мета, indexability; `baseUrl` берётся из ENV),
  - feature flags,
  - системные лимиты/дефолты.

##### Безопасность и права

- **Правило доступа:** role-based, роли `OWNER | ADMIN | MANAGER`. Мутации Settings — только `OWNER/ADMIN`, а критичные операции (admin users / payments / integrations / rotate secrets) — только `OWNER`.
- **Чувствительные данные:** ключи/секреты должны быть masked при чтении из админки; UI показывает “••••••” + явное действие “заменить”, без возможности прочитать секрет полностью.
- **Rotate secrets:** отдельный endpoint обязателен; чтение полного секрета через API запрещено.
- **Аудит:** audit log нужен, но **не на MVP** (фиксируется как follow‑up).

##### Архитектура хранения

KV (`AppSetting`) используем только для “параметров”:

- `AppSetting { key: String @id, value: Json }`
- доступ в коде через `getSetting('seo.*')`, `getSetting('system.*')`

Сущности с собственным CRUD (например, `AdminUser`, `Integration`, `FeatureFlag`) остаются отдельными таблицами.

##### Модели (целевая схема, MVP‑friendly)

- **RBAC (role‑based)**:
  - `AdminUser { id, email(unique), passwordHash, role: AdminRole, isActive, createdAt, updatedAt }`
  - `AdminRole = OWNER | ADMIN | MANAGER`
- **Integration**:
  - `Integration { id, type, name, isActive, config: Json, createdAt, updatedAt }`
- **Payment settings** (минимально, даже если STUB):
  - `PaymentSettings { provider, isEnabled, config: Json }`
- **Notification settings** (MVP):
  - шаблоны лежат в коде (Git); в БД — только параметры/переключатели
- **SEO settings**:
  - `SeoSettings { defaultTitle, defaultDescription, indexableByDefault }` (`baseUrl` — только ENV)
- **FeatureFlag**:
  - `FeatureFlag { id, key(unique), isEnabled, description?, createdAt }`
- **System settings** (ключевые лимиты/дефолты):
  - `SystemSettings` как тип/shape поверх `AppSetting` (например: `defaultPaginationLimit`, thresholds и т.д.).

##### API (контуры, без фиксации URL вне /api/v1)

Примечание: в проекте REST API канонически живёт под `/api/v1/*`, поэтому admin endpoints должны быть вида `/api/v1/admin/*`.

- **Users (RBAC)**:
  - `GET /api/v1/admin/users`
  - `POST /api/v1/admin/users`
  - `PATCH /api/v1/admin/users/:id`
  - `DELETE /api/v1/admin/users/:id`
  - `POST /api/v1/admin/users/:id/reset-password`
- **Integrations**:
  - `GET /api/v1/admin/integrations`
  - `PATCH /api/v1/admin/integrations/:id`
  - `POST /api/v1/admin/integrations/:id/test`
- **Payments**:
  - `GET /api/v1/admin/settings/payments`
  - `PATCH /api/v1/admin/settings/payments`
- **Feature flags**:
  - `GET /api/v1/admin/feature-flags`
  - `PATCH /api/v1/admin/feature-flags/:key`
- **Settings aggregator (опционально, для ускорения UI)**:
  - `GET /api/v1/admin/settings` → `{ users, integrations, payments, seo, featureFlags, system, notifications }`

##### UI (Admin V3)

Страница `/admin-v3/settings` с внутренним sidebar:

- Пользователи и роли (таблица + actions: edit role, deactivate, reset password)
- Интеграции (карточки: status, masked keys, test connection, sync optional)
- Платежи (выбор провайдера, режим test/live, ключи)
- Уведомления (toggles каналов + параметры; шаблоны в коде)
- SEO (default meta + indexability; baseUrl из ENV)
- Feature Flags (таблица key/status/description)
- Система (формы лимитов/дефолтов + пояснения)

##### Порядок внедрения (phased)

- **Фаза A (база):** users+roles, feature flags.
- **Фаза B (системные):** system settings, SEO settings.
- **Фаза C (интеграции):** integrations, payments.
- **Фаза D (коммуникации):** notifications.

### Supplier Finance (P1–P3.2+)

- **Цель:** прозрачный и воспроизводимый финансовый контур для поставщиков поверх уже существующих заказов/платежей.
- **P1 — Reports & Documents:** над `SupplierLedgerEntry` построены агрегированные отчёты `SupplierReport`/`SupplierReportLine` и документы `SupplierDocument`/`SupplierDocumentFile`; отчёт генерируется сервисом расчёта, документ — сервисом рендеринга (stub‑HTML вместо PDF), есть seed‑сценарий «оператор → продажи → леджер → отчёт → документ».
- **P2 — Disputes, Reconciliation, Summary:** добавлены споры по отчётам (`SupplierDispute` + admin/supplier API), флаг `hasConflict` и сверка отчёта с леджером (`SupplierReconciliationService`), блокировка выплат флагом `isBlockedByDispute` в `SupplierPayoutRequest`, а также `/supplier/finance/summary` для дашборда «Где мои деньги?» в кабинете поставщика.
- **P3 — Legal profile & bank snapshot:** реализован снимок юридического профиля поставщика (`SupplierLegalProfile`) и его банковских реквизитов (`SupplierBankAccount`) в отчётах (`SupplierReport.legalProfileSnapshot`) и payout‑заявках (`SupplierPayoutRequest.bankAccountSnapshot`); любые юридически значимые операции опираются на эти snapshot’ы, а не на «живой» профиль.
- **P3.1 — Tax & VAT Layer:** поверх snapshot‑логики введён декларативный налоговый слой (`TaxMode`, `isVatPayer`, `defaultVatRate`, `TAX_MATRIX`), расчёт НДС выполняется в слое отчётов/документов без усложнения леджера; введён `DocumentNumberService` и стратегия мягкого включения НДС (quiet numbering → shadow VAT payload → VAT‑шаблоны).
- **Печатные финдокументы (HTML/PDF):** единый pipeline — `finance-document-templates.ts` (в т.ч. структура ПП № 1137 для УПД/счёт-фактуры), неизменяемые формулировки в `finance-document-form-boilerplate.ts`, `finance-print-styles.ts` + `injectPrintCss`, PDF через Puppeteer (`FinanceHtmlPdfService`), валидация реквизитов `finance-document-validation.ts`. Статические образцы: `docs/finance-print-samples/` (пересборка `pnpm run finance:print-samples` из `packages/backend`). Dev: demo seed и `GET /api/v1/admin/dev/finance-documents-demo` для проверки путей.
- **Settlement Foundation (Stage 1, manual-first):** добавлен базовый lifecycle `SupplierSettlement` (calculate/approve/finalize/markPaid), policy-resolver для набора документов по настройкам поставщика (`generateInvoiceDocuments`, `closingDocumentMode`) и ручной issue-flow без очередей/auto-EDO.
- **P3.2+ — Payments & Clearing / pspFeeMode:** настройки платежей оператора (`paymentMode`, `agentSchemeEnabled`, `splitEnabled`, `pspFeeMode`) зафиксированы в `Operator` и передаются в PaymentContext/метаданные YooKassa; база для будущего разделения PSP‑комиссии по режимам `pspFeeMode` без изменения текущей экономики.
- **Acceptance Flow & Chargebacks:** отчёты поддерживают явный акцепт поставщиком (`supplierAcceptedAt`, `acceptedBySupplierUserId`, `metaJson.history`), который блокируется при открытом споре; добавлены типы `CHARGEBACK_ADJUSTMENT` и `FEE_RECHARGE` для будущих корректировок и PSP‑fee, документ‑шаблоны версионируются без перезаписи существующих документов.

### Buyer Account (Личный кабинет покупателя)

- **Цель:** единая точка входа для заказов, билетов и профиля пользователя.
- **Backend:** модуль `AccountModule` (`AccountController`, `AccountService`, `PurchaseReadService`, `TicketCapabilityService`):
  - `/account/me` — сводка ЛК (пользователь, количество заказов, активных билетов, избранное).
  - `/account/purchases` — read‑model `PurchaseListItemDto` на базе `CheckoutSession` + `PaymentIntent` + `FulfillmentItem` + artifact‑layer.
  - `/account/orders`, `/account/orders/:id` — список и деталь заказов с проверкой ownership по `userId`.
  - `/account/tickets` — плоский список билетов (`AccountTicketItemDto`) по оплаченным сессиям.
- **Read‑model и artifact‑layer:** `PurchaseReadService.mapSessionToPurchase` агрегирует сессию, платёж и fulfilment в DTO:
  - тип карточки и статус вычисляются через `getPurchaseDisplayType`,
  - доступные действия — через `derivePurchaseActions`,
  - наличие «артефакта билета» (что реально можно открыть) нормализуется helper’ом `computeTicketAvailable` и сервисом `TicketCapabilityService.getTicketCapability`, который собирает артефакты билета/ваучера поверх CheckoutSession/fulfillment.
- **Тесты:** unit‑тесты для capability‑слоя (`purchase-display.util`, `ticket-capability.service`, `purchase-read.service`) и mini-e2e для `/account/purchases`, `/account/orders`, `/account/orders/:id` (в т.ч. Forbidden), `/account/tickets`, `/checkout/track/:shortCode`.

### Orders: Order mirror layer (bridge/read‑model, 2026‑04)

- **Цель:** добавить плоскую унифицированную модель продаж `Order` (internal + external) как **read‑model**, не заменяя `CheckoutSession`/`PaymentIntent`/`FulfillmentItem`.
- **Принципы:** idempotent проекции; ошибки проекции не ломают core flow (try/catch + log only); минимальный дифф к существующей архитектуре.
- **Схема (Prisma):** `Order` + enums `OrderSource` / `OrderStatus` / `OrderIngestionSource` + поля bridge (`checkoutSessionId`, `paymentIntentId`, `packageId`) и `sourcePayload` для трассировки.
- **Ingestion hooks (MVP):**
  - `CheckoutService.createCheckoutSession` → `OrderProjectionService.projectFromCheckoutSession(sessionId)` (PENDING/initial).
  - YooKassa `payment.succeeded` (через `FulfillmentProcessor` после `markPaid`) → `projectFromCheckoutSession(sessionId)` (PAID transition).
  - TicketsCloud mirror sync (`TcOrdersMirrorSyncService`) → `upsertFromTcMirror(...)` (external projection).
- **Repair path:** CLI `scripts/rebuild-orders-from-checkout.ts` для best‑effort пересборки проекции по `CheckoutSession`.

## Интеграции

- **Ticketscloud gRPC (tc-simple)** — каталог событий (MetaEvent-based синхронизация)
- **Ticketscloud REST v2** — создание заказов, управление бронированиями
- **Ticketscloud Widget (JS)** — покупка билетов на фронтенде (JWT-токен)
- **teplohod.info API v1** — каталог речных прогулок (55 событий, ~2000 сессий с реальным расписанием)
- **YooKassa** — оплата бандлов/программ + Split Payment для маркетплейса (запланировано)
- **SMTP** — транзакционные email (@nestjs-modules/mailer + Handlebars)
- **Partner B2B API** — machine-to-machine API для внешних поставщиков (API-ключи, webhook-уведомления)

Для Ticketscloud gRPC добавлены вспомогательные публичные эндпоинты наблюдаемости/отладки:

- `GET /api/v1/catalog/tc-health` — быстрый health-check gRPC-клиента (tc-simple). Возвращает `{ status, mode }`, без побочных эффектов.
- `GET /api/v1/catalog/tc-sync-test` — ручной запуск `TcSyncService.syncAll()` для dev/staging (полная синхронизация TC через gRPC/REST, в зависимости от `TC_SYNC_MODE` и готовности клиента).

## Preview-ссылки (черновики событий и площадок)

- **Цель**: дать редакторам и поставщикам безопасный предпросмотр страниц события/площадки с реальным UI, без публикации в каталоге и индексации.
- **Backend**:
  - HMAC-токены предпросмотра (`PreviewService`): тип (`EVENT`/`VENUE`), `id`, `iat`, `exp` (TTL по умолчанию 30 минут).
  - Эндпоинты:
    - `GET /api/v1/preview/events/:id?token=...` — возвращает `EventDetailFrontend` для черновика события.
    - `GET /api/v1/preview/venues/:id?token=...` — возвращает `VenueDetail` для черновика площадки.
  - Защита: токен подписан HMAC, проверяется тип и `id`, истечение по времени, `Cache-Control: no-store`.
- **Frontend (Next.js)**:
  - Публичные страницы используют shared view-компоненты:
    - `app/events/[slug]/page.tsx` → `EventPageView` (`components/events/EventPageView.tsx`).
    - `app/venues/[slug]/page.tsx` → `VenuePageView` (`components/venue/VenuePageView.tsx`).
  - Preview-страницы повторно используют тот же UI:
    - `app/preview/events/[id]/page.tsx`:
      - читает `id` и `token` из URL;
      - грузит `api.getEventPreview(id, token)` (через backend `/preview/events/:id`);
      - рендерит `<EventPageView event={event} mode="preview" />`.
    - `app/preview/venues/[id]/page.tsx`:
      - грузит `api.getVenuePreview(id, token)`;
      - рендерит `<VenuePageView venue={venue} mode="preview" />`.
  - **PreviewBanner**:
    - Компонент `components/preview/PreviewBanner.tsx` рендерится поверх страницы:
      - текст по умолчанию: «Черновик · предпросмотр · Ссылка действует 30 минут»;
      - если передан `publicUrl`, показывает кнопку «Открыть публичную», ведущую на `/events/{slug}` или `/venues/{slug}` (если объект уже опубликован).
  - SEO: метаданные preview-страниц устанавливают `robots: { index: false, follow: false }`, чтобы ссылки не индексировались.


## Статические изображения и витрины городов

- **Статичные картинки городов**: единый конфиг `CITY_IMAGES` (`packages/frontend/src/lib/cityImages.ts`) описывает hero- и card-картинки для каждого города (slug → пути в `public/assets/images/...` + источник, автор, лицензия, blur placeholder).
- **Хранение файлов**: все оптимизированные изображения лежат в `packages/frontend/public/assets/images`, структура:
  - `/assets/images/hero/hero-main.webp` — главный hero для `/` (3200×1800, ≤400 KB).
  - `/assets/images/cities/{slug}/hero.webp` — фон hero-блока страницы города (3000×1700, ≤350 KB).
  - `/assets/images/cities/{slug}/card.webp` — картинка карточки города на `/cities` и в блоке «Города» на главной (1600×900, ≤200 KB).
- **Метаданные и отчёт**:
  - `/assets/images/images.json` — технический JSON для пайплайна (пути, источник, автор, лицензия, URL страницы/скачивания, локальные пути исходников, blurDataUrl).
  - `docs/image-assets-report.md` — авто‑отчёт по фактическим размерам и весу файлов (генерируется скриптом).
- **Пайплайн кандидатов и оптимизации**:
  - Скрипт `scripts/image-candidates.mjs` (Node 20+ fetch, без npm-зависимостей) собирает стоковые кандидаты по городам из Pexels/Unsplash/Pixabay, сохраняет их в `packages/frontend/assets-src/**/candidates` и пишет `candidates.json` с метаданными (source, author, license, pageUrl, downloadUrl, width, height, query).
  - Хелпер `scripts/select-image.mjs` копирует выбранные кандидаты в `.../selected/hero-original.jpg` / `card-original.jpg` и автоматически обновляет `images.json` (localHeroSourcePath/localCardSourcePath + метаданные).
  - Скрипт `scripts/image-assets.mjs` (Node + ImageMagick `magick`) читает `images.json`, ресайзит исходники из `assets-src` в WEBP под целевые размеры слотов (homepage hero, city hero, city card, og), генерирует blur placeholders и валидирует веса, после чего обновляет JSON и отчёт.
  - Фронтенд использует только статичные пути (`CITY_IMAGES`), контракты API не меняются (backend продолжает отдавать `city.heroImage`, но фронт приоритетно берёт оптимизированные локальные файлы).
- **Процесс для контент-редакторов**:
  1. `pnpm images:candidates` — собрать кандидатов по всем городам (исходники не попадают в прод, лежат в `packages/frontend/assets-src` и не коммитятся).
  2. Вручную просмотреть `.../candidates` и выбрать лучшие файлы (по hero/card) либо вызвать `node scripts/select-image.mjs --city=slug --hero=01__...jpg --card=02__...jpg` (для главной: `--homepageHero=...`).
  3. Убедиться, что `public/assets/images/images.json` содержит корректные пути/метаданные.
  4. Запустить `pnpm images:build` (ImageMagick `magick` должен быть в PATH) — будут сгенерированы/обновлены WEBP-файлы, blur placeholders и `docs/image-assets-report.md`.

## Модель данных (ключевые сущности)

- **City** — город с SEO-полями, featured-флагом
- **Event** — каноническое мероприятие (title, slug, category, subcategory, rating, город). Поле `canonicalOfId` для дедупликации (self-relation).
  - **EventCategory** — enum: `EXCURSION` (экскурсии), `MUSEUM` (музеи), `EVENT` (мероприятия), `KIDS` (детям).
  - **EventSubcategory** — enum подкатегорий, сгруппированных по категории:
    - EXCURSION: `RIVER`, `WALKING`, `BUS`, `COMBINED`, `QUEST`, `GASTRO`, `ROOFTOP`
    - MUSEUM: `MUSEUM_CLASSIC`, `EXHIBITION`, `GALLERY`, `PALACE`, `PARK`
    - EVENT: `CONCERT`, `SHOW`, `STANDUP`, `THEATER`, `SPORT`, `FESTIVAL`, `MASTERCLASS`, `PARTY`
    - KIDS: `KIDS_SHOW`, `KIDS_EXCURSION`, `KIDS_MASTER`, `KIDS_MUSEUM`, `KIDS_QUEST`, `KIDS_AMUSEMENT`
  - `Event.subcategory` — `EventSubcategory?` (опционально).
- **EventOverride** — правки админа поверх sync-данных (title, description, imageUrl, isHidden, manualRating, tagsAdd/Remove, **category**, **subcategories**).  
  **Заголовок**: `Event.title` — оригинал из источника (TC, Teplohod), обновляется при каждом sync. `EventOverride.title` — кастомный заголовок для Daibilet. Для отображения используется override ?? event.title. Оригинал сохраняется в `Event.title` для импорта/экспорта и виджетов.  
  **Подкатегории**:  
  - `subcategoriesMode: SubcategoriesMode` — enum `INHERIT | OVERRIDE | CLEAR` с default = `INHERIT`;  
  - `subcategoriesOverride: EventSubcategory[]` — явный список подкатегорий для режима `OVERRIDE`;  
  - итоговый список подкатегорий вычисляется в backend через `resolveSubcategories(event.subcategories, subcategoriesMode, subcategoriesOverride)` и всегда является **жёстким override без merge**:  
    - INHERIT → берем подкатегории события (`Event.subcategories`),  
    - OVERRIDE → используем только `subcategoriesOverride`,  
    - CLEAR → пустой массив.
- **EventOffer** — оффер из конкретного источника (TC/TEPLOHOD/RADARIO/TIMEPAD/MANUAL). Содержит: source, purchaseType (TC_WIDGET/REDIRECT/API_CHECKOUT), externalEventId, deeplink, priceFrom, commission, status (ACTIVE/HIDDEN/DISABLED), isPrimary.
- **EventSession** — конкретный сеанс (дата, свободные места, цены). Привязан к Event и к EventOffer (offerId). Для teplohod.info — реальное расписание из `eventTimes` API (дата, время отправления, кол-во свободных мест).
- **Tag** — теги для фильтрации и группировки (тема, аудитория, сезон)
- **LandingPage** — SEO-подборка по тегу/фильтрам
- **ComboPage** — готовая программа с курированными событиями
- **PromoBlock** (планируется) — карточки на главной («Масленица», «Зимний город» и др.). Сейчас захардкожены в `PromoBlock.tsx`; планируется модель + раздел админки «Промо-блоки».
- **Article** — SEO-статья с перелинковкой

### Эволюция связей контента (2026‑04)

Контентные связи исторически были реализованы как строки/массивы без ссылочной целостности (slug/UUID):

- `Article.relatedLandingIds`, `Article.relatedCollectionIds` — `UUID[]` без FK.
- `LandingPage.filterTag` — `string` (slug) без FK на `Tag`.
- `Collection.filterTags` — `string[]` (slug’и) без FK.

Для поддержки консистентности, управления порядком и дальнейшей миграции введён **параллельный FK/join слой** (без удаления legacy полей на первом этапе):

- **`ArticleLandingLink`** и **`ArticleCollectionLink`** — M2M link‑таблицы с `position/priority`.
- **`LandingPage.filterTagId?`** — FK на `Tag` (параллельно legacy `filterTag`).
- **`CollectionTagFilter`** — M2M link‑таблица `Collection ↔ Tag` с `position/priority` (параллельно legacy `filterTags`).

Правило чтения (MVP): **dual‑read** — сначала FK/join, затем fallback на legacy; запись — эволюционно (dual‑write там, где нужно для совместимости).
- **Package** — заказ (Trip Planner)
- **Voucher** — публичный ваучер пакета (`shortCode`, `publicUrl`, `pdfUrl?`) с PDF-представлением:
  - `GET /api/v1/vouchers/:shortCode/pdf` — on-demand генерация A4 PDF через Puppeteer;
  - HTML шаблон: `packages/backend/src/voucher/templates/default-ticket.template.html`;
  - сервис генерации: `TicketPdfService` (`packages/backend/src/voucher/ticket-pdf.service.ts`);
  - mapper доменных данных: `mapVoucherToTicketPdfData` (`packages/backend/src/voucher/mappers/voucher-to-ticket-pdf.mapper.ts`).
- **Review** — отзыв на событие/оператора. Поля: rating (1-5), text, authorName, authorEmail (скрыт), isVerified, voucherCode, verifyToken, helpfulCount, status (PENDING_EMAIL/PENDING/APPROVED/REJECTED/HIDDEN), adminComment, supplierId (snapshot), publishedAt. Unique: authorEmail + eventId.
  - **ReviewPhoto** — до 5 фото (url, thumbUrl, filename). WebP, 1200px + thumb 300px.
  - **ReviewVote** — голоса "Полезный отзыв" (ipHash SHA-256, isHelpful). Unique: reviewId + ipHash.
  - **ReviewSupplierResponse** — ответ поставщика. Статусы: DRAFT → PENDING_MODERATION → APPROVED/REJECTED. Модерация админом.
  - **ReviewDispute** — оспаривание отзыва (reasonCode: FALSE_FACTS/OFF_TOPIC/ABUSIVE). Один активный dispute на отзыв. Статусы: MODERATOR_REVIEW → RESOLVED_KEEP/RESOLVED_HIDE/RESOLVED_DELETE.
  - **ReviewDisputeEvidence** — доказательства (jpg/png/pdf, до 25 МБ, до 5 файлов).
  - **ReviewActionLog** — лог действий (actorType, actionType).
- Отзывы для TC/TEPLOHOD отключены (`ReviewCapabilityService.canAcceptReviews`). Подробно: `docs/ReviewModuleSpec.md`, `docs/archive/ReviewModuleAudit.md`.
- **ExternalReview** — импортированные отзывы с внешних площадок (Яндекс.Карты, 2ГИС, Tripadvisor, Google). Поля: source, sourceUrl, authorName, rating, text, publishedAt. Участвует в recalculateEventRating.
- **ReviewRequest** — пост-покупочный запрос на отзыв (email, eventId, token, sentAt, reminderSentAt, openedAt, clickedAt, reviewId). Unique: email + eventId.
- **Event.externalRating/externalReviewCount/externalSource** — ручной импорт рейтинга из внешних платформ. Участвует в расчёте итогового rating через взвешенное среднее (вместе с Review и ExternalReview).
- **CheckoutSession** — сессия оформления заказа (snapshot корзины, контакт, UTM, статусы через State Machine). Immutable `offersSnapshot` с write-once guard. Опционально `giftCertificateSnapshot` — для подарочных сертификатов.
- **GiftCertificate** — подарочный сертификат (номинал, код GC-XXXX-XXXX, email получателя, сообщение). Создаётся при успешной оплате, статусы ISSUED/ACTIVATED/EXPIRED.
- **OrderRequest** — заявка на подтверждение (SLA/TTL, expireReason, confirmedAt). Привязана к CheckoutSession.
- **PaymentIntent** — платёжное намерение (PENDING/PROCESSING/PAID/FAILED/CANCELLED/REFUNDED). Привязка к CheckoutSession, idempotencyKey, provider (STUB/YOOKASSA). Split-поля для маркетплейса: supplierId, grossAmount, platformFee, supplierAmount, commissionRate.
- **FulfillmentItem** — исполнение позиции checkout (per line item): статусы включая **REFUND_PENDING** (заявка на возврат) и **REFUNDED**; поле **isRedeemed** для OPEN_DATE (eligibility возврата). Существующий **RefundService** — компенсации/полный refund по PaymentIntent; отдельный контур **RefundRequest** + **FulfillmentRefundRequestService** — MVP возврат по одной позиции (админ API `POST /admin/refunds`, `POST /admin/refunds/:id/process`, опционально approve/reject). Учёт «продано» по сессии для виджета/статистики: **CONFIRMED** и **REFUND_PENDING** считаются занятыми местами; при **COMPLETED** заявки — позиция → REFUNDED, **availableTickets** сеанса увеличивается (если в snapshot есть sessionId). См. `refund-eligibility.ts`, миграция `20260405143000_fulfillment_refund_requests`.
- **RefundRequest** — заявка на возврат одной позиции (FK на FulfillmentItem и PAID PaymentIntent), статусы CREATED→…→COMPLETED/FAILED, причина enum (USER_REQUEST, …). Идемпотентность проведения: `Idempotence-Key` YooKassa `refund:fulfillment-request:{id}`; STUB — без внешнего вызова.
- **Operator** — юридическое лицо/правообладатель. Поля маркетплейса: isSupplier, trustLevel, commissionRate, status (ACTIVE/ARCHIVED/SUSPENDED), trustScore + разложение по блокам доверия (profile/catalog/operations/reputation/stability/penalties), флаги ручного override. Подробно: § Архитектура Supplier ниже.
- **SupplierUser** — аккаунт поставщика (Operator 1—N SupplierUser). Роли: OWNER, MANAGER, CONTENT, ACCOUNTANT.

### Операционные режимы поставщика (политика платформы)

- **Мягкое отключение (sales OFF):** `Operator.isActive = false`.
  - Поставщик и его контент **не удаляются**.
  - Страницы событий **не превращаются в 404** (контент остаётся доступен по прямой ссылке).
  - Покупка отключается: публичный read-path **не отдаёт offers**, а checkout **запрещает** создание новых заказов.
  - Уже купленные билеты и заказы остаются валидными.
- **Заморозка обмена (exchange frozen):** `Operator.status = SUSPENDED`.
  - Используется, когда нужно остановить обмен данными (B2B Partner API) без удаления поставщика.
  - Может применяться отдельно от `isActive`.
- **User** — пользователь сайта (регистрация/вход). Избранное в UserFavorite (eventSlug).
- **ApiKey** — API-ключ для Partner B2B API: SHA-256 хеш (не храним оригинал), prefix (8 символов для UI), rateLimit, ipWhitelist, expiresAt.
- **Venue** — место (музей, галерея, арт-пространство, а также точки общепита как отдельные типы). `VenueType` расширен значениями **RESTAURANT/CAFE/BAR/FASTFOOD** (помимо MUSEUM/GALLERY/ART_SPACE/EXHIBITION_HALL/THEATER/PALACE/PARK). Содержит: openingHours (JSON), priceFrom, rating, galleryUrls, address/**metro**/lat/lng (legacy-строки), опциональные FK **`districtId`/`metroStationId`** на справочники, **`isHiddenGem`**, operatorId (партнёр), опционально **venueTemplateData** (JSON контента PDP из админки). Soft delete, optimistic lock.
  - **Публичный PDP (template MVP):** ответ детальной площадки (`GET /api/v1/venues/:slug`, preview по id) дополняется нормализованным полем **`template`** типа `VenuePublicTemplate` в `VenueDetail` (`@daibilet/shared`): `parseVenueTemplateData` + маппинг в секции (`intro`, `gallery`, `visitInfo`, `collections`, `permanentExposition`, `accessibility`, `faq`, `eventsCopy`). Для типов **MUSEUM**, **ART_SPACE**, **GALLERY** включён template-aware рендер на витрине с fallback на legacy-поля; остальные типы — legacy-only, если template не задан. Реализация: `VenueService.buildVenuePublicDto`, фронт `buildVenueTemplateSections` + `VenuePageView`, meta description в `app/venues/[slug]/page.tsx`. Тесты контракта: `packages/backend/src/venue/__tests__/venue-template-public.contract.spec.ts`.
- **Subcategory** — новый универсальный справочник подкатегорий (`SubcategoryType`: `UNIVERSAL | EVENT_ONLY | VENUE_ONLY`) с иерархией до 2 уровней через `parentId` и флагами `isActive`/`isLandingEnabled`; используется M:N связями:
  - `EventSubcategoryLink` (`eventId`, `subcategoryId`);
  - `VenueSubcategoryLink` (`venueId`, `subcategoryId`).
- **Контракт чтения/записи subcategories (обязательный):**
  - **Источник истины**: `EventSubcategoryLink` / `VenueSubcategoryLink` + справочник `Subcategory`.
  - **Legacy fallback (временный)**: при чтении `Event`, если нет ни одной записи в `EventSubcategoryLink`, допускается fallback к `Event.subcategories` (enum-массив) для обратной совместимости.
  - **Запись**: новые данные пишутся только в link-таблицы; редактирование legacy-поля из UI не допускается.
  - **Правила дерева**: максимальная глубина `root + child` (2 уровня), циклы запрещены, `slug` глобально уникален.
  - **Совместимость типов parent-child**: `UNIVERSAL` может быть родителем для любых типов; для специализированных родителей (`EVENT_ONLY`, `VENUE_ONLY`) тип ребёнка должен совпадать с типом родителя.
  - **Удаление**: базовый сценарий — soft deprecate через `isActive=false`; физическое удаление подкатегорий допускается только для ошибочных/мусорных записей.

> Примечание по совместимости: `EventSubcategory` (enum) остаётся как **legacy‑слой** для старых данных и части override‑логики, но целевая модель классификации и модерации в админке — **links-first**.
- **Collections Engine + SEO по подкатегории (MVP):** автоматические подборки событий и площадок по `Subcategory.code`, без второго классификатора. Публичные **авто**-SEO-страницы (`landingMode = AUTO`) строятся только при `isLandingEnabled` **и** достаточном количестве элементов (env-пороги); выдача событий для лендинга идёт **только** через тот же отбор, что и у подборки (`CatalogService.getEvents`). Режим **`TOPIC_HUB`** + `landingTopicKey` привязывает таксономию к уже существующему тематическому хабу (без дублирующего generic-URL). **Routing policy:** сегмент `/cities/{city}/{slug}` — зарезервированное пространство; **материализованный** `LandingPage` имеет **более высокий приоритет**, чем автогенерация по подкатегории; канонический whitelist и иерархия — `prisma/seeds/subcategories-canonical.seed.ts`. См. `docs/Architecture.md` §3.4–3.4.1.
- **Event расширен**: venueId (FK к Venue), dateMode (SCHEDULED/OPEN_DATE), isPermanent, endDate. Шаблоны страниц — `docs/Reference.md` § PageTemplateSpecs.
- **EventOffer расширен**: venueId для прямых офферов к месту (без привязки к Event).
- **District** — район внутри города (FK `cityId`, `name/slug`, уникальность `(cityId, slug)`).
- **MetroStation** — станция метро внутри города (FK `cityId`, `name/slug`, опционально `lineName/lineColor`, уникальность `(cityId, slug)`).
- **Location** — причал, площадка, точка встречи (каркас, Фаза 2)
- **Route** — маршрут (POI/hub контент); детализация точек — **`RoutePoint`** (порядок `order`, XOR `venueId`/`eventId`).

### Классификация при синхронизации

При синхронизации (TC gRPC, Teplohod) используется улучшенный ключевой классификатор: по заголовку и описанию автоматически назначаются **category** и **subcategory**. Порядок проверки важен: маркеры EVENT проверяются **до** EXCURSION, чтобы избежать ложных срабатываний (например, «tribute tour», «мастер-класс» в названии концерта не должны уходить в экскурсии). Категория KIDS проверяется первой (например, «детский спектакль» → KIDS, а не EVENT).

## Supplier Trust System (MVP)

- **Цель:** прозрачная, но лёгкая для объяснения система доверия к поставщикам (Operator) с влиянием на лимиты и приоритеты модерации.
- **Trust Score (0–100)**: внутренний числовой балл, собираемый из пяти блоков:
  - Profile (до 20): заполненность профиля, контакты, юр. данные, сайт/политика возвратов.
  - Catalog (до 25): качество витринных карточек (фото, описание, расписание, цена), доля отклонённых событий.
  - Operations (до 25): доля возвратов, частота отклонений на модерации, висящие черновики.
  - Reputation (до 15): средний рейтинг отзывов, доля негативных.
  - Stability (до 15): возраст оператора, наличие успешных продаж.
  - Penalties: штрафы за высокий refund rate и частые отклонения.
- **Trust Levels (0–3)**:
  - 0 — Новый
  - 1 — Базовый
  - 2 — Проверенный
  - 3 — Надёжный
- **Лимиты активных событий** (Operator → Event.isActive=true + APPROVED/AUTO_APPROVED):
  - Уровень 0: до 5 активных событий.
  - Уровень 1: до 10 активных событий.
  - Уровень 2: до 25 активных событий.
  - Уровень 3: до 50 активных событий.
- **Применение лимитов:**
  - Partner API: при автоодобрении MANUAL-событий (trustLevel ≥ 1) перед установкой isActive=true вызывается `SupplierTrustService.assertSupplierCanActivateEvent`.
  - Admin модерация: `POST /admin/moderation/:id/approve` проверяет лимит перед переводом события в APPROVED + isActive=true.
  - Supplier Dashboard: `/supplier/dashboard` возвращает `trust.activeEventsCount` и `trust.activeEventsLimit` для отображения в кабинете поставщика.
- **Пересчёт и сглаживание:**
  - `SupplierTrustService.recalculateSupplierTrust`:
    - читает свежие сигналы (оператор, события, платежи, отзывы),
    - считает свежий breakdown,
    - смешивает с предыдущим score (экспоненциальное сглаживание + ограничение дельты за один шаг),
    - обновляет поля `trustScore`, `trustLevel`, breakdown-колонки и `trustLastCalculatedAt`.
  - Ночной job `SupplierTrustJob` (cron 03:00) проходит по всем `Operator.isSupplier=true` и пересчитывает уровни.
- **Ручной override (MVP каркас):**
  - Схема содержит `trustManualOverrideLevel`, `trustManualOverrideScore`, `trustManualReason`, `trustManualExpiresAt`.
  - При активном override (level задан и не истёк) итоговый level фиксируется в этом значении, даже если auto-score ниже.
  - Admin UI сейчас позволяет явно задавать `trustLevel` и видеть текущий breakdown/override; полноценный CRUD для полей override планируется отдельной фазой.

## Соглашения

- REST API: `/api/v1`
- Observability: `docs/Reference.md` §2 — requestId, PII masking. Catalog cache metrics: GET /admin/ops/metrics (hits, misses, hitRate). Admin ops: flush по namespace, resync с прогрессом — см. [AdminSystem.md](AdminSystem.md).
- Цены в копейках (целое число)
- Даты — ISO 8601, UTC в БД, локальные при отображении
- Slug — транслитерация кириллицы
- UUID v4 для всех первичных ключей
- Коммиты: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`

## FULL SYNC и ежедневная синхронизация каталога

- **Назначение**: принудительно пересинхронизировать все внешние источники каталога (Ticketscloud + teplohod.info), пересчитать теги и сбросить кэш, чтобы витрина и админка видели актуальные данные. В боевых окружениях поверх разового FULL SYNC **всегда** работает регулярная фоновая синхронизация (cron), чтобы актуальность расписания и посадочных не зависела от ручных действий.
- **Entry point**: CLI в backend.
  - Скрипт: `packages/backend/scripts/full-sync.ts`
  - Команда из корня монорепо:
    - `FULL_SYNC=1 pnpm full:sync`
- **Требования и защита**:
  - Backend dev-сервер должен быть запущен (`pnpm dev:backend`, по умолчанию слушает `http://127.0.0.1:4000`).
  - Обязателен флаг окружения `FULL_SYNC=1` — без него скрипт немедленно завершится с ошибкой (защита от случайного запуска).
- **Что делает FULL SYNC**:
  - Делает HTTP‑запрос `POST /api/v1/catalog/sync/all` к backend API.
  - Внутри backend `SyncProcessor` (BullMQ worker) запускает комбинированную синхронизацию:
    - Полный sync Ticketscloud (`TcSyncService.syncAll`): города, площадки, события, офферы, сеансы, retag.
    - Полный sync teplohod.info (`TepSyncService.syncAll`): города, события, офферы, реальное расписание сеансов или виртуальные fallback‑сессии.
    - Дополнительный `retagAll` для унификации тегов по обоим источникам.
    - Smart populate комбо-страниц (`ComboService.populateAll`).
    - Materialize лендингов (`LandingMaterializerService.materialize`) — включение/выключение посадочных по фактическому наличию живых событий и порогам `minEvents`.
    - Инвалидация кэша каталога (`CacheService.invalidateAfterSync`).
  - В stdout выводится JSON‑summary по источникам (кол-во событий/сеансов, новые города, ошибки) и агрегированный результат materialize.
- **Идемпотентность**:
  - Все sync‑слои используют upsert по стабильным ключам (`source + tcEventId / externalEventId`, `tcSessionId` и др.), поэтому повторный FULL SYNC не плодит дубли и только актуализирует данные.
  - Soft‑delete и publish‑gate‑состояния (`isActive`/`isDeleted`, `EventOverride`, `offers.status`) при этом не ломаются — синк следует существующей бизнес‑логике.

### Ежедневная синхронизация (cron, боевые окружения)

- **Цель:** гарантировать, что расписание (`EventSession`), теги и посадочные (лендинги/подборки) автоматически обновляются без ручного запуска FULL SYNC.
- **Реализация:** модуль `SchedulerModule` и `SchedulerService` в backend:
  - `@Cron('0 0 0,6,12,18 * * *')` — каждые 6 часов ставится задача `sync-full` в очередь BullMQ (`QUEUE_SYNC`) с overlap‑защитой по `jobId`. Обработчик — `SyncProcessor.handleFullSync` (TC + TEP + retag + combo + materialize + cache).
  - `@Cron('0 30 * * * *')` — инкрементальная синхронизация Ticketscloud (`sync-incremental`) каждые 30 минут вне окон full sync: `TcSyncService.syncAll` + очередь постредакции + инвалидация кэша.
  - `@Cron('0 0 3 * * *')` — ежедневная дедупликация (`TcSyncService.deduplicateExisting` + `FuzzyDedupService.findDuplicates` в dry‑run) и ретеншн старых сессий/логов (`RetentionService.run`).
- **Инвариант Ops:** на staging/prod cron‑задачи SchedulerService считаются **обязательным фоном**:
  - при инцидентах с пустым расписанием/посадочными первым делом проверяются логи `SchedulerService` и состояние очереди `QUEUE_SYNC`;
  - ручной FULL SYNC используется как аварийная операция, но не заменяет постоянные cron‑тикеры.

### Каталог событий — режимы ответа и производительность

- `/api/v1/events` — основной endpoint каталога событий.
- Поддерживает параметр `fields`:
  - `fields=card` — лёгкая карточка события для листингов (главная, `/events`, «похожие»):
    - Prisma `select` только по необходимым полям (`id`, `slug`, `title`, `category`, `subcategories`, `audience`, `imageUrl`, `priceFrom`, `rating`, `reviewCount`, `city.slug/name`, `venue.title/shortTitle`, ближайшие `sessions`, теги).
    - Не возвращает тяжёлые JSON-поля (`tcData`, embed-конфиги, полные офферы/сессии).
    - После выборки всё равно проходят `EventOverride.applyOverrides` и `enrichWithBadges`, чтобы соблюдать publish-gate и скрытие событий.
  - `fields=full` (или отсутствие параметра) — полный объект события для деталок и сложных сценариев (включая офферы, все сессии, сырые данные интеграций).
- Кэш каталога:
  - Ключи строятся из стабильного hash параметров (включая `fields`), namespace `catalog:list:<city>:<hash>`.
  - Для `card`-листангов TTL может быть увеличен (по сравнению с full), так как payload компактнее и не содержит чувствительных к микроскопическим изменениям деталей.
- Наблюдаемость:
  - `CatalogService.fetchEvents` логирует тайминги по этапам (`dbMs`, `overrideMs`, `badgesMs`, `totalMs`, `fields`, `sort`, `total`) для диагностики производительности в dev/prod.

### Сборка frontend (Windows / CI)

- **Windows**: `next build` с `output: 'standalone'` падает на EPERM (создание symlink). В `next.config.ts` standalone отключён на Windows: `output: isWindows ? undefined : 'standalone'`. Сборка проходит успешно без standalone. Альтернатива — включить Developer Mode в Windows (Settings → Privacy → For developers).
- **CI / Linux**: standalone включён; Docker-образ frontend остаётся ~100 MB.
- **Скрипты**:
  - `pnpm -C packages/frontend build` — обычный build (standalone только на Linux/macOS)
  - `pnpm -C packages/frontend build:standalone` — принудительный standalone (`NEXT_OUTPUT=standalone`, может упасть на Windows без Developer Mode)
  - `pnpm -C packages/frontend start:standalone` — запуск standalone-сервера после `build:standalone` (или обычного build на Linux)

### ESLint (flat config + Next.js)

- Корень: `eslint.config.mjs` (TypeScript-ESLint, Prettier, общие правила).
- Frontend: `packages/frontend/eslint.config.mjs` — spread корня + `@next/eslint-plugin-next` (recommended). `next lint` — правила применяются; предупреждение «plugin was not detected» в Next 15 — косметическое (vercel/next.js#73655). В v16 — переход на `npx eslint .`.

---

### Структура монорепозитория (папки packages/*)

- **`packages/backend`** — NestJS backend:
  - REST API (`/api/v1/*`, `/admin/*`, `/supplier/*`), очереди BullMQ, интеграции (Ticketscloud, YooKassa).
  - Prisma схема + миграции (`packages/backend/prisma`), скрипты синхронизации (`prisma/*.ts`, `src/catalog/*`).
- **`packages/frontend`** — публичный сайт (Next.js App Router):
  - `/` (главная, города, подборки, события, билеты, блог, checkout).
  - Виджет выбора сеанса и checkout: `docs/archive/PR-C.md` (PR-C1…C5, архитектура CheckoutSession → PaymentIntent → Package).
  - SSR/SSG для SEO, TailwindCSS, React Query.
- **`packages/frontend-admin`** — админка Daibilet (React + Vite):
  - Страницы: `src/pages/events/*` (EventsList, EventEdit, EventCreate, EventsMerge), `cities/*`, `venues/*`, `landings/*`, `collections/*`, `combos/*`, `upsells/*`, `widgets/*`, `articles/*`, `reviews/*`, `support/*`, `orders/*`, `audit/*`, `moderation/*`, `reconciliation/*`, `settings/*`, `Dashboard`, `Login`.
  - **Task 10 / Phase C:** контент-блоки PDP — `ContentBlocksPanel` на `EventEdit` (`contentTemplateData`) и `VenueEdit` (`venueTemplateData`, вкладка «Контент PDP»), спецификации полей из `@daibilet/shared` (`getEventTemplateSpecs`, `getVenueTemplateSpecs`); см. `docs/Task10-PhaseC-Content-Blocks-Spec.md`.
  - Общий layout (`components/layout/*`), UI‑компоненты (`components/ui/*`), SeoMetaEditor.
  - Использует `@tanstack/react-query`, `@tanstack/react-table`, Radix UI.
- **`packages/frontend-supplier`** — портал поставщика (упрощённый кабинет):
  - Страницы: `src/pages/events/*` (EventsList, EventEdit), `Dashboard`, `Reports`, `Settings`, `Login`, `Register`.
  - **Roadmap Phases 2–9:** см. [RoadmapPhases2-9Architecture.md](RoadmapPhases2-9Architecture.md) — Orders, Availability, ListingHealth, Analytics, Pricing, Ranking, Integrations, Team/Roles.
  - Tailwind + Radix UI, React Router.
- **`packages/shared`** — общий пакет `@daibilet/shared`:
  - Утилиты: `normalize-title`, `price-normalizer`, `seo-utils`, `widget-payload`, `address-utils`, `city-declension`.
  - Используется backend’ом и всеми фронтами.

---

### Админка: готовность, расписание, мультисобытия, SEO-аудит

- **Спецификация:** [AdminSystem.md](AdminSystem.md) — готовность события, ручной publish, мультисобытия, SEO-аудит, Teplohod-style расписание (сетка дата×час, drag/ctrl-brush, Модель A при продажах). Scope: только MANUAL события.

---

## Taxonomy (Subcategories) + SEO Audit — единый слой качества и структуры витрины

### Цель

- **Taxonomy (Subcategories)** задаёт смысловую структуру каталога (темы/подтемы) и является источником для фильтрации, авто‑подборок и SEO‑routing.
- **SEO Audit** — операционный read‑слой, который проверяет качество оформления сущностей и страниц относительно publish‑политик и таксономии (completeness + misuse).

### Принцип

Эти блоки проектируются вместе:

- taxonomy отвечает на «**что это за сущность**»
- audit отвечает на «**достаточно ли хорошо она оформлена и используется**»

### Где зафиксировано целевое решение

- `docs/SeoAudit-Taxonomy-MasterPlan.md` — master plan для связки Taxonomy + SEO Audit, правила и rollout по фазам.
  - Примечание: документ описывает **целевую спецификацию**; реализация должна быть эволюционной и не ломать текущие контракты (links‑first `Subcategory`, publish‑gate, materialize‑слой).

### Глобальные мульти-события (одно шоу в разных городах)

- Для гастролей/серийных шоу (одинаковое событие в разных городах/датах) используется grouping на уровне `Event`:
  - `normalizedTitle: String?` — нормализованный заголовок (для grouping, а не для UX).
  - `groupingKey: String?` — ключ вида `"{category}::{normalizedTitle}::{durationMinutes|na}::{minAge}"`.
  - Индекс `@@index([groupingKey])` для быстрых выборок.
- Sync-слой (TC gRPC + teplohod.info) при upsert Event заполняет:
  - `normalizedTitle` через `normalizeEventTitle` (из shared) → `.toLowerCase()`.
  - `groupingKey` на основе `category`, `normalizedTitle`, `durationMinutes`, `minAge`.
- API:
  - `GET /api/v1/multi-events?sort=popular|new&limit=N` — агрегированные группы (по `groupingKey`) для глобального каталога.
  - Детальный просмотр мульти-события `/events/m/{slug}` и таблица `EventGroup` — отдельный этап (см. Tasktracker, раздел «Каталог / Venues / Teplohod»).

---

## Фаза 1 UX: Afisha-inspired улучшения

> Добавлено: 2026-02-12. Источник: сравнительный анализ с Яндекс.Афишей.

### Цель

Увеличить конверсию выдачи на 20-30% за счёт:
- Лучшей сравнимости событий
- Снижения когнитивной нагрузки
- Ускорения выбора даты

### Принцип

**Afisha = простота. Daibilet = простота + интеллект.**

Не усложнять фронт раньше, чем сделана идеальная выдача. Afisha выигрывает не стеком, а UX-минимализмом и скоростью принятия решения.

### Этап 1 (текущий) — Quick Wins

1. **Лента дат** — горизонтальная навигация по датам (сегодня/завтра/выходные) на странице каталога. Mobile-first, без тяжёлого календаря. Бэкенд уже поддерживает `dateFrom`/`dateTo`.

2. **Смарт-бейджи на карточках** — "Оптимальный выбор" (по scoring-алгоритму), "Осталось N мест", ближайший сеанс. Управление вниманием пользователя.

3. **Каркас новых сущностей** — Location (PIER/VENUE/MEETING_POINT), Operator, Route в Prisma. Без привязки к UI.

### Посадочная «Музеи» (20.02.2026)

Шаблон посадочной страницы `/cities/[slug]/museums` — единый для всех городов, меняется только контент (`getMuseumsLandingContent(citySlug)`).

**Блоки:** HERO (H1, поиск, фильтры), «Лучший выбор» (CTA), секции «Главные / Частные / С детьми», полный каталог (GET /catalog, category=MUSEUM), «Маршрут на 1 день», FAQ, SEO-текст.

**Компоненты:** `page.tsx` (SSR), `MuseumsFilters` (Client), `MuseumsSections`, `MuseumRouteBuilder`. Ссылки со страницы города: категория «Музеи и Арт» и «Все музеи» → `/cities/{slug}/museums`.

**Масштабирование:** добавить ветку в `getMuseumsLandingContent` для нового города (heroTitle, anchors, faq, seoText). Быстрые фильтры (qf) в UI — бэкенд пока не поддерживает.

### Этап 2 (планируется)

- SEO-подборки (5+ автогенерируемых страниц на город)
- Страницы причалов и маршрутов
- Перелинковка: событие — причал — маршрут — подборка
- Улучшение карточки события (фото, условия, блок "как проходит")

---

## Blog Service — Архитектура SEO-блога

### Обзор

Blog Service генерирует SEO-оптимизированные статьи на основе данных каталога (события, теги, города, лендинги) с автоматической перелинковкой. Цель — органический трафик через информационные запросы (что посмотреть, куда сходить, лучшие экскурсии).

### Модель данных

```
Article
├── id          UUID PK
├── slug        String UNIQUE          // URL: /blog/{slug}
├── title       String
├── content     Text (Markdown)
├── excerpt     String?
├── cityId      UUID? → City
├── coverImage  String?
├── metaTitle   String?
├── metaDescription Text?
├── isPublished Boolean (default false)
├── publishedAt DateTime?
├── isDeleted   Boolean (default false)
├── version     Int (default 0)
├── createdAt   DateTime
├── updatedAt   DateTime
│
├── articleEvents  ArticleEvent[]      // M2M: привязка к событиям
└── articleTags    ArticleTag[]        // M2M: привязка к тегам
```

### Типы статей для автогенерации

| Тип | Шаблон заголовка | Источники данных | Пример slug |
|-----|------------------|------------------|-------------|
| **Гид по городу** | «Что посмотреть в {город} в 2026» | Cities, Events (top по рейтингу), Tags | `chto-posmotret-v-peterburge-2026` |
| **По категории** | «Лучшие {категория} в {город}» | Events по category, фильтр по городу | `luchshie-ekskursii-v-peterburge` |
| **По тегу** | «{Тег} в {город}: ТОП-{N}» | Events с тегом X в городе Y | `nochnye-ekskursii-v-peterburge` |
| **Сезонный гид** | «Куда сходить в {город} {сезон}» | Events + сезонные теги | `kuda-skhodit-v-kazani-zimoj` |

### Архитектура генерации

```
                    ┌──────────────┐
                    │   Триггер    │
                    │ cron / admin │
                    │   / sync     │
                    └──────┬───────┘
                           ▼
                    ┌──────────────┐
                    │ ArticlePlanner│  — определяет какие статьи нужны
                    │              │    (город × тип × сезон)
                    └──────┬───────┘
                           ▼
              ┌────────────┴────────────┐
              ▼                         ▼
    ┌──────────────┐          ┌──────────────┐
    │ DataCollector │          │  Templates   │
    │              │          │              │
    │ Events       │          │ city-guide   │
    │ Tags         │          │ category-top │
    │ Cities       │          │ tag-guide    │
    │ Landings     │          │ season-guide │
    └──────┬───────┘          └──────┬───────┘
           └────────────┬────────────┘
                        ▼
                 ┌──────────────┐
                 │  Renderer    │  — собирает Markdown из шаблона + данных
                 └──────┬───────┘
                        ▼
                 ┌──────────────┐
                 │   Linker     │  — вставляет внутренние ссылки
                 └──────┬───────┘
                        ▼
                 ┌──────────────┐
                 │  Article DB  │  — upsert в таблицу articles
                 └──────────────┘
```

### Алгоритм DataCollector

Для каждого типа статьи собираются:
- **Events**: топ-N по рейтингу/популярности с описаниями, ценами, длительностью
- **Tags**: активные теги с `_count.events > 0`
- **Cities**: название, описание, количество событий
- **Landings**: title, heroText, FAQ для перелинковки

### Перелинковка (Linker)

Каждая статья автоматически содержит:
- **3-5 ссылок на события**: `/events/{slug}` — из привязанных `ArticleEvent`
- **Ссылки на тег-страницы**: `/events?tag={slug}` — на основании `ArticleTag`
- **Ссылки на другие статьи**: `/blog/{slug}` — статьи того же города / смежных тем
- **Ссылки на лендинги**: `/cities/{city}/{landing}` — соответствующие лендинги

### Расписание генерации

| Триггер | Действие |
|---------|----------|
| После sync (events) | Пересчёт ТОП-N, обновление статей с изменёнными событиями |
| Cron (1 раз/неделю) | Генерация новых статей при появлении новых городов/тегов |
| Смена сезона (по дате) | Генерация/обновление сезонных статей |
| Админ (ручной) | Кнопка «Перегенерировать» на отдельной статье |

### Требования к контенту

- Минимальная длина статьи: 1500 символов
- Каждая статья содержит H1, вводный абзац, H2-секции, заключение
- Meta title ≤ 70 символов, meta description ≤ 160 символов
- Slug — транслитерация кириллицы (совпадает с общими соглашениями)
- `version` инкрементируется при каждом обновлении для отслеживания изменений
- `isPublished = false` по умолчанию — публикация через админку

### Будущее: OpenAI API

На следующем этапе `Renderer` будет заменён на вызов OpenAI API:
- Контекст = собранные данные (события, теги, описания)
- Промпт = шаблон статьи + стайл-гайд бренда Дайбилет
- Результат = уникальный Markdown, проходящий проверку антиплагиата
- Human-in-the-loop: статья создаётся как draft, публикация после ревью в админке

### Этап 3 (планируется)

- Персонализация: ближайший причал по геолокации
- Погодный бейдж: комфортно/ветрено + рекомендация
- Upsell через TripCombo
- "Следить за ценой" / "Лучшие предложения недели"

---

## Partner B2B API — Машинная интеграция

> Добавлено: 2026-02-14. Для поставщиков со своей системой бронирования.

### Архитектура

```
Система поставщика  ──[API Key + REST]──►  Partner API  ──►  PostgreSQL
                    ◄──[POST webhookUrl]──  Webhook Service
```

### Аутентификация

- Формат ключа: `dbl_` + 32 случайных символа
- Хранение: SHA-256 хеш в `api_keys`, оригинал не хранится
- Проверки: isActive, expiresAt, ipWhitelist, operator.isActive
- `lastUsedAt` обновляется fire-and-forget

### Endpoints (`/api/v1/partner/`)

| Группа | Метод | Назначение |
|--------|-------|------------|
| Каталог | `POST /events` | Upsert события по externalId |
| Каталог | `PUT /events/:externalId` | Обновление события |
| Каталог | `DELETE /events/:externalId` | Деактивация |
| Каталог | `POST /events/:externalId/offers` | Upsert оффера |
| Каталог | `PATCH /offers/:externalId/availability` | Быстрое обновление наличия/цены |
| Заказы | `GET /orders` | Список заказов (фильтры) |
| Заказы | `POST /orders/:id/confirm` | Подтверждение (state machine) |
| Заказы | `POST /orders/:id/reject` | Отклонение (state machine) |
| Отчёты | `GET /reports/sales` | Продажи за период (JSON + CSV) |
| Служ. | `GET /whoami` | Информация о ключе |

### Webhook

- Типы: `order.created`, `order.cancelled`, `payment.paid`, `payment.refunded`
- Подпись: `HMAC-SHA256(JSON.stringify(body), webhookSecret)` → заголовок `X-Webhook-Signature`
- Доставка: BullMQ, 3 ретрая (5s → 10s → 20s)

### B2B Checkout — наша форма и наш платёжный контур

Для событий, поставляемых через B2B (Partner API или иные интеграции):

- **Форма покупки** — наша: выбор даты/сеанса, типы билетов, количество, контакты (тот же UX, что для MANUAL/платформенных событий).
- **Остатки мест** — подтягиваются по API поставщика (не из локальной БД): при отображении сеансов и перед созданием заказа запрашиваем актуальную доступность.
- **Платежный контур** — полностью наш: создание Package (createPackage) → оплата через YooKassa → FulfillmentItem; после оплаты передача заказа поставщику (webhook/API) по контракту интеграции.

Итог: единый UX и единая точка приёма платежей; источник истины по наличию — API партнёра.

---

## Unified Checkout — Roadmap (для планировщика)

> Добавлено: 2026-02-14. Нужен для работы планировщика программ. Приоритет — после подключения YooKassa.

### Контекст

Планировщик программ объединяет несколько событий из разных источников (TC, teplohod.info, MANUAL, Partner) в один пакет. Для единого ваучера необходима оплата на нашей стороне через YooKassa, даже для событий билетных систем.

### Текущие ограничения

1. **TC Widget / REDIRECT** — оплата происходит на стороне провайдера, мы не контролируем
2. **Несколько провайдеров в одной корзине** — невозможно оплатить одним платежом
3. **Планировщик программ** — без unified checkout пользователь должен оплачивать каждое событие отдельно

### Целевая архитектура

```
Пользователь → [Корзина: TC + TEP + MANUAL] → YooKassa → PaymentIntent.PAID
                                                                ↓
                                              ┌─────────────────┼──────────────┐
                                              ▼                 ▼              ▼
                                         TC API v2         TEP API         MANUAL
                                        POST /orders       (резерв)     OrderRequest
                                         PATCH done      (confirm)       (pending)
```

### Фазы внедрения

1. **YooKassa для REQUEST** — оплата собственных событий (MVP, минимальный риск)
2. **YooKassa для TC events** — создаём заказ в TC после оплаты (резерв 15 мин → confirm)
3. **Unified cart** — смешанная корзина (TC + TEP + MANUAL) с единым платежом
4. **Ваучер** — единый QR/PDF для пакета событий

### Ключевые риски

- **Двойной резерв**: TC резерв 15 мин vs время оплаты YooKassa → sequence: pay → reserve → confirm
- **Partial failure**: если 1 из N событий не забронировано → partial refund
- **Чарджбеки**: при отмене бронирования, деньги уже у нас → нужна чёткая политика возвратов

### Зависимости

- [x] PaymentIntent layer (STUB + YooKassa API v3) — готов
- [x] State Machine (CheckoutSession/OrderRequest/PaymentIntent) — готов
- [x] offersSnapshot immutable — готов
- [x] YooKassa API v3 подключение (через fetch, без SDK)
- [ ] Sandbox-тесты (3 сценария: PLATFORM, EXTERNAL, mixed)
- [x] Webhook верификация (IP whitelist + PaymentEventLog + WebhookIdempotency + очередь fulfillment)

### Преимущества Daibilet перед Афишей (killer features)

- Ближайший причал + время доезда
- Погодный бейдж с рекомендацией
- Правда о маршруте (какие мосты гарантированы)
- Честная длительность (время на воде + посадка/выход)
- Прозрачные условия возвратов/переносов

---

## План 26 PR: Инфра + типизация + UX + Checkout

26 задач (каждая = 1 PR): Nginx static, Feature Flags, Pino/Sentry, Redis cache, типизация (tc-sync, Proto, where builders), email order-confirmed/completed, каталог (view toggle, venue detail), Teplohod widgets, Supplier RBAC + drafts, Checkout (package flow, YooKassa, orders tracking, webhook idempotency). Миграции M1–M8.

---

## Partitioning Plan (EventSession)

**Цель:** Партиционировать `event_sessions` по `startsAt` (месяц).

### Шаги (без простоя)

1. **Подготовка:** Создать `event_sessions_new` (PARTITION BY RANGE (startsAt)), партиции на N месяцев вперёд. Скрипт: `infra/migrations/create_event_sessions_partitions.sql`.
2. **Миграция:** `INSERT INTO event_sessions_new SELECT * FROM event_sessions` (batch 10k).
3. **Переключение:** RENAME event_sessions → event_sessions_old, event_sessions_new → event_sessions.
4. **Cron:** Раз в месяц создавать партиции на следующие 3 месяца.

**Rollback:** RENAME обратно, перезапуск приложения.

---

## Архитектура Supplier (Operator vs SupplierUser)

| Сущность | Что это | Роль |
|----------|---------|------|
| **Operator** | Юрлицо / правообладатель | ООО/ИП, договор, комиссия |
| **SupplierUser** | Аккаунт в ЛК | Логин, доступ, создаёт Event/Venue |
| **Provider** | Источник инвентаря | TC, TEPLOHOD, MANUAL |
| **Offer** | Предложение | EventOffer — цена, deeplink |

**Operator (1) ← SupplierUser (N).** Контент привязан к Operator через `operatorId`. Operator с `isSupplier = true` → доступ в Supplier Portal.

**Режимы:** A) Operator-модель — вы ведёте контент, Supplier не обязателен. B) Supplier-модель — Supplier создаёт DRAFT, модерация. C) Ручной — MANUAL, self-serve.

**Модерация:** DRAFT → PENDING_REVIEW → APPROVED/REJECTED. AUTO_APPROVED при trustLevel 1–2.

**Роли:** OWNER (всё), MANAGER (события/офферы), CONTENT (контент), ACCOUNTANT (отчёты).

**Operator.status:** ACTIVE | ARCHIVED | SUSPENDED.

**createdByType:** ADMIN | SUPPLIER | IMPORT — для Event/Venue.

---

## Teplohod Widget / PartnerEventId инвариант

- **Источник данных**: `https://api.teplohod.info/v1/events` (или `/v1/events?compact`) — поле `id` Teplohod является **внешним идентификатором события**.
- **Хранение в БД**:
  - Для событий из Teplohod: `Event.source = 'TEPLOHOD'`, `Event.tcEventId = String(id)` (строка числа без префиксов).
  - Глобальный ключ: `@@unique([source, tcEventId])` + `@@index([source, tcEventId])` в Prisma-модели `Event`.
- **Инвариант партнёрского идентификатора**:
  - `PartnerEventId = (source === 'TEPLOHOD' ? tcEventId : id)`.
  - Реализация на фронтенде: `getPartnerEventId(event)` в `packages/frontend/src/lib/partnerIds.ts`:
    - для Teplohod-событий всегда возвращает `tcEventId` (голое число из Teplohod API),
    - для всех остальных — внутренний `Event.id` (UUID).
- **Виджет и embed**:
  - Партнёрский скрипт `public/teplohod.js` ищет `.db-teplohod-widget` и создаёт iframe на `/widgets/teplohod?eventId=...`, где:
    - для Teplohod: `data-event-id="<id из /v1/events>"`,
    - для ручных/внутренних событий допустим UUID (локальное тестирование).
  - Бэкенд-виджет (`TeplohodWidgetsService`) при `GET /api/widgets/teplohod/event?eventId=...`:
    - если параметр похож на UUID → ищет по `Event.id` (наш внутренний ключ),
    - иначе нормализует Teplohod id (`normalizeTeplohodExternalId`) и ищет по
      `source = 'TEPLOHOD'` + `tcEventId = "<id>"` (с fallback на устаревшие значения вида `tep-<id>`).
- **Миграция старых данных**:
  - Одноразовая SQL-миграция в `packages/backend/prisma/migrations/*_teplohod_tcEventId_normalize` нормализует все старые `tcEventId` Teplohod к чистым числам (`tep-123` → `"123"`), чтобы исключить расхождения между БД и внешним API.
- **Тесты**:
  - Vitest-тесты в `packages/backend/test/teplohod-contract.spec.ts` фиксируют:
    - нормализацию внешнего Teplohod id (`normalizeTeplohodExternalId`),
    - стратегию поиска события в `TeplohodWidgetsService.findEvent`,
    - инвариант `getPartnerEventId` (Teplohod → `tcEventId`, остальные → `id`).

---

## Политика фильтров (QF)

**Query Filters:** type (excursion|venue|event), group, slug, title, isSeo, priority. 17 фильтров в seed.

**Маппинг:** slug → EventSubcategory, VenueType, EventAudience, tag. См. `query-filter-map.ts`.

**SEO URL:** `/{city}/{type}/`, `/{city}/{type}/{filter}/`. Индексируем 1–2 фильтра в path, остальное — query.

**Модель:** QueryFilter (id, type, group, slug, title, isSeo, priority), @@unique([slug, type]).
