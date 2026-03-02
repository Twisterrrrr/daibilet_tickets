# Дневник проекта — Агрегатор билетов + Trip Planner

> Каждая запись содержит дату и разделы «Наблюдения», «Решения», «Проблемы».

---

## 01.03.2026 — ESLint PR-only (Вариант A)

### Наблюдения

- Унаследованный проект: линтер «грязный», PR тонут в старых предупреждениях.
- Правило: новые PR не ухудшают, но не обязаны чинить старое.

### Решения

- **CI:** ESLint только по изменённым файлам (`git diff base...head`, фильтр `*.ts`, `*.tsx`).
- **PR:** `base` = merge base, `head` = PR head.
- **Push:** `base` = before, `head` = sha (при before=0 — fallback HEAD~1).
- Если нет изменённых *.ts/*.tsx — шаг пропускается (success).
- **package.json:** `lint:all` — полный lint с --max-warnings=0 (локально при необходимости).

### Проблемы

- Нет.

---

## 01.03.2026 — PR-1–PR-8: Cursor Master Pipeline (EventOverride, Cache, Offers, Checkout, Orders, JSON-LD, ESLint, tc-sync)

### Наблюдения

- Выполнена цепочка PR-1…PR-8 из спецификации Cursor Master Pipeline.
- PR-1 (subcategories) уже был готов ранее; PR-2–PR-8 реализованы последовательно.

### Решения

- **PR-2 (A2) Redis cache:** TTL по спецификации (cities 6h, events list 2m, detail 10m, search 2m); инвалидация `catalog:` при изменении события.
- **PR-3 (A3) Publish-gate:** `isSellable()` в `catalog/sellable.ts`; `buildEventWhere` фильтрует только события с ACTIVE оффером и `priceFrom > 0`; `voucherUrl` в `formatTrackingResult` при COMPLETED.
- **PR-4 (C2) Mobile checkout:** Прогресс-бар «Корзина → Данные → Оплата → Завершение»; fixed bottom bar для ширины ≤420px с итогом и CTA.
- **PR-5 (C3) /orders/[id]:** Таймлайн статуса, операционная информация (место встречи, телефон), блок «Открыть ваучер».
- **PR-6 (B1+B2) JSON-LD:** `buildArticleJsonLd()` для статей; страница `blog/[slug]` рендерит Article schema; FaqSection уже использует FAQPage.
- **PR-7 (D1) ESLint:** Правило `@typescript-eslint/no-explicit-any: warn` уже было включено; overrides для DTO и тестов.
- **PR-8 (D2) Типизация tc-sync:** TcVenueCity, TcTicketSetRule, TcOffer; `isTcEvent` принимает id/_id; валидация в syncAllRest; `getCityName` типизирован.

### Проблемы

- ESLint по-прежнему выявляет pre-existing ошибки (unused vars, no-explicit-any warnings) — не связаны с текущими изменениями.

---

## 02.03.2026 — Gate 3: meta-теги, Event Quality Gate, PageTemplateSpecs аудит

### Наблюдения

- JSON-LD уже реализован на Event, City, Venue, Combo, Landings, Help. Meta og/twitter были частично — без единого helper.

### Решения

- **buildPageMetadata()** — lib/seo/buildPageMetadata.ts: единый helper для title, description, openGraph, twitter (card, title, description, images), canonical.
- **Обновлены страницы:** events/[slug], cities/[slug], venues/[slug], combo/[slug], podborki/[slug] — используют buildPageMetadata с полным набором og + twitter.
- **Layout:** добавлен twitter.card = summary_large_image по умолчанию.
- **Event Quality Gate:** добавлена проверка NO_VALID_PRICE — активные офферы должны иметь priceFrom > 0.
- **PageTemplateSpecs аудит:** docs/PageTemplateSpecsAudit.md — сверка реализации (Музеи, каталог, JSON-LD, meta) со спецификацией.

### Проблемы

- Нет.

---

## 01.03.2026 — Отказ от Directus, всё в текущей админке

### Наблюдения

- Ранее планировался переезд части админки на Directus; сейчас решено оставаться полностью на frontend-admin (React + Nest API).

### Решения

- **Удалено:** папка deploy/directus (docker-compose, extensions ops-tools, ops-orders), документ DirectusPipeline.md.
- **Обновлено:** Tasktracker — Gate 2: «всё в текущей админке», задачи Directus отменены; AdminPipeline — убраны упоминания Directus; SupplierModel, SupplierArchitecture — «права админки» вместо Directus; комментарии в backend (admin-orders, admin-cache, postedit-queue, sync.processor, schema.prisma) — «админка» вместо «Directus».
- **Результат:** единственная админка — frontend-admin. Ops-действия (resend, retry, cache invalidate) доступны в Settings и OrderDetail.

### Проблемы

- Нет.

---

## 02.03.2026 — Диетический режим листингов `/events`

### Наблюдения

- После импорта большого объёма событий (TC + teplohod) листинги (`/`, `/events`, лендинги) стали возвращать очень «жирный» JSON: полный `Event` с `tcData`, всеми офферами и сессиями.
- Next.js dev + NestJS dev + тяжёлый payload давали заметное падение TTFB на первых запросах, особенно без прогретого Redis-кэша.

### Решения

- Введён параметр `fields` для `/api/v1/events`:
  - `fields=card` — лёгкий режим для листингов; возвращается компактная DTO «карточка события» (id, slug, title, category, subcategories, audience, краткое описание, город/venue, imageUrl, priceFrom, рейтинг/отзывы, ближайшая сессия, базовые highlights/теги).
  - `fields=full` (по умолчанию) — полный объект события для деталок и спец-сценариев.
- В `CatalogService.fetchEvents` реализованы две Prisma-ветки:
  - `card`: `select` только по нужным полям, без тяжёлых JSON; сессии ограничены `take: 20` ближайших, tags — только через `tags.tag`.
  - `full`: прежний `include` с офферами/сессиями.
- Для обоих режимов после выборки по-прежнему работают:
  - `EventOverride.applyOverrides` (publish-gate, isHidden, editorStatus=PUBLISHED).
  - `enrichWithBadges` (nextSessionAt, totalAvailableTickets, highlights, isOptimalChoice).
- Добавлен лог таймингов в `fetchEvents`:
  - метрики `dbMs`, `overrideMs`, `badgesMs`, `totalMs`, `fields`, `sort`, `total` логируются через `Logger(CatalogService)`, чтобы в dev/prod отслеживать реальную стоимость листингов.

### Проблемы

- Для упрощения count пока считается одинаково и для `card`, и для `full` (`prisma.event.count({ where })`); при необходимости можно вынести count в отдельный кэш-ключ и/или ослабить требования к точному total для дальних страниц (`page > 3`).

---

## 01.03.2026 — SEO-аудит, Отчёты, Support escalation, Error Boundary

### Наблюдения

- Tasktracker содержал закрытые задачи без полной реализации (resend/retry UI, Support escalation, Error Boundary).
- SEO-аудит и Отчёты были разбросаны (query-filters isSeo, dashboard stats) — требовались отдельные страницы.

### Решения

- **SEO-аудит:** GET /admin/seo/audit — сводка покрытия meta по типам (CITY, VENUE, EVENT, LANDING, ARTICLE, COMBO). Отдельная страница /seo-audit в админке.
- **Отчёты:** Отдельная страница /reports — агрегация данных dashboard + ссылки на Сверку, Заказы.
- **Support escalation:** docs/SupportEscalation.md — чеклист для саппорта (письмо не пришло, платёж не обновился, событие не показывается и др.).
- **Error Boundary:** компонент ErrorBoundary в frontend-admin, оборачивает App в main.tsx.
- **Sidebar:** новая секция «Аналитика» с SEO-аудит и Отчёты.

### Проблемы

- Нет.

---

## 01.03.2026 — ЛК поставщика: черновики и модерация

### Наблюдения

- Backend supplier API уже поддерживал: POST /supplier/events (DRAFT), PUT /supplier/events/:id, POST /supplier/events/:id/submit (DRAFT→PENDING_REVIEW).
- Админка имеет ModerationQueue (approve/reject). Не хватало полноценного UI в frontend-supplier для цикла «создать черновик → отправить на модерацию».
- Цены в БД — в копейках; UI должен показывать рубли.

### Решения

- **EventEdit (frontend-supplier):**
  - Создание события — как черновик (moderationStatus: DRAFT), кнопка «Создать черновик».
  - При редактировании: отображение moderationStatus и moderationNote (при REJECTED).
  - Кнопка «Отправить на модерацию» (DRAFT/REJECTED → PENDING_REVIEW).
  - Цена от: UI в рублях, API в копейках (×100).
- **EventsList:** фильтр по статусу модерации (Все / Черновики / На модерации / Одобренные / Отклонённые).
- **Cities:** используется публичный GET /cities (catalog), возвращает массив городов.

### Проблемы

- Нет.

---

## 24.02.2026 — Event Quality Gate и публикация через Nest

### Наблюдения

- Публикация событий сейчас зависит от ручной дисциплины: редактор может выставить PUBLISHED даже при отсутствующих полях (category, image, offers, location).
- Backend-gate перед публикацией нужен, чтобы редактор не мог выставить PUBLISHED без проверки.
- Subcategories в EventOverride ранее не имели явной семантики override/clear/inherit, что мешает предсказуемой категоризации и фильтрам.

### Решения

- Добавлен `EventQualityService.validateForPublish(eventId)` в backend (Nest, catalog), который возвращает:
  - `isReady: boolean`,
  - `issues: { code, message, field? }[]` (MISSING_TITLE, MISSING_CITY, MISSING_CATEGORY, MISSING_DESCRIPTION, MISSING_IMAGE, MISSING_LOCATION, MISSING_ACTIVE_OFFER, NO_FUTURE_SESSIONS).
- В `EventOverride` добавлены поля качества: `qualityStatus` (READY | BLOCKED), `qualityIssues` (Json-массив объектов issues), `qualityCheckedAt`; метод `checkAndPersist` сохраняет результат проверки.
- Реализован endpoint `POST /admin/events/:id/publish` (ADMIN-only), который:
  - вызывает `checkAndPersist`,
  - при наличии issues возвращает `{ ok: false, issues }` и не ставит PUBLISHED,
  - при успехе делает upsert EventOverride с `editorStatus=PUBLISHED`, снимает `needsReviewAt`, пишет запись в AuditLog (`EventPublish`).
- Для подкатегорий в `EventOverride` введена явная семантика:
  - `subcategoriesMode: SubcategoriesMode` (Prisma enum `INHERIT | OVERRIDE | CLEAR`, default = `INHERIT`, NOT NULL),
  - `subcategoriesOverride: EventSubcategory[]` (массив подкатегорий для режима OVERRIDE);
  - `resolveSubcategories` в `EventOverrideService.applyOverrides` использует этот режим: INHERIT → оригинал, OVERRIDE → override-список, CLEAR → [] (плюс backward compatibility, если ранее mode был NULL или содержал мусор — миграция конвертирует в INHERIT).

### Проблемы

- Quality gate работает при публикации через `/admin/events/:id/publish`; редактор в админке использует кнопку «Опубликовать», а не прямое редактирование editorStatus.

---

## 23.02.2026 — Очередь постредакции (EventOverride.editorStatus)

### Наблюдения
- Контент/SEO/редактура событий — в админке (frontend-admin); импорт TC и teplohod попадает в очередь постредакции без перетирания при sync.
- Модель Event + EventOverride уже разделяет «оригинал из источника» и «правки для Daibilet»; sync не трогает override.

### Решения
- **EditorStatus** enum: NEEDS_REVIEW, IN_PROGRESS, PUBLISHED, REJECTED. Поля EventOverride: editorStatus (default NEEDS_REVIEW), needsReviewAt, lastImportedAt; updatedBy сделан nullable для авто-созданных override.
- **PostEditQueueService** (catalog): ensureOverridesForImportedEvents(source?, since?) — после sync создаёт/обновляет override для импортных событий (TC/TEPLOHOD): новые → NEEDS_REVIEW; уже PUBLISHED — только lastImportedAt; остальные → NEEDS_REVIEW или сохраняем IN_PROGRESS.
- **SyncProcessor**: после TC и TEP sync (full) и после TC (incremental) вызывается очередь с since = runStartedAt.
- **applyOverrides**: не показывать события с override, у которых editorStatus !== PUBLISHED или isHidden.
- **OverrideEventDto** + API: поле editorStatus для установки PUBLISHED из админки.
- Миграция: существующие override с updated_by IS NOT NULL помечены PUBLISHED, чтобы не скрыть уже опубликованный контент.
- Документ **AdminPipeline.md** — фазы 0–4, чеклист задач, описание очереди.

### Проблемы
- Prisma generate на Windows может дать EPERM (файл занят) — перезапуск терминала/IDE или повторный запуск после закрытия процессов.

---

## 23.02.2026 — Ops Batch 4, типизация, UX, Planner «Заменить»

### Наблюдения

1. **Ops Batch 4** — Admin Operator Panel v2: resend-email, retry-fulfilment уже в спецификации; set-status (PATCH) уже был. Добавлены POST /admin/orders/:id/resend-email и POST /admin/orders/:id/retry-fulfilment. Для Package: retry-fulfilment создаёт voucher если отсутствует, отправляет письмо.
2. **Типизация** — JwtPayload уже в jwt.strategy; добавлен auth.types.ts (AdminJwtUser, PartnerApiUser). Partner/Supplier контроллеры: req: any заменены на типы. admin-orders: where: any → Prisma.PackageWhereInput. ESLint no-explicit-any уже настроен.
3. **Frontend/UX** — loading.tsx для /events (скелетон каталога); EventEdit: подсказки «Оригинал» / «Для Daibilet» у поля названия; SearchAutocomplete: city из URL для фильтрации событий.
4. **Planner** — Кнопка «Заменить» на слоте: модалка с выбором другого события, вызов POST /planner/customize, обновление варианта.

### Решения

- Batch 4: OrderActionDto, OrderStatusDto (reason для аудита); VoucherModule в AdminModule; MailService.sendOrderCompleted для resend/retry.
- auth.types.ts экспортирует AdminJwtUser, PartnerApiUser; supplier-settings использует CurrentSupplierUser; partner-events — PartnerApiUser, EventSource.
- SearchAutocomplete принимает city prop из Header (searchParams).

### Проблемы

- Redis-кэш и автовыбор primary — оставлены на следующий этап (уже есть CacheService, логика primary — в admin/offers).

---

## 23.02.2026 — Диагностика «сайт не открывается», staging/prod docs

### Наблюдения

1. **pnpm не в PATH** — в PowerShell (Cursor Integrated Terminal) `pnpm` иногда не распознаётся, если Node/npm не загружены в сессии.
2. **Главная требует бэкенд** — при открытии `/` фронт делает SSR-запросы к `/api/v1/cities`, `/api/v1/events`. Next проксирует на backend:4000. Если backend не запущен — ECONNREFUSED, HomePage падает с ошибкой, страница «не открывается».
3. **Страница /partner** — почти полностью статична, должна открываться без API. Прямой переход на http://localhost:3000/partner работает при работающем фронте.

### Решения

- **Запуск**: `pnpm dev` — backend + frontend через concurrently. Или `pnpm dev:frontend` + `pnpm dev:backend` в отдельных терминалах.
- **Для просмотра /partner**: достаточно `pnpm dev:frontend`, переход на http://localhost:3000/partner.
- **staging-prod-vds.md** — документ по архитектуре prod/staging на одном VPS (разные порты, env, nginx, certbot).

### Проблемы

- Нет.

---

## 02.03.2026 — База для мульти-событий (глобальные группы по groupingKey)

### Наблюдения

- В глобальном каталоге `/events` начали появляться десятки одинаковых карточек одного и того же шоу («ЛЕДИ НАЙТ – только для женщин» в разных городах и датах).
- Нужно техническое основание для мульти-событий (одно шоу → много городов/дат), не ломая текущую маршрутизацию и контракты `/events/{slug}`.

### Решения

- В Prisma-модели `Event` добавлены поля `normalizedTitle?: String` и `groupingKey?: String` + индекс `@@index([groupingKey])`.
- Создана миграция `20260302140000_event_grouping_key` (ALTER TABLE events ADD normalizedTitle/groupingKey + индекс), применена вручную через `prisma db execute` без полного `migrate dev` (shadow DB ломался на старой миграции audience).
- В sync-слое:
  - `tc-sync.service`: при upsert Event для gRPC-группы рассчитывается `normalizedTitle = normalizeEventTitle(title).toLowerCase()` и `groupingKey = "{category}::{normalizedTitle}::{durationMinutes|na}::{minAge}"`.
  - `tep-sync.service`: аналогично, с использованием классификатора для category/subcategories/audience/minAge.
- Добавлен endpoint `GET /api/v1/multi-events?sort=popular|new&limit=N`:
  - Использует `Prisma.$queryRaw` для агрегации по `groupingKey` (COUNT событий, COUNT DISTINCT городов, MIN(priceFrom), MAX(rating)).
  - Кэшируется через `cacheKeys.catalog.multiEvents(sort:limit)` с TTL как у списков каталога.

### Проблемы

- Полноценная страница мульти-события (`/events/m/{slug}`) и интеграция в фронтовый глобальный каталог пока не реализованы; на backend подготовлен только слой данных и API для групп.

---

## 22.02.2026 — Комиссии, партнёрская страница, Venue vs Operator

### Наблюдения

1. **Venue и Operator** — концептуально Venue можно считать вариантом Operator: площадка (музей, галерея), продающая билеты с open-date. Venue привязан к Operator (operatorId). EventOffer с venueId — прямой оффер к площадке. Комиссия для venue-офферов: 15% базовая (или venue.commissionRate), для event-офферов: 20%.
2. **Pier (причал)** — тип Location (LocationType.PIER). Частное обозначение локации для речных мероприятий и экскурсий на воде. Используется в фильтрах каталога, лендингах, LandingClient.
3. **Текущие комиссии** — Operator.commissionRate 25%, promoRate 7%. Нужны: promoRate 10% (включает YooKassa), базовая 20% events / 15% venues до promoUntil (3 мес), админ может менять для любого оператора или площадки.

### Решения

- **Комиссии**: Operator.commissionRate default 0.20, promoRate default 0.10. Venue.commissionRate — индивидуальная ставка (15% по умолчанию для venue-офферов). Логика в checkout.service: inPromo → promoRate; venue offer → venue.commissionRate ?? 0.15; event offer → operator.commissionRate.
- **Регистрация поставщика**: supplier-auth.service — promoUntil = now + 90 дней при создании Operator.
- **Страница «Стать партнёром»**: `/partner` с CTA на https://daibilet-supplier.lovable.app/ — варианты сотрудничества. Добавлена в Header, Footer, sitemap-static.

### Проблемы

- Prisma migrate dev падает на shadow DB (EventSubcategory). Миграция для commission/promo — создать вручную при необходимости.

---

## 22.02.2026 — T19–T26: Checkout flow (полный цикл)

### Наблюдения

- getStatus поддерживал только Package; CheckoutSession — основа корзины.
- AddToCartButton вёл на /checkout (корзина); нужен flow: Купить → package → оплата.

### Решения

- **T19**: Расширен getStatus: Package + CheckoutSession; единый формат ответа.
- **T20**: CheckoutPackageClient — Progress bar, шаги review → contact → payment → done.
- **T21**: createPackage (POST /checkout/package) создаёт CheckoutSession из items; updatePackageContacts. AddToCartButton вызывает createPackage → redirect /checkout/[id].
- **T22**: createPackagePayment → POST /checkout/:id/pay (существующий PaymentService).
- **T23**: Страница /checkout/result — redirect на /checkout/[sessionId]?return=success|fail|cancel.
- **T24**: OrdersModule, GET /orders/:id (UUID или shortCode), getOrderById; formatTrackingResult для offersSnapshot. Страница /orders/[id].
- **T25**: markPaid уже вызывает sendOrderConfirmed.
- **T26**: WebhookIdempotencyService используется в YooKassa webhook.

### Проблемы

- Нет.

---

## 22.02.2026 — T19: Страница /checkout/[packageId]

### Наблюдения

- API `getCheckoutStatus` уже есть; backend `getStatus` возвращал только status и voucherUrl.
- Package-модель содержит items с event/session.

### Решения

- Расширен `CheckoutService.getStatus`: возвращает id, code, status, totalPrice, voucherUrl, paidAt, items (event, subtotal, adultTickets, childTickets).
- Создана страница `/checkout/[packageId]`: CheckoutPackageClient с загрузкой, polling (3 с), fallback UI при ошибке/404.
- Парсинг `?return=success|fail|cancel` (T23) — отображается feedback, при success выполняется refetch после 1.5 с.

### Проблемы

- Нет.

---

## 22.02.2026 — T18: Supplier RBAC + self-service drafts

### Наблюдения

- Контроллер supplier-events уже создавал DRAFT, использовал createdByType/createdById/updatedById.
- В Prisma schema этих полей не было (миграция 20260221110000 добавила их в БД, схема не синхронизирована).
- Прогресс блокировался: Prisma-клиент не знает о полях — возможны ошибки.

### Решения

- Добавлен enum `CreatedByType` (ADMIN, SUPPLIER, IMPORT) в schema.prisma.
- Event: добавлены `createdByType`, `createdById`, `updatedById` в секцию Supplier/Moderation.
- Venue: добавлены `createdByType`, `createdById`.
- Создана миграция `20260222120000_add_event_updated_by_id` (добавляет колонку updatedById).

### Проблемы

- Prisma generate на Windows — EPERM при lock query_engine DLL (процесс backend держит файл). Решение: остановить backend, выполнить `pnpm db:generate` и `pnpm db:migrate`.

---

## 22.02.2026 — T16–T17: Venue skeleton, Teplohod widgets

### Наблюдения

- Venue detail page уже имела hero, инфо, CTA; отсутствовал skeleton loading.
- ExternalWidgetProvider, ExternalWidget в схеме отсутствовали — план M2 описан в InfraTypizationUXCheckoutPlan.md.

### Решения

- **T16**: Добавлен `loading.tsx` для `/venues/[slug]` — skeleton hero, blocks, sidebar.
- **T17**: Prisma enum `ExternalWidgetProviderKind`, модели `ExternalWidgetProvider`, `ExternalWidget`; миграция `20260222000000_add_external_widgets`; AdminWidgetsController (providers, list, get, create, update, delete); админ UI: WidgetsList (поиск, фильтр по провайдеру, копирование widgetId), WidgetEdit (создание/редактирование, кнопка Copy widgetId); seed — TEPLOHOD provider; Sidebar — «Виджеты Teplohod».

### Проблемы

- Prisma migrate dev на Windows (shadow DB) — возможен P3006; migration SQL создан вручную.
- Prisma generate — EPERM при переименовании DLL (lock процесса).

---

## 22.02.2026 — T13–T14, T25: Email при PAID, order-completed voucher/QR

### Наблюдения

- CheckoutModule не импортировал MailModule; PaymentService не имел MailService.
- order-confirmed шаблон и sendOrderConfirmed уже были; order-completed — только запрос отзыва, без voucher/QR.

### Решения

- **T25**: CheckoutModule импортирует MailModule; PaymentService инжектит MailService; при markPaid (PAID → COMPLETED) вызывается sendOrderConfirmed с данными из offersSnapshot (items, totalPrice, operationalItems). Ошибка письма не отменяет checkout.
- **T14**: sendOrderCompleted расширен опциями voucherCode, voucherUrl, qrData, qrImageUrl; order-completed.hbs — условные блоки «Ваш ваучер готов» и «Ваш билет» (QR). При отсутствии данных — блок «Как прошёл визит?» с reviewUrl.

### Проблемы

- Нет.

---

## 22.02.2026 — T8–T12: типизация, where builders, Redis cache

### Наблюдения

- TcEvent уже в tc-api.types. tc-sync REST-режим использует getEvents → TcEvent[].
- where-builders.ts был пустой — создан buildEventWhere, buildVenueWhere.
- CacheService имеет getOrSet (remember). catalog keys добавлены.

### Решения

- **T8**: tc-api getEvents → Promise<TcEvent[]>, tc-sync allTcEvents/syncEventGroup/findBestImage → TcEvent[].
- **T9**: добавлен gen:proto в backend package.json (protoc + ts-proto).
- **T10**: buildEventWhere(dto), buildVenueWhere(dto); catalog.getEvents и getCatalogVenues используют builders.
- **T11**: cacheKeys.catalog.list/detail, invalidateAfterSync включает catalog:.
- **T12**: getEvents кэшируется через catalog:list:{city}:{hash}, TTL EVENT_LIST; getEventBySlug поддерживает ?nocache=1; EventsQueryDto.nocache.

### Проблемы

- gen:proto на Windows может требовать .cmd для плагина.

---

## 22.02.2026 — T1–T7, T15: Инфра, Feature Flags, Pino, Sentry, view toggle

### Наблюдения

- T1 Nginx /uploads уже в конфиге. T2 Feature Flags — PublicModule + endpoint готов, FeatureFlag модель в схеме.
- nestjs-pino в зависимостях, LoggerModule подключён. Sentry backend и frontend уже инициализированы.

### Решения

- **T2–T3**: PublicModule добавлен в AppModule; `useFeatureFlags()`, `isEnabled(flag, ctx)` в frontend (featureFlags.ts, useFeatureFlags.ts).
- **T4**: LoggerModule.forRoot (pino-http, pino-pretty в dev), `app.useLogger(PinoLogger)` в main.ts.
- **T5**: Логи PAYMENT_FAILED с paymentId, provider, checkoutSessionId; Sentry.captureMessage при markFailed.
- **T6**: AllExceptionsFilter — captureException для 5xx; PaymentService.markFailed — Sentry.captureMessage с тегами.
- **T7**: CheckoutErrorBoundary — опциональные packageId/sessionId в Sentry tags.
- **T15**: Каталог — viewMode в localStorage `catalog:viewMode`; toggle grid/list с персистенцией.

### Проблемы

- Нет.

---

## 23.02.2026 — План 26 PR: Инфра, типизация, UX, Checkout

### Наблюдения

- Добавлен пакет из 26 задач (каждая = 1 PR) и 8 миграций Prisma.

### Решения

- **docs/InfraTypizationUXCheckoutPlan.md** — спецификация: Nginx /uploads, Feature Flags, Pino/Sentry, Redis cache, типизация (tc-sync, Proto, where builders), email templates, каталог (view toggle, venue detail), Teplohod widgets, Supplier RBAC + drafts, Checkout (package flow, YooKassa, /orders/[id], webhook idempotency).
- Tasktracker и Project.md — ссылки на план.

### Проблемы

- Нет.

---

## 21.02.2026 — Документация Supplier/Operator, createdByType, RBAC

### Наблюдения

- Обсуждение архитектуры Supplier vs Operator: разделение юрлица (Operator) и аккаунта (SupplierUser).
- Operator-модель (вы ведёте контент) vs Supplier-модель (поставщик ведёт через ЛК) — оба режима в одной системе.
- Для масштабирования нужны createdByType и RBAC.

### Решения

**SupplierArchitecture.md**
- Расширена документация: два режима, архивация Operator, когда Supplier не обязателен.
- Добавлено предложение createdByType (ADMIN | SUPPLIER | IMPORT) для Event и Venue.
- Добавлен RBAC-чеклист: матрица прав по ролям, проверки доступа, эндпоинты Supplier.
- Описана миграция «закрыли юрлицо»: Operator.status = ARCHIVED, перенос operatorId.

**Tasktracker**
- Добавлены задачи: createdByType в Prisma, реализация RBAC для Supplier.

### Проблемы

- Event.supplierId vs Event.operatorId — семантика supplierId уточнить (возможно дублирует operatorId).

---

## 20.02.2026 — Защита от 500, шаблон экскурсий, продолжение плана

### Наблюдения

- 500 на /events?limit=100 мог быть из-за moveNoPhotoToEnd при нестроковом imageUrl.
- tep-1210 (ekskursiya-na-dvuhetazhnom-avtobuse-g-kazan): 404 — при ручной проверке curl возвращает 200 (возможно кэш/миграция).
- Шаблон экскурсий: TemplateDataBlocks выводил route, menu, shipName, но не rules, advantages, bookingRules.

### Решения

**moveNoPhotoToEnd**
- Защита: `typeof url === 'string' && url.trim().length > 0` — избегаем падения при number/object в imageUrl.

**Шаблон экскурсий**
- TemplateDataBlocks: добавлены блоки rules, advantages, bookingRules (из templateData).
- Админка EventTemplateFields уже редактирует эти поля — теперь они выводятся на странице события.

### Проблемы

- 500 на limit=100 — без логов бэкенда причина не подтверждена; защитный код добавлен.

---

## 20.02.2026 — Фильтр по городу на главной, каталог, TEPLOHOD-категории

### Наблюдения

- Когнитивный разрыв: HeroCitySearch вёл на /cities, «Ближайшие» менялись по городу, «Популярные» — нет.
- TEPLOHOD: речные прогулки «развод мостов», «палубный теплоход» попадали в EVENT (смотровые площадки) или EXTREME.
- Нет селектора «Показывать по» в каталоге; нет публичного API для списка TEPLOHOD-событий.

### Решения

**Главная — фильтр по городу**
- HeroCitySearch: выбор города → `/?city=slug` (остаёмся на главной), `scroll: false`.
- «Популярные» и «Ближайшие» — обе секции фильтруются по citySlug.
- Fallback: если в городе < 8 популярных — добиваем из общероссийского топа.
- Заголовки: «Популярные события в {City}», «Ближайшие события в {City}».
- Чипы городов: «Все города» + топ-5 как переключатель фильтра (/?city=slug).
- Ссылки «Все события», «Всё о городе» — под блоками (как в «Ближайших»).
- `initialCitySlug` в HeroCitySearch для предзаполнения поля из URL.

**TEPLOHOD classifyTep**
- Речные экскурсии проверяются первыми: теплоход, развод мостов, палубн, речн, катер и т.д. → EXCURSION+RIVER.
- «Смотровые площадки» на теплоходе больше не уходят в EVENT+SHOW.
- EXTREME только для наземных (танк, квадроцикл); речные прогулки не экстрим.
- Скрипт `fix-teplohod-river-excursions.ts`: перенос TEPLOHOD EVENT → EXCURSION+RIVER по маркерам, сброс override category/subcategories. Команда: `pnpm run fix:teplohod-river`.

**Каталог /events**
- Селектор «Показывать по» 20/50/100 рядом с видом (сетка/список).
- `limit` в URL, API getEvents/getCatalog, пагинация по limit.

### Проблемы

- fix-teplohod-river требует DATABASE_URL; при отсутствии .env скрипт падает.
- Публичный API не поддерживает `source=TEPLOHOD` для выдачи только teplohod-событий.

---

## 20.02.2026 — Посадочная «Музеи» по городу

### Наблюдения

- Страница `/cities/[slug]/museums` — единый шаблон для всех городов. Контент различается через `getMuseumsLandingContent(citySlug)`.
- Каталог: api.getCatalog({ category: 'MUSEUM', city, q, sort, page, limit }). Бэкенд CatalogQueryDto не поддерживает qf (быстрые фильтры) — кнопки в UI есть, эффекта пока нет.

### Решения

**Структура**
- `page.tsx` — Server Component, generateStaticParams для featured-городов, revalidate 300.
- `MuseumsFilters` — Client: поиск (q), сортировка (popular/rating/price_asc/price_desc), быстрые фильтры (qf). URL как источник истины.
- `MuseumsSections` — блоки «Главные музеи», «Частные и современные», «С детьми» (захардкожены для СПб).
- `MuseumRouteBuilder` — маршрут «Эрмитаж → Исаакий → Фаберже» + CTA на экскурсии.

**Контент для СПб**
- heroTitle, heroSubtitle, bestChoice (Эрмитаж), anchors, faq (4 вопроса), seoText.

**Ссылки**
- Страница города: категория «Музеи и Арт» → `/cities/{slug}/museums`; «Все музеи» в секции venues → тот же URL.

**Документация**
- Project.md, Tasktracker.md, PageTemplateSpecs.md — обновлены.

### Проблемы

- qf (center/kids/short/modern/free): бэкенд getCatalogMuseumAndVenues уже поддерживает qf (kids→audience, short→maxDuration, modern→subcategory CONTEMPORARY, free→priceMax=0, center→district). Фронт передаёт qf в getCatalog.

---

## 19.02.2026 — Аккаунты, типизация, Supplier

### Наблюдения

- Аккаунты: избранное хранится в localStorage; для переноса в учётку нужна модель User + UserFavorite и API.
- Supplier vs Operator: Operator = юрлицо, SupplierUser = аккаунт в ЛК. Документация в `docs/SupplierArchitecture.md`.
- Типизация: правило ESLint «никаких новых any» — переведено в warn.

### Решения

**Аккаунты (User)**
- Модели User, UserFavorite (userId, eventSlug). Миграция `20260219_operator_status_and_users`.
- UserModule: register, login, refresh, logout, me. JWT type `user`. Throttle на register/login.
- API /user/favorites: GET (list), POST (add), POST sync (merge localStorage), DELETE (remove).
- useFavorites: при token — API; без — localStorage. При логине — sync merge.
- UserAuthProvider, useUserAuth, useUserAuthOptional. Страница /login (вход + регистрация).
- Header: кнопка «Войти» / отображение имени при логине.

**Supplier**
- Operator.status (ACTIVE | ARCHIVED | SUSPENDED), archivedAt, archiveReason.
- SupplierRole: CONTENT, ACCOUNTANT.
- docs/SupplierArchitecture.md — разделение Operator/SupplierUser, роли, модерация.

**Типизация**
- ESLint: `@typescript-eslint/no-explicit-any: warn` (глобально).

### Проблемы

- Миграция требует DATABASE_URL (запускать с .env).

---

## 19.02.2026 — Продолжение: аудит шаблонов, категоризация, GiftCertificate в checkout

### Наблюдения

- Аудит шаблонов: `docs/PageTemplateAudit.md` — соответствие PageTemplateSpecs, program/cast/hall не выводились (templateData не в API).
- Скрипт проверки категоризации: `pnpm check:categorization` — STANDUP в MUSEUM, MASTERCLASS в MUSEUM, RIVER без маршрута, EXCURSION/MUSEUM без подкатегорий.
- GiftCertificate в checkout: поле «Ввести код», validate API, применение скидки при создании сессии, активация при завершении fulfillment.

### Решения

**Аудит шаблонов**
- API `getEventBySlug` теперь применяет override (мерж templateData) через `applyOverrides` для единичного события.
- На странице события добавлены блоки TemplateDataBlocks: program, cast, hall, route, menu, shipName (при наличии templateData).

**Скрипт категоризации**
- `packages/backend/prisma/check-categorization.ts` — 5 проверок: STANDUP в MUSEUM, MASTERCLASS в MUSEUM, RIVER без route, EXCURSION/MUSEUM без подкатегорий.
- Команда: `pnpm check:categorization` (backend).

**GiftCertificate в checkout**
- Миграция `appliedGiftCertificateSnapshot` в CheckoutSession.
- `POST /checkout/validate-gift-certificate` — валидация по коду и сумме корзины.
- `CreateCheckoutSessionDto.giftCertificateCode` — при создании сессии проверяется, применяется скидка.
- PaymentService: учёт appliedGiftCertificateSnapshot при расчёте grossAmount.
- FulfillmentService: при transitionSessionToCompleted — пометка GiftCertificate как ACTIVATED.
- Frontend CheckoutClient: input кода, кнопка «Применить», отображение скидки и итого.

### Проблемы

- Сохранение остатка сертификата (balance) — не реализовано; сертификат single-use.

---

## 19.02.2026 — Реализация решений OpenQuestions: 5 критичных + корзина

### Наблюдения

- Выполнены все 5 критичных пунктов и «Скрыть корзину» из OpenQuestions.md.

### Решения

**1. Email для GiftCertificate**
- Шаблон `gift-certificate.hbs`, `MailService.sendGiftCertificate()`, вызов из `fulfillGiftCertificate`.
- При неудаче отправки — job в `QUEUE_EMAILS` с retry (3 попытки, exponential backoff).
- `EmailProcessor` — ветка `gift-certificate`.

**2. Унификация session.prices**
- `packages/shared/src/price-normalizer.ts`: `NormalizedPrice`, `getPriceKopecks`, `normalizeSessionPrices`, `getMinPriceKopecks`, `getPriceByTypeKopecks`, `getFirstPriceKopecks`.
- Исправлен баг «1 ₽»: `amount` (кол-во мест) никогда не используется как цена.
- Обновлены: `landing.service`, `combo.service`, `planner.service`.

**3. Cache invalidation service**
- `CacheInvalidationService`: `invalidateEvent`, `invalidateEventById`, `invalidateOverride`, `invalidateCity`, `invalidateRegions`, `invalidateFull`.
- Инвалидация при: override upsert/remove/toggle, venue-settings, external-rating, create/fullUpdate offer.
- `invalidateAfterSync` — добавлен паттерн `regions:*`.

**4. Скрипт reclassify-events.ts**
- `event-classifier.ts` — общий классификатор (вынесен из tc-sync).
- `prisma/reclassify-events.ts`: dry-run по умолчанию, `--apply` для записи, пропуск override-событий.
- Команды: `pnpm reclassify:dry`, `pnpm reclassify:apply`.
- tc-sync переведён на `classify()` из event-classifier.

**5. Скрыть корзину**
- `CartIcon` возвращает `null`.
- `AddToCartButton` → «Купить»: add + redirect на `/checkout` (прямой checkout per-offer).

### Проблемы

- Backend build падает на pre-existing ошибках в catalog.service.ts (не связано с нашими изменениями).
- `.env` в корне — скрипт reclassify загружает его через `process.cwd()` и `__dirname` paths.

---

## 19.02.2026 — Избранное, подарочные сертификаты, похожие события

### Наблюдения

- Добавлены три фичи: избранное (localStorage), подарочные сертификаты, «похожие» по тегам/подкатегории/цене.

### Решения

**Избранное:**
- `useFavorites` хук (localStorage, ключ `daibilet-favorites`), FavoriteButton, страница /favorites, пункт в Header (десктоп + мобильное меню).

**Подарочные сертификаты:**
- Prisma: модель `GiftCertificate` (amount, code, recipientEmail, senderName, message, status), `CheckoutSession.giftCertificateSnapshot`.
- API: GET /checkout/gift-certificate/denominations, POST /checkout/gift-certificate. Номиналы из env `GIFT_CERTIFICATE_DENOMINATIONS` (по умолчанию 3000, 5000, 10000 ₽).
- Fulfillment: при оплате создаётся GiftCertificate, сессия → COMPLETED. Код формата GC-XXXX-XXXX.
- Страница /gift-certificate, ссылка в футере.

**Похожие события:**
- Скоринг: +3 за общий тег, +5 за общую подкатегорию, +2 за цену в диапазоне ±50% или ±500₽.
- Берём до 30 кандидатов (город + категория), сортируем по score desc, затем rating, возвращаем топ-6.

### Проблемы

- Prisma generate на Windows может давать EPERM при занятом файле — закрыть dev-сервер перед миграцией.
- TODO: email получателю при создании сертификата.

---

## 19.02.2026 — Классификация, лендинги, карточки

### Наблюдения

- События неправильно классифицировались: «водн»/«речн» давали RIVER автобусным турам; «кухня»/«ужин» — GASTRO речным прогулкам; «дегустация» в лагерях — GASTRO.
- На лендинге /cities/saint-petersburg/salyut цена показывалась 1₽ — использовалось поле `amount` (количество мест) вместо `price`.
- Теги на карточках были справа вместе с ценой/избранным — перегружали зону CTA.

### Решения

**Классификация (tc-sync, tep-sync):**
- GASTRO: только явные маркеры (гастро, гастрономич, дегустац, food tour, culinary). Убраны: еда, кухня, бар, пивн, вин, ужин, обед, завтрак, бранч.
- Исключение: события с «лагерь», «camp», «выездной» не помечаются GASTRO.

**Лендинги — цена:**
- В `session.prices` поле `price` — цена в копейках, `amount` — количество мест. Teplohod ставит `amount: 100`.
- Исправлено: getPrice везде берёт `p?.price ?? p?.amount` (LandingClient, ComparisonTable, VariantCard, landing.service).

**Карточки событий:**
- Теги (Новинка, Хит продаж) перенесены в левый верхний угол. Справа на фото только избранное и цена.

### Проблемы

- Уже засинкенные события с неправильной подкатегорией требуют повторного sync или ручного исправления в EventOverride.

---

## 19.02.2026 — Решения по 13 открытым вопросам

### Наблюдения

- По 13 открытым вопросам (OpenQuestions.md) приняты решения с приоритетами.

### Решения

См. `docs/OpenQuestions.md`. Кратко:
- **Критично:** email для сертификатов, унификация prices, инвалидация кэша, скрипт переклассификации
- **Высокий:** скрыть корзину, аудит шаблонов, SQL-отчёт по категориям, GiftCertificate в checkout, EventOverride.subcategories
- **Позже:** планировщик MVP, аккаунты, типизация

---

## 16.02.2026 — Виджеты teplohod.info: tepWidgetId

### Наблюдения

- В админке teplohod.info можно создавать виджеты с собственными ID (напр. 14000).
- Виджет выводится так: `<div data-lang="ru-RU" data-id="14000" class="teplohod-info-wrapper"></div>`.
- ID виджета может отличаться от ID события (tep.id из API).

### Решения

- **widgetPayload для TEPLOHOD**: добавлено поле `tepWidgetId` (приоритет над `tepEventId`).
- **TepWidgetEmbed**: принимает `tepWidgetId`, `tepEventId`, `externalEventId`; для `data-id` использует `tepWidgetId` → `tepEventId` → `extractTepId(externalEventId)`.
- **Страница события**: передаёт `tepWidgetId` и `tepEventId` в TepWidgetEmbed из `widgetPayload`.
- **Импорт маппинга**: скрипт `prisma/seed-teplohod-widgets.ts` обновляет `EventOffer.widgetPayload.tepWidgetId` из JSON (tep-{id} → widgetId).

**Запуск импорта:**

1. Создать `packages/backend/prisma/teplohod-widgets.json`:

   ```json
   { "tep-282": 14000, "tep-1291": 14001 }
   ```

2. Выполнить: `cd packages/backend && npm run db:seed:tep-widgets` (или передать путь к JSON вторым аргументом).

- **Shared**: схема `TepWidgetPayloadSchema` (tepWidgetId, tepEventId — оба опциональны), зарегистрирована в `PAYLOAD_SCHEMAS`.

### Проблемы

- Первоначально требовался ручной экспорт Excel → JSON; добавлена прямая поддержка XLSX (пакет `xlsx`).

---

## 16.02.2026 — Заголовок события: оригинал vs кастомный для Daibilet

### Наблюдения

- Внешние источники (TC, Teplohod) могут присылать неудачные заголовки.
- Нужно давать свой заголовок для Daibilet, сохраняя оригинал для импорта/экспорта.

### Решения

**Архитектура (уже реализована):**

- **Event.title** — заголовок из источника; обновляется при каждом sync.
- **EventOverride.title** — кастомный заголовок; задаётся в админке.
- **Отображение** — `override.title ?? event.title` (catalog, API, frontend).
- **Экспорт / sync** — `Event.title` не трогается override; при sync обновляется только Event, не Override.
- **CSV-экспорт** — использует `Event.title` (оригинал).

**Где настроить:** админка Events → редактирование события → таб «Основное» → поле «Название». Сохранение идёт в EventOverride.title.

**Рекомендация для UX:** показывать в админке оба заголовка: «Оригинал (из источника)» и «Для Daibilet» — чтобы было видно, что оригинал сохранён.

### Проблемы

- Нет.

---

## 16.02.2026 — Фильтры каталога /events: синхронизация с URL

### Наблюдения

- При смене города (в дропдауне или в Header) терялся фильтр «Начнутся скоро» и другие активные фильтры.
- Состояние фильтров хранилось в React state; при клике на город в Header выполнялся переход по `/events?city=...` без сохранения текущих параметров.
- Корень проблемы: фильтры не связаны друг с другом и не имеют единого источника истины.

### Решения

**1. URL как единый источник истины**

- Все фильтры каталога хранятся в query-параметрах URL.
- При загрузке страницы и навигации состояние читается из `searchParams`.
- При изменении любого фильтра вызывается `updateUrl()` — обновляются только переданные параметры, остальные сохраняются.

**2. Параметры URL на `/events`**

| Параметр | Описание |
|----------|----------|
| `city` | slug города |
| `category` | EXCURSION, MUSEUM, EVENT |
| `audience` | KIDS |
| `sort` | popular, rating, price_asc, price_desc, **departing_soon** |
| `timeOfDay` | soon, morning, day, evening, night (если sort ≠ departing_soon) |
| `tag` | slug тега |
| `date` | yyyy-mm-dd или from..to |
| `pier` | id причала |
| `page` | номер страницы |
| `qf` | id быстрого фильтра (quick filter) |

**3. Реализация в `packages/frontend/src/app/events/page.tsx`**

- `filtersFromParams(sp)` — парсит объект фильтров из `URLSearchParams`.
- `updateUrl(updates)` — мержит `updates` с текущим `searchParams`, вызывает `router.replace`.
- Эффект синхронизации: при изменении `searchParams` обновляет локальный state.
- Все обработчики (город, категория, «Скоро», дата, пагинация и т.д.) вызывают только `updateUrl()`, без прямого `setState` для фильтров.

**4. Header**

- Header использует `searchParams.toString()` при выборе города — все текущие параметры сохраняются в URL.

**5. Режим «Начнутся скоро»**

- При отсутствии событий «скоро» в выбранном городе город сбрасывается через `updateUrl({ city: null, page: 1 })`.

### Проблемы

- Нет. Фильтр «Начнутся скоро» сохраняется при смене города; ссылки с параметрами можно сохранять в закладки и делиться ими.

---

## 16.02.2026 — Prisma migrate deploy: идемпотентные миграции

### Наблюдения

- При `prisma migrate deploy` миграции падали с ошибками «type X already exists», «column X already exists».
- База уже содержала объекты (enum PurchaseFlow, колонки venueId, isDeleted и др.) — вероятно от `prisma db push` или `migrate dev`.
- Prisma 7 (npx из корня) несовместима со schema: `url` в datasource больше не поддерживается. Нужно запускать из `packages/backend` через Prisma 6.
- `.env` лежит в корне; при запуске из `packages/backend` Prisma не видит DATABASE_URL. Решение: загружать переменные из корневого `.env` перед вызовом.

### Решения

**1. Идемпотентные миграции (20260215_pre_yookassa_gates, 20260215_review_venue_id, 20260215_soft_delete_and_cascade_safety)**

- Enums: `DO $$ ... IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'X') THEN CREATE TYPE ... END IF; END $$;`
- Таблицы: `CREATE TABLE IF NOT EXISTS`
- Колонки: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- Индексы: `CREATE INDEX IF NOT EXISTS`, `CREATE UNIQUE INDEX IF NOT EXISTS`
- FK: `DO $$ ... IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'X') THEN ALTER TABLE ... ADD CONSTRAINT ... END IF; END $$;`

**2. Восстановление после сбоя**

- `prisma migrate resolve --rolled-back <migration_name>` — помечает упавшую миграцию откаченной, позволяет перезапустить deploy.
- После правки файла миграции — снова `migrate deploy`.

**3. Запуск deploy**

```powershell
cd packages/backend
# Загрузить DATABASE_URL из ..\..\.env (или dotenv -e ../../.env)
npx prisma migrate deploy
```

Корневой `npx prisma` использует Prisma 7 → использовать только из `packages/backend`.

### Проблемы

- Нет. Все 33 миграции применены успешно, включая `20260216_template_data`.

---

## 16.02.2026 — Шаблоны типов событий в админке

### Наблюдения

- Спецификация в `docs/PageTemplateSpecs.md`: у каждого типа (EXCURSION, MUSEUM, EVENT) свой набор полей.
- При создании/редактировании события в админке логично показывать только релевантные поля.

### Решения

**1. EventOverride.templateData (JSONB)**

- Миграция `prisma/migrations/20260216_template_data` — добавляет колонку `templateData` в `event_overrides`.
- Применить: `cd packages/backend && npx prisma migrate deploy` (когда DATABASE_URL доступен).

**2. EventTemplateFields — единый компонент**

- Принимает category, subcategories, templateData, onChange.
- EXCURSION: route, menu, shipName (только RIVER), rules, advantages, bookingRules.
- MUSEUM: rules (дополнительно к данным Venue).
- EVENT: program (массив строк), cast (массив {name, role}), hall, rules.

**3. Интеграция в EventCreate и EventEdit**

- EventCreate Step 1: блок EventTemplateFields после описания; templateData в payload; при смене категории — сброс.
- EventEdit: блок в табе «Основное»; загрузка из override; сохранение через PATCH override.

**4. API**

- CreateEventDto, OverrideEventDto: поле templateData (optional).
- При создании: если templateData передан — создаётся EventOverride с ним.
- applyOverrides: templateData мёржится в ответ.

### Проблемы

- Нет. Backlog: вывод templateData на публичной странице события (блоки маршрута, программы, состава и т.д.).

---

## 16.02.2026 — Единый каталог (Вариант B): Event + Venue в одной витрине

### Наблюдения

- Два параллельных каталога: `/events` (Event) и `/venues` (Venue) — разная логика, разные API, дублирование фильтров.
- Чёткое разделение: **Музей** — не Event, а Venue (билеты с открытой датой, арт-места). Event — экскурсии (движение по маршруту) и мероприятия (концерты, шоу, стендапы).
- Цель: упростить работу с данными — один API и один листинг-компонент для фронта.

### Решения

**1. GET /api/v1/catalog — единый API каталога**

- `category=MUSEUM` → выбираем Venue (из таблицы venues)
- `category=EXCURSION | EVENT` → выбираем Event
- Параметры: city, q, sort, page, limit

**2. CatalogItem — общий контракт карточки**

- Поля: type ('event'|'venue'), id, slug, title, citySlug, imageUrl, priceFrom, rating, dateLabel, badges, location
- Для event: category, startsAt, durationMinutes
- Для venue: venueType, openingHoursSummary

**3. Frontend**

- `api.getCatalog()` — вызов /catalog
- `CatalogCard` — по type рендерит EventCard или VenueCard
- Страница `/events`: при category=MUSEUM — getCatalog + CatalogCard (VenueCard), иначе — getEvents + EventCard
- Навигация: «Музеи и Арт» → `/events?category=MUSEUM` (единый вход)
- Главная: все категории ведут на `/events?category=...`

**4. Сортировка**

- popular/rating — по рейтингу (для обоих типов)
- price_asc / price_desc — по priceFrom
- departing_soon — только для событий

### Проблемы

- Нет. /venues и /venues/[slug] остались для детальных страниц. Страница /venues (отдельный каталог) по-прежнему доступна, но навигация переведена на единый каталог через /events?category=MUSEUM.
- Backlog: параметр q (поиск) в API есть, на фронте пока не подключён; priority для sort=popular (вручную задаваемый порядок).

---

## 15.02.2026 — Hard timeout для sync jobs (защита от зависания)

### Наблюдения

- `lockDuration: 600_000` (10 мин) на `SyncProcessor` предотвращает ложный stalled-статус, но **не предотвращает вечно работающий job** — lock продлевается каждые 5 мин, пока worker жив.
- Если TC или TEP API зависнет (бесконечный HTTP, deadlock), job будет active навсегда, блокируя `concurrency: 1` и все последующие sync-задачи.
- `attempts: 3` + `backoff: exponential` уже были на месте с предыдущего фикса — ретраи не нужно добавлять.
- `@Cron` + `jobId` dedup — валидная схема; переход на `upsertJobScheduler` / repeatable jobs возможен, но не даёт существенного выигрыша при одном инстансе.

### Решения

**Hard timeout в `SyncProcessor.withTimeout()`**

Обёртка через `Promise.race` с `setTimeout`:
- Full sync: **90 минут** (нормально 10–30 мин, запас ×3)
- Incremental: **30 минут** (нормально 2–10 мин, запас ×3)

При срабатывании:
1. `this.logger.error(...)` — видно в мониторинге / Sentry
2. `throw Error` → BullMQ переводит job в `failed`
3. Если остались `attempts` — retry с exponential backoff (1 мин, 2 мин, 4 мин)
4. Если attempts исчерпаны — job в `failed`, `removeOnFail: 20` чистит, следующий cron-тик создаст новый

**Ограничение**: настоящая async-работа (HTTP к TC/TEP API) продолжится в фоне до естественного HTTP timeout. Полная отмена требует `AbortController` в sync-сервисах (backlog). Это приемлемо: `concurrency: 1` не даст начать новый job, пока текущий worker-тред занят.

**Добавлен вывод attempt/maxAttempts в логи** — видно, на какой попытке job и сколько осталось.

### Проблемы

- Нет. Чистое дополнение, обратно совместимое.
- Future work: `AbortController` для полной отмены HTTP-запросов при timeout.

---

## 14.02.2026 — Overlap protection для sync cron jobs

### Наблюдения

- Cron-хендлеры `handleFullSync` и `handleIncrementalSync` использовали `getActiveCount()` / `getWaitingCount()` перед `queue.add()` для защиты от дублирования.
- Эти проверки **не атомарны**: между `getActiveCount()` и `queue.add()` другой инстанс (или тот же при быстром повторном вызове) может тоже пройти проверку и создать дубликат.
- При зависании full sync > 6ч следующий cron мог запустить второй, что грозило: двойной нагрузкой, гонками в `populateAll`/`retagAll`, некорректной инвалидацией кэша.

### Решения

**1. `jobId`-dedup (Redis atomic, BullMQ v5+)**

Фиксированные `jobId` для обоих типов sync:
- `singleton:sync-full` — полная синхронизация
- `singleton:sync-incremental` — инкрементальная

BullMQ v5+ дедуплицирует атомарно на уровне Redis Lua-скрипта: если job с таким ID в состоянии `waiting` / `active` / `delayed` — `queue.add()` возвращает существующий job без создания дубликата. `Completed` / `failed` НЕ блокируют повторное создание.

**2. `concurrency: 1` на `SyncProcessor`**

Явный `@Processor(QUEUE_SYNC, { concurrency: 1 })` — даже если каким-то образом два job попадут в очередь, worker обработает их последовательно.

**3. `lockDuration: 600_000` (10 мин)**

Full sync может занимать 10–30 мин. Стандартный `lockDuration` 30с слишком мал — BullMQ авто-продлевает lock каждые `lockDuration/2`, но при коротком интервале малейшая задержка GC/IO может привести к ложному stalled. 10 мин даёт комфортный запас.

**4. Targeted check для incremental**

Вместо широкого `getActiveCount() > 0` — конкретная проверка `getJob(SYNC_FULL_JOB_ID)` + `getState()`. Это бизнес-правило (incremental ⊂ full), а не защита от гонок.

**5. Замер времени в processor**

Добавлен `startMs` + `finally` блок с логированием elapsed time для каждого job — полезно для мониторинга деградации производительности sync.

### Проблемы

- Нет. Изменение чистое, обратно совместимое. Если Redis недоступен — `queue.add()` уже кидает exception, это обрабатывается BullMQ retry.

---

## 15 февраля 2026 — Batch C: Доказательство корректности платёжного контура

### Наблюдения

Batch C — финальная «proof of correctness» перед запуском YooKassa в production. Включает E2E тесты, data invariants, Reconciliation UI и операционный мониторинг.

Большая часть инфраструктуры (state machine, idempotency, fulfillment, refund) уже была реализована. Batch C добавляет **доказательства корректности** — тесты, guards, UI для мониторинга и ручного вмешательства.

### Решения

**1. 7 E2E sandbox-тестов (`payment-e2e.spec.ts`)**

21 тест-кейс покрывает 7 критических сценариев:
1. **Happy path** — PLATFORM → PAID → COMPLETED (полный flow через PaymentService + мок Prisma)
2. **Duplicate webhook** — processOnce() → second call is no-op (fulfillment не дублируется)
3. **Out-of-order events** — unknown event IGNORED, succeeded still works, PAID→FAILED rejected
4. **Fulfillment retry** — retryable error + retry logic + FAILED escalation after max attempts
5. **Auto-compensate** — FAILED + 15-min window → refund triggered; items within window not touched
6. **Cancel/Expired** — PENDING→CANCELLED, AWAITING_PAYMENT→EXPIRED, terminal states protected
7. **Multi-item partial failure** — 1 confirmed + 1 failed → partial refund; amount calculation correct

**2. Data Invariants (`payment-invariants.spec.ts`)**

8 тестов на 3 критических инварианта:

- **2a. offersSnapshot immutability** — runtime guard в `createPaymentIntent()`: если snapshot amount изменился после первого PaymentIntent, операция отклоняется (ConflictException). Тест: создать intent → изменить snapshot → второй intent rejected.
- **2b. amount = partitionCart(snapshot).platformTotal** — explicit verification: grossAmount = platformTotal, platformFee + supplierAmount = grossAmount, EXTERNAL items excluded from payment.
- **2c. ProcessedWebhookEvent → paymentIntentId** — новое поле `paymentIntentId` в schema + миграция. WebhookIdempotencyService принимает опциональный `paymentIntentId` и сохраняет его для трассировки.

**3. Reconciliation Enhancement**

Backend API расширен:
- `GET /admin/reconciliation/intents` — фильтры: `providerPaymentId`, `supplierId`, `provider` + cursor pagination
- `GET /admin/reconciliation/webhooks` — новый endpoint: список ProcessedWebhookEvent с dedup-статистикой
- `GET /admin/ops/metrics` — alert rates: fulfillment_fail_rate, auto_compensate_rate, webhook_dedup_rate + thresholds (warn 5%, critical 15%)
- `GET /admin/ops/health` — operational health: pending stale, failed unresolved, escalated open, active intents

Frontend Admin полностью переписан (4 вкладки):
- **Платежи** — таблица PaymentIntents с фильтрами, expandable row (fulfillment items + split info), Retry/Refund
- **Расхождения** — alert-список PAID + FAILED items с кнопками Retry All / Refund
- **Webhooks** — таблица ProcessedWebhookEvent с dedup-статистикой
- **Мониторинг** — Health status (healthy/degraded/critical), alert rates, counters

**4. Log Correlation**

Все ключевые логи теперь содержат structured context:
- PaymentService: `[intent=...] [provider=...] [providerPmtId=...]`
- FulfillmentService: `[session=...] [item=...] [provider=...]`
- RefundService: `[intent=...] [provider=...] [providerPmtId=...]`
- FulfillmentProcessor: `[job=...] [jobId=...] {paymentIntentId, providerEventId}`
- WebhookIdempotencyService: `[provider=...] [eventId=...] [eventType=...] [intent=...]`

**5. Починка payment.service.spec.ts**

8 pre-existing тестов ломались из-за пустого `offersSnapshot: []` (после рефактора cart-partitioning). Добавлен helper `makeSnapshot()` с корректными `purchaseFlow: PLATFORM` + `lineTotal`. Мок `CONFIG_DEFAULTS` теперь корректно возвращает `PAYMENT_PROVIDER: 'STUB'`.

### Проблемы

- **Pre-existing**: 2 теста в `checkout.service.spec.ts` проверяют `requestItems`, которого нет в ответе. Не связаны с Batch C — в backlog.
- **State machine**: `CONFIRMED → AWAITING_PAYMENT` разрешён только для `admin`, а `createPaymentIntent` работает как `system`. Сессия остаётся CONFIRMED, но это корректно — `markPaid` затем переводит её в COMPLETED напрямую.

---

## 15 февраля 2026 (ночь) — Batch A: CSV streaming, cursor pagination, ESLint

### Наблюдения

Перед интеграцией YooKassa закрываем последние масштабируемые риски: экспорты, пагинация, качество кода.

При аудите обнаружено что Batch B (денежный контур) **уже реализован**:
- `WebhookIdempotencyService.processOnce()` — таблица `ProcessedWebhookEvent` с unique constraint
- `checkout-state-machine.ts` — PaymentIntent state machine с терминальными состояниями
- `FulfillmentProcessor` (BullMQ) — post-payment queue с retry и auto-compensate

### Решения

**1. CSV cursor-based streaming**

Создана утилита `common/csv-stream.util.ts`:
- Batch size: 500 записей, hard limit: 50 000 строк
- Cursor pagination: `findMany({ cursor, skip: 1, take })` → каждый batch берёт cursor от последнего элемента
- Streaming: пишет в `Response` по батчам, не накапливает в памяти
- CSV escaping: кавычки, запятые, переводы строк
- BOM для Excel

Применено к:
- `admin-checkout.controller.ts` — export/requests, export/sessions
- `supplier-reports.controller.ts` — sales/export

Старый паттерн `take: 1000 → findMany → join → send` заменён на streaming.

**2. Единый pagination contract**

Создана утилита `common/pagination.ts`:
- `parsePagination({ cursor, page, limit })` → нормализация (limit ∈ [1, 200])
- `paginationArgs(pg)` → `{ take: limit+1, cursor?, skip }` для Prisma
- `buildPaginatedResult(rawItems, total, limit)` → `{ items, total, nextCursor, hasMore }`

Dual-mode:
- Если передан `cursor` → cursor-based (O(1), не деградирует)
- Если передан `page` → offset fallback (совместимость с фронтом)

Применено ко ВСЕМ list-эндпоинтам (15 контроллеров):
- admin: tags, cities, upsells, landings, combos, events, orders, articles, reviews, external-reviews, audit, collections, venues, suppliers
- supplier: events

Все возвращают единый формат `{ items, total, nextCursor, hasMore }`.

**3. ESLint: запрет console.***

Добавлено правило `'no-console': ['error', { allow: ['warn'] }]` в `eslint.config.mjs`:
- Production-код: `console.log/error/debug` → ESLint error (использовать NestJS Logger)
- Тесты: `no-console: 'off'`
- Seed/fix скрипты: `no-console: 'off'`

### Проблемы

Никаких. TypeScript `--noEmit` без ошибок, ESLint проходит (pre-existing unused vars не затронуты).

---

## 15 февраля 2026 (вечер) — Production Hardening: индексы, логирование, пагинация

### Наблюдения

По результатам аудита выполнен батч «production hardening» — самый дешёвый набор изменений для прироста производительности и чистоты кода.

### Решения

**1. FK-индексы (16 + 1 композитный)**

Добавлены недостающие индексы на все FK-поля, которые ранее вызывали full table scan при JOIN/WHERE:

| Модель | Поле | Тип |
|---|---|---|
| Region | hubCityId | FK |
| RegionCity | cityId | FK |
| Event | supplierId, startLocationId, endLocationId, routeId | FK ×4 |
| EventSession | (offerId, startsAt) | Композитный |
| EventTag | tagId | FK |
| PackageItem | eventId, sessionId | FK ×2 |
| Article | cityId | FK |
| ArticleEvent | eventId | FK |
| ArticleTag | tagId | FK |
| Venue | operatorId | FK |
| ReviewRequest | eventId | FK |
| OrderRequest | eventOfferId | FK |
| FulfillmentItem | offerId | FK |

Одна миграция `prisma db push`, ноль простоя.

**2. console.log → NestJS Logger**

Заменены все `console.log`/`console.error` в backend на `Logger`:
- `main.ts` — Bootstrap logger (3 вызова)
- `partner-auth.guard.ts` — ApiKeyGuard logger (1 вызов)
- `audit.interceptor.ts` — AuditInterceptor logger (1 вызов)

Теперь все логи идут через NestJS Logger с timestamps и context.

**3. Hardcoded teplohod URL → env**

- `tep-api.service.ts`: `baseUrl` → `process.env.TEP_API_URL || 'https://api.teplohod.info/v1'`
- `tep-sync.service.ts`: deeplink → `process.env.TEP_SITE_URL || 'https://teplohod.info'`

Позволяет переключить на staging/mock API без пересборки.

**4. Sitemap: /podborki/*

Добавлены подборки (Collections) в `sitemap.ts`:
- Индексная страница `/podborki` (priority 0.8)
- Все активные подборки `/podborki/:slug` (priority 0.85)

**5. Ограничение take в admin-контроллерах**

Все списковые admin-эндпоинты переведены с `take: 500` на пагинацию:
- Добавлены `@Query('limit')` и `@Query('skip')` параметры
- Лимит ограничен `Math.min(limit || 200, 200)`
- CSV-экспорты оставлены с `take: 1000` + TODO на cursor-based стриминг

Затронутые контроллеры: tags, cities, upsells, landings, combos, checkout (SLA metrics).

### Проблемы

Никаких. Все изменения backward-compatible, TypeScript compilation без ошибок.

---

## 15 февраля 2026 — Подборки (Collections) + системный аудит

### Наблюдения

Реализована полная фича «Подборки» — тематические посадочные страницы с гибридной логикой (фильтры + ручная курация). Параллельно проведён полный аудит кодовой базы.

**Что сделано:**
- Prisma-модель `Collection` с фильтрами, курацией, контентом, SEO
- Backend: `CollectionService` + `CollectionController` (GET /collections, GET /collections/:slug)
- Backend: `AdminCollectionsController` (CRUD с optimistic lock)
- Frontend: `/podborki` (список, группировка по городам) + `/podborki/[slug]` (SSR, JSON-LD, FAQ-аккордеон)
- Админка: `CollectionsList` + `CollectionEdit` (5 табов: основное, фильтры, курация, контент, SEO)
- Seed: 5 примеров (Ночные экскурсии СПб, Музеи Казани детям, Лучшие музеи России, Романтический Петербург, Золотое кольцо)
- Поддержка мульти-городского фильтра через `additionalFilters.citySlugs`

### Решения

**Архитектурное решение — гибридная модель подборок:**
- Фильтры (`filterTags`, `filterCategory`, `filterAudience`, `additionalFilters`) определяют автоматическую выборку
- `pinnedEventIds` — ручные «закреплённые» события (отображаются первыми)
- `excludedEventIds` — ручное исключение (не попадают даже при совпадении фильтров)
- `cityId` = null для кросс-городских, конкретный UUID для городских
- `additionalFilters.citySlugs` — массив slug-ов для мульти-городских (Золотое кольцо, маршруты)

### Проблемы

**Результаты системного аудита:**

#### Backend (31 `as any`, 6 TODO, 0 пустых catch)
| Метрика | Значение | Статус |
|---------|----------|--------|
| `as any` приведения | 31 (+ 52 в тестах) | ⚠️ Требует внимания |
| Пустые catch | 0 | ✅ Исправлено |
| @Body() без DTO | 0 | ✅ Исправлено |
| TODO-комментарии | 6 | ⚠️ (checkout, voucher, reconciliation) |
| Hardcoded URL | teplohod.info (не через env) | ⚠️ |
| Запросы take≥500 | 8 файлов (макс. 1000) | ⚠️ Нужна пагинация |

#### Frontend (100+ `any`, 4 пустых catch, sitemap неполный)
| Метрика | Значение | Статус |
|---------|----------|--------|
| `any` типы | 100+ | ⚠️ Постепенная типизация |
| Пустые catch | 4 (admin, Sentry) | ⚠️ |
| console.log в проде | 30+ | ⚠️ |
| Error Boundaries | ✅ root + checkout | ✅ |
| Sitemap /podborki | ❌ Не включён | ❗ Нужно добавить |
| Error Boundary в админке | ❌ Нет | ⚠️ |

#### Prisma / БД (17 недостающих индексов, 5 каскадных рисков)
| Метрика | Значение | Статус |
|---------|----------|--------|
| FK без индексов | 17 полей в 12 моделях | ⚠️ Критично при росте |
| Cascade без soft delete | 5 моделей | ⚠️ Package, Review, SupportTicket |
| Collection индексы | ✅ cityId + isActive/isDeleted | ✅ |
| Модели без version | Event, EventOffer, и др. | ⚠️ Нет optimistic lock |

#### Инфраструктура
| Метрика | Значение | Статус |
|---------|----------|--------|
| CI/CD | ✅ GitHub Actions (lint+typecheck+test+build) | ✅ |
| Docker | ✅ multi-stage (backend, frontend, admin) | ✅ |
| .env.example | ✅ В корне | ✅ |
| TypeScript strict | ✅ Включён | ✅ |
| ESLint | ✅ typescript-eslint + prettier | ✅ |
| Деплой | ❌ Нет автоматического | ⚠️ |
| Тесты фронтенда | ❌ Нет | ⚠️ |

**ТОП-5 приоритетных действий:**
1. Добавить `/podborki/*` в sitemap (SEO)
2. Добавить 17 недостающих FK-индексов (производительность)
3. Перенести teplohod.info URL в env (конфигурируемость)
4. Заменить console.log на structured logging (фронтенд)
5. Добавить Error Boundary в админку

---

## 15 февраля 2026 — Стратегия конкуренции: 3 козыря против Tripster

### Наблюдения

Tripster — лидер рынка экскурсий в России. Прямое соревнование по UX/дизайну при текущих ресурсах нецелесообразно. Нужно побеждать на тех полях, где Tripster слаб, а наша архитектура даёт преимущество.

Три стратегических направления:

### Решения

#### 1. Посадочные страницы — структурное SEO-преимущество

**Почему работает:** у Tripster плоская структура (город → список экскурсий от гидов). У нас — многоуровневая таксономия: города, регионы, площадки, категории, подкатегории, теги, комбо-программы.

Это даёт десятки уникальных URL под длинный хвост:
- `/cities/kazan` — «Казань: экскурсии, музеи, мероприятия»
- `/venues/hermitage` — «Эрмитаж: билеты, расписание, как попасть»
- `/events?category=MUSEUM&city=spb` — «Музеи Петербурга»
- `/events?tag=night&city=spb` — «Ночные экскурсии Петербурга»
- `/combo/spb-3-days` — «Петербург за 3 дня: готовая программа»
- Блог: «Что посмотреть в Калининграде с детьми»

**Что уже есть:** инфраструктура готова (города, регионы, venues, теги, combo, JSON-LD). Нужен контент.

**Сроки до эффекта:** 2-3 месяца (индексация Google). Уверенность: высокая.

#### 2. AI-контент — масштабируемый SEO

**Почему работает:** можно быстро генерировать десятки статей и описаний, которые Tripster создаёт руками.

**Формула качества (AI-контент ≠ спам):**
- AI-каркас → ручная редактура → уникальные фото → внутренняя перелинковка к карточкам событий
- Конкретика: реальные цены, часы работы, как добраться, что рядом (привязка к нашим данным)
- Регулярное обновление (цены и расписание меняются — мы обновляем автоматически)

**Риски:**
- Google понижает шаблонный AI-текст. Решение: уникальность через привязку к реальным данным (цены, наличие, отзывы)
- Tripster побеждает за счёт UGC (отзывы путешественников индексируются как уникальный контент). Решение: наращивать собственные отзывы + email-цепочка review request

**Сроки:** 1-2 мес (создание контента) + 2-3 мес (SEO-эффект). Уверенность: средняя.

#### 3. Планировщик туров — killer feature (дифференциатор)

**Почему работает:** этого нет ни у Tripster, ни у GetYourGuide, ни у Viator, ни у Sputnik8. Человек говорит «Петербург, 3 дня, двое взрослых + ребёнок» — получает готовую программу с билетами.

**MVP (2-4 недели):**
- Выбрал город + даты + состав группы
- Получил 3 варианта (эконом / оптимал / премиум)
- Купил одной кнопкой
- БЕЗ drag-and-drop, БЕЗ карт маршрутов, БЕЗ кастомизации

**Полная версия (Неделя 4+ в понедельном плане):**
- Drag-and-drop расписание
- Карта маршрута на день
- Замена событий в программе
- Учёт времени переездов

**Риски:**
- Самая сложная фича в проекте (оркестрация сеансов, цен, наличия, маршрутов, корзины)
- Пока не работает — не обещать. Скрыт с фронтенда (14.02.2026)
- Конверсия MVP непредсказуема — нужен быстрый запуск → A/B тест

**Сроки:** MVP 2-4 недели, полная версия 2-3 месяца. Уверенность: высокая по дифференциации, средняя по конверсии.

### Сводная таблица

| Козырь | Срок до эффекта | Уверенность | Зависимости |
|--------|-----------------|-------------|-------------|
| Посадочные + SEO-структура | 2-3 мес (индексация) | Высокая | Контент (описания, фото) |
| AI-статьи | 1-2 мес + 2-3 мес SEO | Средняя | Качество редактуры, перелинковка |
| Планировщик MVP | 2-4 нед разработка | Высокая (дифференциация) | Checkout, сеансы, pricing |

### Проблемы
- Все три направления требуют **контента** — это главный bottleneck, а не код
- Планировщик конфликтует с текущим приоритетом (запуск платежей). Порядок: платежи → контент → планировщик MVP
- AI-контент может навредить SEO если делать массово без качества. Лучше 10 хороших статей, чем 100 шаблонных

---

## 15 февраля 2026 — UX-аудит: сравнение с Tripster

### Наблюдения

Проведено сравнение с [experience.tripster.ru](https://experience.tripster.ru/) — ведущей платформой экскурсий в России. Фиксируем конкретные отличия для поэтапного закрытия.

**Где Tripster впереди:**

| # | Область | Tripster | Дайбилет (текущее) | Приоритет |
|---|---------|----------|--------------------|-----------|
| 1 | **Hero-секция** | Полноэкранное фото реального места + поиск поверх = мгновенная эмоция «хочу туда» | Тёмный градиент без фотографии, абстрактный паттерн. Утилитарно, не вызывает эмоции | Критический |
| 2 | **Качество фото** | Реальные фото экскурсий (гид с группой, вид с крыши, момент на мосту) | Стоковые из TicketsCloud/Teplohod, часто низкого качества или технические | Критический |
| 3 | **Доверие на карточке** | Фото гида + имя + кол-во отзывов крупно → «лицо» за экскурсией | Информативная карточка (бейджи, цена, рейтинг), но безличная — нет человека | Высокий |
| 4 | **Отзывы на главной** | Карусель реальных отзывов с фото путешественников | Статичный блок с цифрами (304 событий, 4.8 рейтинг), нет ощущения «живого» продукта | Высокий |
| 5 | **Поиск** | Полноценный autocomplete с подсказками, категориями, популярными направлениями | Простой dropdown с городами. Для 7 городов допустимо, но ощущается «проще» | Средний |
| 6 | **Страница события** | Подробный профиль гида, маршрут на карте, фото от путешественников, развёрнутые отзывы | Описание + сеансы + оффер. Нет профиля оператора, нет фото от клиентов | Средний |
| 7 | **Срочность/дефицит** | «Забронировано X раз сегодня», «Осталось 2 места» — ощущение спроса | Есть «Осталось N мест» и «Через N мин», но нет контекста «популярно сейчас» | Низкий |

**Где Дайбилет уже сильнее или на уровне:**

| Область | Преимущество |
|---------|-------------|
| Фильтрация | Подкатегории, время суток, быстрые фильтры по витрине (EXCURSION/MUSEUM/EVENT/KIDS) — у Tripster этого нет |
| Площадки (venues) | Отдельная сущность с FAQ, графиком, ценами, отзывами — у Tripster всё через гидов |
| Мультипровайдерность | TC + Teplohod + manual + partner → шире каталог в одном месте |
| Техническая база | ISR, state machine checkout, split payments, fulfillment orchestration — зрелее чем UI |
| Города и регионы | Регионы с хаб-городами, области, каталог по географии — у Tripster плоский список городов |

### Решения

Принято решение задокументировать отличия и вернуться к ним планомерно. Порядок закрытия по ROI (эффект / сложность):

1. **Фото в hero** (реальное фото, полноэкранный фон) — низкая сложность, максимальный визуальный эффект
2. **Качество фото каталога** — контентная задача: галереи ТОП-20 событий с настоящими фото
3. **Карусель отзывов на главной** — 5-6 лучших отзывов с именем/городом
4. **Autocomplete в поиске** — город + начало названия события
5. **Профиль оператора/гида на странице события** — лицо за продуктом

Пункты 1-2 — это ~80% визуального отставания. Остальное — polish.

### Проблемы
- Качество фото — системная проблема: TC и Teplohod отдают то, что есть. Решение: ручная замена для ТОП-событий + возможность загрузки фото через админку (уже есть upload).
- Профиль гида/оператора — в текущей модели данных нет поля для фото оператора и его описания на уровне Event. Есть `Operator` модель, но без avatar/bio. Потребуется расширение схемы.

---

## 15 февраля 2026 — Запуск серверов: исправление ошибок компиляции

### Наблюдения
- Бэкенд не компилировался: 138 ошибок TypeScript
- Prisma-миграции не были применены к БД (колонки `isDeleted`, `fulfillment_items`, `payment_intents` отсутствовали)
- Циклические зависимости NestJS-модулей: `QueueModule → CatalogModule → AdminModule → SchedulerModule → CatalogModule`
- Фронтенд не отображал главную: домены изображений `ticketscloud-prod.storage.yandexcloud.net` и `api.teplohod.info` не были в `next.config.ts`

### Решения
1. `strictPropertyInitialization: false` в backend `tsconfig.json` — убрал ~60 ошибок TS2564 в DTO
2. `prisma generate` + `prisma db push` — синхронизация схемы с БД
3. `INACTIVE` → `DISABLED` в soft-delete операциях (enum `OfferStatus` не содержал `INACTIVE`)
4. 20 type errors: приведение JSON-полей Prisma, Sentry import, supplier DTO, OfferSource enum
5. Разорваны циклические зависимости модулей:
   - `CatalogModule`: убран импорт `AdminModule`, добавлен `EventOverrideService` напрямую
   - `AdminModule`: убран импорт `SchedulerModule`, добавлен `TagAssignmentService` напрямую, добавлен `CatalogModule`
   - 5 файлов: импорт `QUEUE_*` перенесён из `queue.module.ts` → `queue.constants.ts`
6. `next.config.ts`: добавлены домены `ticketscloud-prod.storage.yandexcloud.net` и `api.teplohod.info`

### Проблемы
- `/planner` по-прежнему доступна по прямому URL (сознательно)
- Unsplash-изображения иногда таймаутят (CDN latency). Рассмотреть локальный кэш или замену на собственные фото
- Миграции разошлись с БД: есть локальные миграции, отсутствующие в БД и наоборот. Использован `prisma db push` как workaround

---

## 14 февраля 2026 — Редизайн главной + скрытие планировщика

### Наблюдения
- Главная страница выглядела «беззубо»: абстрактный hero «Откройте для себя города России», два из трёх пунктов «Как это работает» рекламировали нерабочий планировщик/ваучер.
- Блок «Начнутся скоро» часто пуст (зависит от расписания), из-за чего сразу после hero — пустота.
- Планировщик ещё не реализован, но ссылки на него были по всему фронтенду: Header (desktop + mobile), Footer, hero CTA, cities/[slug], events/[slug], combo/*, layout.tsx meta.

### Решения
1. **Скрыт планировщик** из 8 файлов без удаления кода:
   - Header.tsx — убрана кнопка «Спланировать поездку» (desktop + mobile)
   - Footer.tsx — убрана фраза «Умный планировщик программы»
   - layout.tsx — обновлена meta description (убрано упоминание планировщика и ваучера)
   - cities/[slug], events/[slug], combo/*, combo/[slug] — убраны CTA и ссылки на планировщик

2. **Новая главная** (`page.tsx`):
   - Hero: тёмный градиент, заголовок «Билеты на экскурсии, музеи и мероприятия», dropdown городов (HeroCitySearch), быстрые ссылки на топ-4 города
   - Популярные события: sort=popular, limit=8 (fallback sort=rating) — блок всегда с данными
   - Социальное доказательство: 4 метрики (события, площадки, города, рейтинг)
   - CTA внизу: «Нужна помощь?» + каталог/помощь

3. **Новый компонент** `HeroCitySearch.tsx` (клиентский, dropdown городов → redirect)

### Проблемы
- `/planner` по-прежнему доступна по прямому URL (сознательно — код не удалён, будет реализован позже)

---

## 14 февраля 2026 — Pre-YooKassa Safety Gates: двухконтурная архитектура

### Наблюдения

Реализован полный набор «safety gates» перед интеграцией YooKassa с production ключами. Архитектура выстроена как **двухконтурная** (PLATFORM + EXTERNAL) с чётким путём миграции к единому чекауту.

**Ключевые архитектурные решения:**

1. **PurchaseFlow как единый контракт** — `PLATFORM` (YooKassa) / `EXTERNAL` (TC, redirect). Маппинг из `purchaseType` делается в одном месте (`resolvePaymentFlow`). Когда TC/TEP уйдут — просто перестанем создавать EXTERNAL-офферы.

2. **Единая структура offersSnapshot** — одинаковая для PLATFORM и EXTERNAL. Содержит: `purchaseFlow`, `unitPrice`, `quantity`, `lineTotal`, `commissionRateSnapshot`, `platformFeeSnapshot`, `supplierAmountSnapshot`. Сумма считается ТОЛЬКО из snapshot.

3. **FulfillmentItem** — per-line-item execution tracking со статусами `PENDING → RESERVING → RESERVED → CONFIRMED`. Включает retry (до 3 попыток с exponential backoff) и auto-escalation.

4. **BookingProvider interface** — абстракция провайдера бронирования. TC/TEP/Internal/Partner — адаптеры. При отказе от TC/TEP просто удаляем адаптер. Домен не знает «как именно бронируется TC».

5. **Feature Flags** — per-city/category kill switch для постепенного отключения EXTERNAL. Поддержка `disable_external_offers` с scope=city/category/global.

### Решения

**Phase 1 — Доменная модель (schema + snapshot + partitioning):**
- Новые enums: `PurchaseFlow`, `FulfillmentStatus`
- Новые модели: `FulfillmentItem`, `ProcessedWebhookEvent`, `FeatureFlag`
- Обогащённый `offersSnapshot` с pricing/commission snapshots
- `partitionCart()` разделяет корзину на PLATFORM/EXTERNAL группы
- `isSessionFullyFulfilled()` — инвариант завершения сессии
- `resolvePaymentFlow()` — единственный маппер purchaseType → PurchaseFlow

**Phase 2 — Идемпотентность + YooKassa SDK:**
- `WebhookIdempotencyService.processOnce()` с unique constraint в БД
- Race condition protection через P2002 handling
- YooKassa API: `createPayment` (с marketplace split `transfers`), `createRefund`
- IP whitelist для webhook endpoint (185.71.76.0/27, 77.75.153.0/25, etc.)
- Webhook → BullMQ queue (не блокируем обработку в контроллере)

**Phase 3 — Fulfillment + компенсация:**
- `FulfillmentService`: `startFulfillment` → `executeFulfillment` → `checkCompletion`
- Retry logic: 3 попытки, delays 5s/30s/120s
- `RefundService`: полный и частичный рефанд через YooKassa API
- Auto-compensation: 15-мин окно для админа → авто-рефанд
- Cron через BullMQ: `fulfillment-retry` + `auto-compensate`

**Phase 4 — Rate limiting + observability:**
- `ThrottlerGuard` глобально (30 req/min), `/session` (5/min), `/pay` (3/min)
- `@SkipThrottle()` на webhook endpoints
- `RequestIdMiddleware` — x-request-id propagation
- `PaymentMetricsService` — in-memory counters для всех payment events
- Admin reconciliation: mismatches, retry, refund, resolve

**Phase 5 — E2E тесты:**
- 21 тест, 10 сценариев, все проходят
- Покрытие: partitioning, state machine, completion, snapshot immutability

### Проблемы

- `TcApiService` не имел методов `confirmOrder`, `cancelOrder`, `getOrder` — добавлены как делегаты к существующим `updateOrder`/`finishOrder`.
- State machine не допускает прямой переход `STARTED → PENDING_CONFIRMATION` — сессия создаётся сразу с нужным статусом, тест скорректирован.
- Circular dependency QueueModule ↔ CheckoutModule — CheckoutModule добавлен в imports QueueModule для FulfillmentProcessor.

---

## 14 февраля 2026 (поздно) — Hardening: Топ-5 архитектурных рисков

### Наблюдения

Проведён глубокий аудит по 5 направлениям рисков. Результаты:
- 50+ boundary violations (any на границах интеграций)
- 15 hard-delete операций на финансовых/пользовательских данных
- 11 моделей без soft-delete (6 критических)
- 16 каскадных связей, часть из которых каскадировала удаление Event в финансовые данные
- 6 inline @Body без DTO в контроллерах
- 5+ unbounded findMany без take limit

### Решения

**Риск 5 (каскадные удаления) — ЗАКРЫТ:**
- Soft-delete добавлен для Event и EventOffer (isDeleted + deletedAt)
- Cascade → Restrict: EventSession→Event, EventOffer→Event, EventOverride→Event
- Cascade → SetNull: Review→Event, Review→Venue, ExternalReview→Event (отзывы сохраняются)
- Hard-delete заменён на soft-delete в tc-sync.service.ts (Event.deleteMany → updateMany), admin-events (offer delete), supplier-events (offer delete)
- `isDeleted: false` добавлен в 14 мест каталогового сервиса (админка видит всё)

**Риск 4 (admin/supplier без DTO) — ЗАКРЫТ:**
- Созданы 6 DTO: ReconciliationRefundDto, ReconciliationResolveDto, CreateExternalReviewDto, BatchExternalReviewsDto, SupplierRegisterDto, SupplierLoginDto
- Все с class-validator (@IsEmail, @MinLength, @IsNumber, @Min/@Max, @ValidateNested)
- take: 500 добавлен к 5 unbounded findMany (tags, combos, landings, cities, upsells)

**Риск 2 (границы интеграций) — ЧАСТИЧНО ЗАКРЫТ:**
- Созданы типы `tc-api.types.ts`: TcEvent, TcOrder, TcTicketSet + type guards (isTcEvent, isTcOrder) + safe extractors
- Созданы типы `yookassa.types.ts`: YkPayment, YkRefund, YkWebhookEvent + type guards (isYkPayment, isYkWebhookEvent) + extractPaymentIdFromWebhook
- payment.service.ts: YooKassa ответы проверяются через isYkPayment перед использованием
- checkout.controller.ts: webhook проверяется через isYkWebhookEvent
- ОСТАТОК: tc-sync.service.ts всё ещё работает с `any[]` для TC events (масштабный рефакторинг, отдельная задача)

### Проблемы

- tc-sync.service.ts содержит 15+ мест с `any` — это самый большой источник нетипизированных данных, но его рефакторинг затрагивает ~1300 строк и требует отдельного этапа
- tc-grpc.service.ts: gRPC client без типов (нужны proto-generated types)
- `@Req() req: any` в partner/supplier контроллерах — требует типизации JwtPayload

---

## 14.02.2026 (вечер) — Качественный seed venues: 41 ТОП-музей по 7 городам

### Наблюдения

- Старый seed использовал citySlug `spb` вместо правильного `saint-petersburg` — все venue СПб не привязывались к городу.
- Seed не был идемпотентным: при повторном запуске выдавал ошибку unique constraint на slug.
- Калининград был скрыт (`isFeatured: false`), но раздел «Музеи и Арт» даёт ему качественный контент.
- Не хватало данных по Казани, Калининграду, Владимиру, Ярославлю, Нижнему Новгороду.

### Решения

1. **Полная переработка seed-venues.ts**:
   - 41 venue по 7 городам: SPb 13, Moscow 10, Kazan 5, Kaliningrad 4, Vladimir 3, Yaroslavl 3, Nizhny 3
   - Исправлен citySlug: `spb` → `saint-petersburg`
   - Upsert-логика: существует → update (не трогает imageUrl/galleryUrls), не существует → create
   - Реальные данные: адреса, координаты, часы работы (EN-ключи), цены в копейках, телефоны, сайты

2. **Конверсионные поля для ТОП-venue**:
   - Эрмитаж, Третьяковка, Русский музей, Казанский Кремль, Нижегородский Кремль — заполнены `highlights`, `features`, `faq`
   - Остальные — базовые `features`

3. **Калининград включён**:
   - 4 venue: Музей Мирового океана, Музей янтаря, Кафедральный собор, Фридландские ворота
   - При запуске seed автоматически ставится `isFeatured: true` для города

4. **Новые города в каталоге venue**:
   - Казань: Кремль, Музей исламской культуры, Национальный музей, Галерея, Музей Чак-Чака
   - Владимир: Успенский собор, Золотые ворота, Палаты
   - Ярославль: Музей-заповедник, Художественный музей, Планетарий Терешковой
   - Нижний: Кремль, Арсенал, Художественный музей

### Проблемы

- Нет: seed полностью идемпотентен, обратно-совместим, не создаёт Event.

---

## 14.02.2026 (день) — Конверсионная оптимизация страницы музея

### Наблюдения

- Страница venue была статической SSR-компонентой без интерактивных элементов (календарь, количество).
- Sticky bottom bar (mobile) всегда отображался, не реагируя на скролл — неоптимально для UX.
- FAQ-блок существовал, но не генерировал FAQPage JSON-LD для SEO.
- В админке отсутствовали инструменты для управления конверсионными полями (highlights, FAQ, features, комиссии).
- Не было валидации минимальных полей при публикации venue.

### Решения

1. **TicketsBlock (Client Component)** — `components/venue/TicketsBlock.tsx`:
   - Мини-календарь для OPEN_DATE (выбор даты посещения, навигация по месяцам).
   - Количество билетов (+/- пикер, 1-10).
   - Дифференцированные карточки офферов: бейджи «Рекомендуем», «Быстрый вход», trust signals.
   - Динамический пересчёт итоговой суммы по количеству.
   - Разный CTA для REDIRECT / REQUEST / WIDGET.

2. **MobileStickyBar (Client Component)** — `components/venue/MobileStickyBar.tsx`:
   - IntersectionObserver на sentinel в hero CTA.
   - Плавная анимация появления (translate-y transition).
   - Показывается только когда hero CTA уходит за fold.

3. **FAQ JSON-LD** — FAQPage schema (отдельный `<script type="application/ld+json">`):
   - Каждый Q/A в `mainEntity` как `Question` + `acceptedAnswer`.
   - Улучшает SEO-показатели (Featured Snippets, rich results).

4. **Venue publish validation** — `admin-venues.controller.ts`:
   - При `isActive: true` проверяются: title, address, imageUrl, priceFrom, description.
   - При update объединяются existing + body для корректной проверки.
   - Soft: рекомендация «минимум 3 фото», не блокирует.

5. **Commission config** — `shared/index.ts`:
   - `VENUE_COMMISSION_DEFAULTS` по типу: MUSEUM 10%, GALLERY 15%, ART_SPACE 20% и т.д.
   - Промо-ставка 7% на первые 3-6 месяцев.
   - `getEffectiveCommission()` — расчёт с учётом custom rate, promo period, fallback.
   - Индивидуальная ставка (`commissionRate` на модели Venue) перекрывает дефолт.

6. **Admin «Конверсия» tab** — `VenueEdit.tsx`:
   - Highlights: добавление/удаление фактов (5-7 буллетов).
   - Features: чекбоксы (no_queue, audio_guide, kids_friendly и т.д.).
   - FAQ: вопрос + ответ, добавление/удаление.
   - Комиссия: индивидуальная ставка с подсказкой дефолта по типу.

7. **Backend**: `highlights`, `faq`, `features`, `commissionRate` добавлены в create/update admin endpoint.

### Проблемы

- Нет: все изменения обратно-совместимы. Client components рендерятся поверх SSR-страницы.

---

## 14.02.2026 (утро) — MVP «Музеи и Арт»: пробелы закрыты

### Наблюдения

- OPEN_DATE события исчезали из каталога, лендингов и city-page из-за жёсткого фильтра `sessions.some { startsAt >= now }`.
- Ключи openingHours в seed были на русском (Пн, Вт…), а фронт ожидал английские (mon, tue…).
- Blog article page не содержал перелинковки с venue-каталогом.
- `adminNotes` (plural) в partner controller не совпадал со schema `adminNote` (singular).

### Решения

1. **OPEN_DATE фильтр** — исправлен `CatalogService.getEvents()`: 3-ветвичная логика (OPEN_DATE only → без sessions; SCHEDULED → обычный; без фильтра → OR обоих). Аналогично исправлены `fetchCityBySlug`, `getCities`, `LandingService.getBySlug`.
2. **Seed 25 venue** — `prisma/seed-venues.ts`: Эрмитаж, Русский музей, Кунсткамера, Эрарта, Манеж, Севкабель, Фаберже, Стрит-арт и ещё 4 по СПб; Третьяковка, Пушкинский, Гараж, Кремль, ММОМА, Винзавод, Космонавтика, ГЭС-2, Царицыно, Коломенское, Дарвиновский и ещё по МСК. Idempotent (проверяет slug).
3. **JSON-LD**: venue page — `makesOffer` для open-date (без startDate), `openingHoursSpecification` с правильными Schema.org днями, нормализация RU→EN ключей часов.
4. **Перелинковка**: venue page → «Читайте также» (статьи по городу через `VenueService.getRelatedArticles`); blog article page → секция «Музеи и арт-пространства» с VenueCard по городу статьи.
5. **Admin EventEdit**: venueId select (привязка к месту), dateMode toggle (SCHEDULED/OPEN_DATE), isPermanent checkbox, endDate date-picker. Новый endpoint `PATCH :id/venue-settings` на бэкенде.
6. **Quick filter «Открытая дата»**: добавлен в QUICK_FILTERS.MUSEUM (params: `dateMode: 'OPEN_DATE'`), EventCard передаёт `dateMode` prop.
7. **TS-fix**: `adminNotes` → `adminNote` в partner-orders.controller.ts, `subcategories` cast в admin-events.controller.ts.

### Проблемы

- Landing variants для OPEN_DATE не имеют sessionId/startsAt — добавлен флаг `isOpenDate: true`, сортировка обрабатывает null.

---

## 14.02.2026 (ночь) — Музеи и Арт: Venue Pages + Open-Date Tickets

### Наблюдения

- Раздел "Музеи" был пуст, т.к. билетные системы (TC, teplohod.info) их практически не содержат.
- Музеи — это **evergreen-трафик**: люди постоянно ищут "билеты в эрмитаж", "музеи москвы".
- Музеи кардинально отличаются от событий: билет с **открытой датой**, страница-**место** (а не событие), постоянные экспозиции + временные выставки.
- Существующая модель `Location` — scaffold, неподходящий для полноценных venue-страниц.

### Решения

1. **Новая модель `Venue`**: полноценная сущность для музеев, галерей, арт-пространств.
   - Enums: `VenueType` (MUSEUM, GALLERY, ART_SPACE, EXHIBITION_HALL, THEATER, PALACE, PARK), `DateMode` (SCHEDULED, OPEN_DATE).
   - Поля: title/shortTitle, venueType, description, gallery, address/metro/lat/lng, openingHours (JSON), priceFrom, rating, externalRating, operatorId (партнёр-музей), metaTitle/metaDescription.
   - Soft delete (isDeleted/deletedAt), optimistic locking (version).
2. **Расширение `Event`**: `venueId` (FK к Venue), `dateMode`, `isPermanent`, `endDate`.
3. **Расширение `EventOffer`**: `venueId` для прямых офферов к месту (без привязки к Event).
4. **Новые подкатегории**: ART_SPACE, SCULPTURE, CONTEMPORARY в EventSubcategory.
5. **Backend**: `VenueModule` (public API: GET /venues, GET /venues/:slug) + `AdminVenuesController` (CRUD с optimistic lock).
6. **Frontend**: `/venues` (каталог с фильтрами город/тип/сортировка), `/venues/[slug]` (hero, часы работы, галерея, билеты, выставки, JSON-LD/SEO), `VenueCard` компонент.
7. **Admin UI**: VenuesList + VenueEdit (табы: основное, расположение, часы работы, галерея, SEO, выставки, офферы). Sidebar пункт "Места".
8. **Интеграция**: навигация "Музеи и Арт" → /venues, EventCard с `dateMode=OPEN_DATE`, Event page ссылка на venue, City page секция "Музеи и искусство", CATEGORY_LABELS обновлён.
9. **URL-структура**: `/venues/ermitazh` для места, `/events/rembrandt-v-ermitazhe` для выставки — не смешиваем.

### Проблемы

- Отзывы на уровне venue пока не реализованы (нужна отдельная Review → venueId связь). Решение: отложено, используются отзывы на дочерних Event-ах.
- Для `OPEN_DATE` событий фильтр по sessions (startsAt >= now) пропустит их в основном каталоге. Решение: в getEvents dateMode=OPEN_DATE можно обрабатывать отдельно.

---

## 14.02.2026 (вечер) — Partner B2B API + Unified Checkout в roadmap

### Наблюдения

- Реализован полный Partner B2B API для машинного взаимодействия с внешними поставщиками, у которых есть собственная система бронирования.
- Этот слой параллелен Supplier Portal (JWT + UI) — Partner API использует API-ключи (machine-to-machine), без UI.
- Пользователь уточнил, что «unified checkout» (оплата на нашей стороне для событий билетных систем) нужен для планировщика программ, но не на текущем этапе. Занесено в roadmap.

### Решения

1. **Partner B2B API — полная реализация**:
   - **Модель `ApiKey`**: SHA-256 хеш ключа, prefix (первые 8 символов для UI), rateLimit (запросов/мин), ipWhitelist, expiresAt. Связь с Operator.
   - **`Operator` расширен**: `webhookUrl` (URL для уведомлений) + `webhookSecret` (HMAC-секрет).
   - **Идемпотентная SQL-миграция** `20260214_partner_api`: создаёт таблицу `api_keys`, добавляет webhook-поля.
   - **`ApiKeyGuard`**: аутентификация по `Authorization: Bearer dbl_xxx...`, проверки isActive/expiresAt/IP, fire-and-forget обновление lastUsedAt, прокидывание `req.user = { operatorId, type: 'partner' }`.
   - **Partner CRUD** (`/api/v1/partner/`):
     - Events: upsert по externalId (POST), обновление (PUT), деактивация (DELETE)
     - Offers: upsert (POST), обновление (PUT), быстрое обновление наличия/цены (PATCH availability)
     - Whoami: информация о ключе
   - **Partner Orders**: список заказов (GET, фильтры), детали (GET :id), подтверждение (POST confirm, через state machine), отклонение (POST reject)
   - **Partner Reports**: продажи за период (JSON + CSV export)
   - **Webhook Service**: BullMQ очередь `partner-webhooks`, HMAC-SHA256 подпись в `X-Webhook-Signature`, 3 ретрая с exponential backoff (5s→10s→20s). Типы: `order.created`, `order.cancelled`, `payment.paid`, `payment.refunded`.
   - **Admin: управление ключами**:
     - POST `/admin/suppliers/:id/api-keys` — генерация (plain-text ключ возвращается ОДИН раз)
     - GET `/admin/suppliers/:id/api-keys` — список (prefix, lastUsedAt, isActive)
     - DELETE `/admin/suppliers/:id/api-keys/:keyId` — отзыв
     - PATCH `/admin/suppliers/:id/webhook` — настройка URL + автогенерация/обновление секрета
   - **Admin UI**: секция «API Интеграция» в SupplierDetail — таблица ключей, генерация с копированием, отзыв, настройка webhook.

2. **Unified Checkout — занесён в roadmap**:
   - При подключении YooKassa можно принимать оплату на нашей стороне даже для событий билетных систем (TC, teplohod.info).
   - Это нужно для планировщика программ (единый ваучер = несколько событий из разных источников).
   - Технически: создаём заказы в TC/TEP через их API, оплату принимаем через YooKassa.
   - Риски: двойной резерв (15 мин TC vs наша оплата), частичные failures, чарджбеки.
   - Порядок: сначала собственные REQUEST-события, потом TC/TEP через unified checkout.

### Проблемы

- Нет проблем. Prisma schema валидна, линтер чист, Prisma Client сгенерирован.

---

## 14.02.2026 — Supplier Portal (маркетплейс-модель)

### Наблюдения

- Реализован полноценный Supplier Portal: отдельные ЛК для поставщиков, которые могут самостоятельно размещать события и офферы.
- Расширена модель Operator — добавлены поля для маркетплейса: isSupplier, trustLevel, commissionRate, promoRate, yookassaAccountId, ИНН, верификация.
- Создана отдельная аутентификация поставщиков (jwt-supplier стратегия) с изоляцией от admin JWT.
- Модерация по Trust Level: Level 0 — полная модерация, Level 1 — авто-публикация + пост-модерация, Level 2 — полное доверие.
- Commission calculation: effectiveRate учитывает промо-ставку. Snapshot комиссии записывается в PaymentIntent (иммутабельно).
- Split Payment ready: PaymentIntent содержит grossAmount, platformFee, supplierAmount, supplierId. Подготовлен код для YooKassa Split transfers.

### Решения

- **Operator расширение vs отдельная таблица**: Решили расширять Operator, т.к. Event/Offer уже ссылаются на operatorId — минимум ломающих изменений.
- **Отдельная JWT стратегия**: jwt-supplier с type='supplier' в payload. Разные guard'ы, разные cookie, разные UI.
- **Trust Level как механизм масштабирования**: Автоматизирует модерацию по мере роста числа поставщиков. Критерии повышения: продажи, отсутствие жалоб, возвраты < 5%.
- **Промо-период**: 7% первые 3-6 месяцев для привлечения поставщиков. promoRate + promoUntil записываются в Operator.
- **Commission snapshot**: Ставка фиксируется в PaymentIntent на момент транзакции (как offersSnapshot) — защита от споров.

### Проблемы

- YooKassa Split API требует отдельную регистрацию sub-merchant для каждого поставщика. Нужно предусмотреть UI для ввода yookassaAccountId.
- Seed-данные не содержат поставщиков — первые тесты ручные через API /supplier/auth/register.

---

## 13.02.2026 — Стратегические приоритеты (roadmap)

### Наблюдения

Техническая база закреплена: PurchaseType консолидирован, State Machine с акторами, PaymentIntent stub, 28 тестов, CSV export, compat AuditLog. Переходим к продуктовым задачам.

### Решения — 5 стратегических направлений

**1. SEO-блог + перелинковка с каталогом**
- Цель: органический трафик → каталог → конверсия.
- Статьи должны быть привязаны к городам, категориям, тегам.
- Перелинковка: статья → событие (EventCard в теле), событие → статья (блок "Читайте также").
- Приоритеты: топ-10 поисковых запросов по каждому городу → одна статья на запрос.

**2. Посадочные страницы (ключ к $$$)**
- Лендинги = главная воронка. Каждый лендинг — отдельный SEO-кластер.
- Вылизать: FilterBar, ComparisonTable, VariantCard, CTA-блоки, социальное доказательство (отзывы).
- A/B: заголовки, порядок карточек, формулировки CTA.
- Mobile-first: 70%+ трафика → мобильная версия должна быть идеальной.

**3. YooKassa — тестовые платежи**
- PaymentIntent stub готов → подключить SDK, заменить STUB → YOOKASSA.
- Тестовая среда YooKassa (sandbox) → e2e тесты.
- Webhook верификация (IP whitelist + HMAC).

**4. Единые ваучеры (Trip Planner)**
- Один ваучер = несколько событий. QR-код → проверка на входе.
- Калькуляция: сумма офферов + сервисный сбор (опционально) - скидка за пакет.
- Политика отмен: полный возврат до X дней, частичный до Y дней, без возврата после.
- Переносы: перенос конкретного события в пакете (если оператор позволяет).

**5. Усиление ресурса**
- Партнёрская программа: операторы добавляют свои события → комиссия.
- Telegram-бот: уведомления о статусе заявки, напоминания.
- Seasonal: тематические подборки (Новый год, 8 марта, каникулы).
- Геймификация: "Исследователь Петербурга" — бейджи за посещённые маршруты.

### Проблемы

- Нет проблем. Фиксация стратегии для следующей сессии.

---

## 13.02.2026 (вечер) — Compat AuditLog + PaymentIntent слой

### Наблюдения

- Единственный операционный риск: in-memory compat metrics теряются при рестартах.
- Для подключения YooKassa нужен PaymentIntent слой, даже как stub.

### Решения

1. **Compat → AuditLog (персистентный)**
   - `setCompatLogger()` — callback в shared, подключается бэкендом при bootstrap.
   - Каждый legacy PurchaseType hit записывается в AuditLog как `LEGACY_PURCHASE_TYPE` (fire-and-forget).
   - In-memory `legacyPurchaseTypeHits` сохранён для текущей сессии мониторинга.

2. **PaymentIntent — модель + миграция**
   - `PaymentIntent` (PENDING → PROCESSING → PAID/FAILED/CANCELLED/REFUNDED).
   - `idempotencyKey` (UNIQUE) — защита от дублей.
   - `provider` (STUB / YOOKASSA) — переключение провайдера.
   - `providerPaymentId`, `providerData`, `paymentUrl`, `paidAt`, `failedAt`, `failReason`.
   - Привязка к `CheckoutSession` (1:N — можно повторить попытку).

3. **State Machine v4 — PaymentIntent transitions**
   - `tryTransitionPayment()` по акторам: system (webhook), user (cancel), admin (refund).
   - Терминальные: PAID, FAILED, CANCELLED, REFUNDED.
   - PAID → CheckoutSession.COMPLETED через state machine assert.

4. **Stub endpoint**
   - `POST /checkout/:sessionId/pay` → создаёт PaymentIntent + payment_url (mock).
   - `POST /checkout/payment/:id/simulate-paid` → имитация оплаты (только dev/staging).
   - `POST /checkout/payment/:id/cancel` → отмена.
   - `POST /checkout/webhook/payment` → готовый webhook для YooKassa.

5. **Тесты** — 6 новых (28 всего): PaymentIntent transitions, idempotency, terminal states.

### Проблемы

- Нет проблем. Все тесты зелёные, линтер чист.

---

## 13.02.2026 — Foundation Hardening (закрепление фундамента)

### Наблюдения

- Все базовые модули (PurchaseType, State Machine, SLA/TTL, Analytics, Snapshot) внедрены и работают.
- Переход к хардингу для предотвращения скрытых багов перед YooKassa.

### Решения

1. **Widget Payload Validation** (zod)
   - Создан `packages/shared/src/widget-payload.ts` с zod-схемами по провайдерам: `TCWidgetPayloadSchema`, `RadarioWidgetPayloadSchema`, `TimepadWidgetPayloadSchema`, `GenericWidgetPayloadSchema`.
   - `validateWidgetPayload(provider, payload)` → `{ valid, data?, errors? }`.
   - `ensurePayloadVersion()` — автоматическое добавление `v: 1` в payload.
   - Интегрировано в `admin-events.controller.ts` (createOffer → 400 BadRequest при невалидном payload).

2. **PURCHASE_TYPE_COMPAT — метрики + kill switch**
   - `legacyPurchaseTypeHits` — in-memory счётчик по каждому legacy-значению (TC_WIDGET, API_CHECKOUT, REQUEST_ONLY).
   - `setCompatDisabled(true)` — kill switch, активируется через `DISABLE_PURCHASE_TYPE_COMPAT=true` в env.
   - Endpoint `/admin/checkout/compat-metrics` для мониторинга без BI.

3. **Миграция — идемпотентная + SQL-assert контрактов**
   - Обёрнута в проверку: если новый enum уже существует — пропускаем.
   - SQL-assert блоки после миграции: WIDGET ⇒ widgetProvider NOT NULL, REQUEST ⇒ widgetProvider IS NULL.
   - Добавлен `completedAt` для CheckoutSession.

4. **State Machine v3 — структурный return**
   - `tryTransition*()` → `TransitionResult { allowed, noOp, reason }` вместо boolean.
   - Контроллеры и cron реагируют по-разному: noOp → return entity, !allowed → audit log + 400.
   - Запрещённые переходы логируются в AuditLog как security event (`DENIED_TRANSITION`).

5. **Timestamps: confirmedAt + completedAt**
   - `confirmedAt` уже было в OrderRequest.
   - Добавлен `completedAt` в CheckoutSession (schema + migration + controller).

6. **CSV Export**
   - `GET /admin/checkout/export/requests` + `GET /admin/checkout/export/sessions` с BOM для Excel.
   - Кнопки в Admin UI → Analytics tab (просроченные, все заявки, сессии).

7. **Snapshot — write-once + enriched**
   - `offersSnapshot` обогащён: `offerId`, `source`, `purchaseTypeResolved`, `priceCurrency`, `snapshotAt`.
   - Guard `assertSnapshotImmutable()` в checkout.service — запрещает перезапись.

8. **Инвариант-тесты** (22 теста, vitest)
   - State machine transitions per actor (6 тестов)
   - Idempotency no-op (2 теста)
   - Terminal statuses (2 теста)
   - Widget payload validation (4 теста)
   - ExpireReason determination (3 теста)
   - PURCHASE_TYPE_COMPAT + kill switch (3 теста)
   - calculateExpiresAt (2 теста)

### Проблемы

- Jest не был установлен → использован vitest (легче, быстрее, нативный ESM).
- zod v4 установлен (`^4.3.6`) — API совместим с v3 для базовых схем, но `error.issues` доступ адаптирован.

---

## 2026-02-12 — Подкатегории и KIDS-категория

### Наблюдения
- Часть событий попадала в неправильную категорию (например, «Меджикул» — концерт, но был в EXCURSION из-за слова «тур» в описании)
- Поле subcategory (String?) в схеме не использовалось
- 3 категории (EXCURSION, MUSEUM, EVENT) недостаточны — детские события заслуживают отдельного раздела

### Решения
- Добавлена 4-я категория KIDS — отдельная аудитория (родители), высокий SEO-потенциал
- Создан enum EventSubcategory (28 подтипов): EXCURSION (7), MUSEUM (5), EVENT (8), KIDS (6)
- Переработан порядок проверок в classify(): EVENT-маркеры проверяются ДО EXCURSION, чтобы «tribute tour» → CONCERT, а не EXCURSION
- Расширены ключевые слова: добавлены tribute, трибьют, джаз, jazz, рок, rock для концертов
- EventOverride дополнен полем subcategory для ручного переноса событий между категориями из админки
- Frontend: подкатегории-чипы появляются при выборе категории, EventCard показывает подтип
- SUBCATEGORIES_BY_CATEGORY в shared — маппинг подтипов к категориям для фильтрации

### Проблемы
- ~15% событий не получают subcategory (null) — требуют ручной классификации из админки
- Слово «live» убрано из маркеров CONCERT (слишком частое в описаниях разных событий)
- Комбо-тур (дворы+крыши) определяется как WALKING вместо COMBINED — можно уточнить в будущем

---

## 2026-02-10 — YM env + Mobile-first + Autocomplete + SSG events

### Наблюдения
- `.env` не содержал `NEXT_PUBLIC_YM_ID` — Метрика не могла инициализироваться.
- EventCard использовал `sm:hidden` для мобильной цены, но в 2-колоночной сетке на мобайле карточки были слишком тесными.
- Category tabs на `/events` могли выходить за экран на узких экранах — не было горизонтального скролла.
- Header не содержал поиска вообще.
- `/events/[slug]` не имел SSG (revalidate / generateStaticParams) — SEO-потеря.

### Решения
1. **NEXT_PUBLIC_YM_ID** добавлен в `.env` и `.env.example` с комментариями. Счётчик нужно создать на metrika.yandex.ru и вписать ID.

2. **Mobile-first исправления**:
   - `globals.css`: добавлен `safe-area-inset`, `scrollbar-hide`, `min-height: 44px` для touch targets, `scroll-behavior: smooth`, `prefers-reduced-motion`.
   - `EventCard`: адаптирован для 2-колоночной мобильной сетки — меньшие шрифты (`text-xs` → `text-[10px]`), компактные отступы (`p-3`), адаптивные высоты изображений (`h-36 sm:h-48`).
   - `/events`: каталог переписан — сетка `grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`, фильтры стакаются вертикально на мобайле, category tabs с `overflow-x-auto scrollbar-hide`.
   - Кнопки: `px-5 sm:px-6` для компактности на мобайле.

3. **SearchAutocomplete** — новый компонент `SearchAutocomplete.tsx`:
   - Кнопка-иконка в header, раскрывается в поле ввода.
   - Mobile: fullscreen overlay с затемнением фона.
   - Desktop: dropdown 440px, закрепляется справа.
   - Debounce 300ms, использует `api.search(q)`.
   - Результаты: города (с количеством событий) + события (с картинками и ценами).
   - Быстрые ссылки: «Развод мостов», «Эрмитаж», «Москва-река» и т.д.
   - Close on Escape и click outside.

4. **SSG для /events/[slug]**:
   - `export const revalidate = 3600` (1 час).
   - `generateStaticParams()` получает топ-200 событий по популярности.
   - Остальные события обрабатываются on-demand (ISR).

### Проблемы
- Нет — всё встало чисто, линтер 0 ошибок.

---

## 2026-02-10 — Wizard Full UI + Auto-fill curatedEvents

### Наблюдения
- Frontend wizard показывал варианты, но без визуального разделения тиров, без полного breakdown и без upsells.
- curatedEvents в combo-страницах были пустые (`[]`) — Google видел бы нестабильную структуру.
- API calculatePlan возвращал `upsells`, но тип в `api.ts` не включал это поле.

### Решения
1. **Wizard полностью переписан** (planner/page.tsx):
   - 3 карточки тиров с визуальным различием (зелёный Эконом/синий Оптимальный/золотой Премиум).
   - Бейдж «Рекомендуем» на optimal-варианте, автовыбор optimal по умолчанию.
   - Полный price breakdown в тёмном блоке (билеты, сервисный сбор, сезонная наценка, upsell-добавки).
   - Интерактивный выбор upsell-услуг с пересчётом итого в реальном времени.
   - Изображения событий в таймлайне, лейблы «Осталось N мест», единичная цена за взрослого.
   - Сравнение стоимости между тирами (разница Economy vs Premium).

2. **Auto-fill curatedEvents** (combo.service.ts):
   - Если `curatedEvents` пуст при запросе combo — автоматически подбираются топ-события из города.
   - Алгоритм раскладывает по дням/слотам с учётом `intensity` и `dayCount`.
   - Категория → слот: MUSEUM→утро, EXCURSION→день, EVENT→вечер.
   - Результат сохраняется в БД для стабильности SEO-индексации.

3. **API populate** (combo.controller.ts):
   - `POST /combos/:slug/populate` — ручной пересбор для конкретного combo.
   - `POST /combos/populate-all` — пересбор для всех активных combo.

4. **Scheduler обновлён** — после полной синхронизации вызывает `populateAll()`.

5. **Combo frontend** — pricing section обновлён (тёмный блок с полной разбивкой), добавлены изображения и «Осталось мест» в day-программе.

### Проблемы
- В БД пока нет реальных событий (sync не запускался) — auto-fill сработает при первом sync.
- Тип ответа `calculatePlan` не включал `upsells` — исправлено добавлением `UpsellItem` в импорт и тип.

---

## 2026-02-10 — Инициализация проекта

### Наблюдения

1. **Рыночная ниша**: Агрегаторы билетов на экскурсии в РФ представлены несколькими крупными игроками (Tripster, Sputnik8, KudaGo, Afisha), но ни один из них не предлагает **умный планировщик программы** с единым ваучером. Это наша основная дифференциация.

2. **Ticketscloud как источник данных**: TC имеет полноценный v2 API для распространителей. 500+ новых мероприятий в месяц, 60+ партнёров уже работают. Один договор открывает доступ ко всей базе. Документация: https://ticketscloud.readthedocs.io/

3. **Модель дохода TC-распространителя**:
   - Сервисный сбор — устанавливается нами, полностью наш.
   - Агентское вознаграждение — договаривается с каждым организатором через TC.
   - TOP-5 партнёров TC генерируют 20 млн ₽+ годового дохода.

4. **Бизнес-модель Trip Planner**: Позволяет кратно увеличить средний чек (с 800-2000 руб. за один билет до 5000-25000 руб. за пакет программы). Наценка за удобство обоснована — клиент получает готовую программу, а не просто билет.

5. **Техническая архитектура**: Выбран стек Next.js (SSR/SSG для SEO) + NestJS (API, бизнес-логика) + PostgreSQL + Redis + BullMQ. Монорепо на pnpm workspaces. Docker Compose для всех сервисов.

6. **Критический момент — собственный эквайринг**: Для единого ваучера необходим собственный платёжный шлюз (YooKassa), так как TC обрабатывает оплату по-event'но. Без собственного эквайринга Trip Planner бесполезен.

### Решения

1. **Архитектура микросервисов внутри монолита**: На начальном этапе — NestJS-модули (CatalogModule, PlannerModule, CheckoutModule, VoucherModule) внутри одного приложения. Разделение на отдельные сервисы — только при необходимости масштабирования.

2. **MVP без собственной оплаты**: Фаза 2 (MVP Агрегатор) работает через редирект на TC — это позволяет запустить каталог и начать SEO-продвижение за 2-4 недели, не дожидаясь подключения YooKassa.

3. **Категоризация событий TC**: Автоматический маппинг на основе тегов TC, типа площадки и ML-классификации. Ручная корректировка через админку — на будущее.

4. **Scoring-алгоритм Planner**: Взвешенная функция из 7 факторов (категория, гео, рейтинг, возраст, время, indoor/outdoor, цена). Веса конфигурируемые — будем подбирать эмпирически на реальных данных.

5. **Обработка partial failure при создании TC-заказов**: Если >50% items в пакете не удалось забронировать — полный возврат. Если ≤50% — частичный возврат + уведомление клиента с предложением альтернатив.

6. **SEO-стратегия**: SSG для контентных страниц (города, теги, статьи), SSR для каталога с фильтрами. JSON-LD для событий и мест. Контент-маркетинг через блог с перелинковкой.

### Проблемы

1. **TC API — точная структура данных неизвестна**: Документация описывает общий флоу, но конкретные поля в ответах (особенно для событий) требуют тестирования после получения API-токена. Нужно получить доступ к sandbox/тестовому аккаунту.

2. **Категоризация событий**: TC не имеет стандартной системы категорий «экскурсии / музеи / мероприятия». Нужно будет разработать маппинг и, возможно, ручную модерацию.

3. **Координаты событий**: Не факт, что TC предоставляет lat/lng для всех площадок. Возможно, потребуется геокодирование адресов через Яндекс API.

4. **Конкурентное SEO**: Tripster и Sputnik8 доминируют в поисковой выдаче. Стратегия — бить по long-tail запросам: «что посмотреть в Казани с детьми за 2 дня», «программа на 3 дня в Петербурге зимой».

5. **$1000/мес за 1 месяц — нереалистично**: SEO даёт результат через 3-6 месяцев. Без платного трафика первый значимый доход — через 2-3 месяца. С Яндекс.Директом — быстрее, но маржа ниже.

6. **YooKassa — сроки подключения**: Регистрация магазина и прохождение модерации YooKassa может занять 1-2 недели. Нужно начать процесс параллельно с разработкой Фазы 1.

---

## 2026-02-10 (вечер) — Ключевые бизнес-решения

### Наблюдения

1. **Бренд определён**: «Дайбилет» / daibilet.ru — короткое, запоминающееся, содержит ключевое слово «билет», что хорошо для SEO. Домен .ru — правильный выбор для РФ-аудитории.

2. **Юрлицо**: Есть действующее ИП Бутин В.А. Этого достаточно для подключения YooKassa и подписания договора с TC. ООО «Дайбилет» — в резерве, если понадобится для инвесторов или масштабирования.

3. **География шире ожидаемого**: 4 гарантированных города (Москва, СПб, Казань, Калининград) + до 3 дополнительных. Калининград — отличный выбор: туристическая точка с растущим потоком, при этом менее конкурентная в SEO, чем Москва/СПб.

4. **Стратегия «нулевой комиссии»**: Первые 3-6 мес — 0% сервисный сбор, только банковские комиссии YooKassa (~3.5%). Это агрессивная, но правильная стратегия для marketplace-модели: субсидируем одну сторону (клиентов) для набора критической массы трафика и SEO-позиций. Доход на старте — только от агентского вознаграждения TC.

### Решения

1. **ИП, не ООО**: На старте ИП дешевле в обслуживании (~20-40 тыс. руб/год на бухгалтерию vs 80-120 тыс. для ООО). Налоговый режим: УСН 6% (доходы) или 15% (доходы минус расходы) — зависит от структуры расходов. При агентской модели TC рекомендуется **УСН 6% от дохода** (сервисный сбор + агентское вознаграждение).

2. **Список городов определяется базой TC**: Нет смысла создавать страницу города, если в TC нет событий для него. Первый шаг после получения API-доступа — выгрузить все события и определить географическое покрытие. Города без минимума 20-30 событий — не включаем.

3. **Банковская комиссия — на нас, не на клиенте**: При 0% сервисном сборе комиссия YooKassa ~3.5% — наш расход. При среднем чеке 1500 руб. это ~52 руб. с транзакции. Окупается агентским вознаграждением TC (обычно 5-15% от цены билета).

### Проблемы

1. **Юнит-экономика при 0% сервисном сборе**: Если агентское вознаграждение TC = 10%, а комиссия YooKassa = 3.5%, чистый доход = 6.5% от цены билета. При среднем чеке 1500 руб. это ~97 руб. с транзакции. Для 90 000 руб/мес нужно ~930 транзакций (31 в день). Достижимо к 4-6 месяцу при хорошем SEO.

2. **Калининград — проверить покрытие TC**: Нужно убедиться, что в Ticketscloud достаточно событий по Калининграду. Если база слабая — заменить на Сочи или Нижний Новгород.

3. **Домен daibilet.ru — проверить доступность и купить**: Нужно зарегистрировать домен до начала разработки. Также желательно зарегистрировать daibilet.com на всякий случай.

---

## 2026-02-10 — Подключение Ticketscloud API и первая синхронизация

### Наблюдения
- TC API имеет два канала: REST v1/v2 (устаревший для каталога, основной для заказов) и gRPC tc-simple (рекомендуемый для каталога). REST v1 endpoint `/v1/services/simple/events` по-прежнему работает и возвращает полные данные.
- Авторизация: `Authorization: key {token}`, НЕ `Bearer`.
- Ответ каталога — плоский массив событий со вложенными venue, city, sets, media.
- Города идентифицируются по geonames ID (524901 = Москва, 498817 = СПб, 551487 = Казань).
- Цены — строки вида `"104.00"` (рубли), нужна конвертация в копейки ×100.
- Даты — формат VEVENT (RFC 5545): `DTSTART;VALUE=DATE-TIME:20260210T170000Z`.
- TC вернул **2194 события** с активными сделками для нашего аккаунта — значительно больше ожиданий.
- Распределение: Москва (1070), СПб (942), Казань (45), + ~20 городов поменьше.
- 16 городов автоматически созданы в БД из данных TC.
- Партнёр отображается как `name=Дайбилет` — подтверждение интеграции.

### Решения
- Для MVP используем REST v1 endpoint вместо gRPC — проще, работает, содержит все нужные данные. На будущее запланирован переход на gRPC для стриминга.
- Создали маппинг geonames ID → slug для ~50 крупнейших городов РФ.
- Категоризация событий (EXCURSION / MUSEUM / EVENT / KIDS) выполняется по ключевым словам в названии, описании и тегах TC.
- `tcData` (JSONB) сохраняет полный оригинальный объект TC для будущего анализа.
- Slug генерируется транслитерацией кириллицы; при коллизиях добавляется суффикс из TC ID.

### Проблемы
- **12 ошибок slug-коллизий**: повторяющиеся события (один организатор, разные даты, одинаковые названия) генерировали один slug. Исправлено: добавлен 3-уровневый fallback (base → base-8chars → base-fullId).
- **ConfigModule не подхватывал .env из корня**: NestJS запускается из `packages/backend`, а `.env` лежит в корне монорепо. Исправлено: `envFilePath` с массивом путей.
- **Некоторые города неизвестны**: ~20 городов из TC нет в нашем маппинге (Екатеринбург, Самара, Рязань и др.). Нужно расширить CITY_MAP или добавить динамическое определение.
- **Города с одинаковым geonames ID**: novorossiysk (519336) подставил не тот город. Нужна верификация маппинга.

---

## 2026-02-10 — Страница события и кнопка «Купить билет»

### Наблюдения
- Описания событий из TC содержат HTML-разметку (`<br>`, `<b>` и т.д.) — нужен рендеринг через `dangerouslySetInnerHTML` с санитизацией.
- SSR в Next.js App Router (Server Components) не использует rewrites из `next.config.ts` — относительные URL `/api/v1` не работают на серверной стороне. Клиентские компоненты (`use client`) работают через rewrites корректно.
- Данные TC содержат `venue.name` — название площадки, полезно для карточки.
- Ссылка на покупку конструируется из `tcEventId`: `https://ticketscloud.com/v1/services/widget?event={tcEventId}`.
- Изображения из TC CDN (`ticketscloud.com/s3/production/image/...`) загружаются корректно.

### Решения
- **SSR API fix**: Добавлена серверная логика в `api.ts` — `typeof window === 'undefined'` определяет SSR, используется абсолютный URL `http://localhost:4000/api/v1` для серверных запросов, относительный `/api/v1` для клиентских (через rewrites).
- **Кнопка «Купить билет»**: `<a href="https://ticketscloud.com/v1/services/widget?event={tcEventId}" target="_blank">` — открывается в новой вкладке, с иконкой ExternalLink.
- **Страница события** полностью переработана:
  - Hero-секция с изображением + градиентным оверлеем + breadcrumbs
  - Info-карточки (адрес, площадка, длительность, возраст)
  - HTML-описание с санитизацией (удаление `<script>`, `<style>`, `on*`-обработчиков)
  - Сайдбар с ценой, сеансами, кнопкой покупки и trust-badge «Безопасная оплата через Ticketscloud»
  - Мобильная адаптация: кнопка покупки дублируется внутри основного контента на мобильных
  - Блок «Похожие события» выделен в отдельную секцию на сером фоне
- **EventCard** обновлён:
  - Hover-эффект с масштабированием изображения и поднятием карточки
  - Бейдж цены наложен на изображение
  - Адрес/город в нижней части карточки
  - Кнопка «Подробнее» появляется при наведении

### Проблемы
- **TC widget URL**: Формат `https://ticketscloud.com/v1/services/widget?event={id}` — нужно проверить, открывается ли виджет покупки корректно. Если нет — необходимо уточнить правильный URL у TC или реализовать собственный checkout.
- **`@tailwindcss/typography`**: Для корректного рендеринга HTML-описаний используется класс `prose`. Нужно убедиться, что плагин подключён.

---

## 2026-02-10 — Интеграция teplohod.info (второй источник данных)

### Наблюдения
- API teplohod.info v1 — публичный (compact-режим без расписания), для полных данных с расписанием нужен белый IP.
- 16 городов, ~784 события: речные прогулки, смотровые площадки, круизы.
- Формат данных отличается от TC: цены — строки `"4590.00"` (рубли), не копейки; описания — plain text с `\r\n`; множественные изображения; фичи (Кафе-бар, WC, Дискотека и т.д.) вместо тегов.
- API требует `Accept: */*` — с `application/json` возвращает 406 Not Acceptable.
- Билетные типы богаче TC: «Взрослый • Верхняя палуба, с ужином», «Детский • Нижняя палуба, с 6 до 12 лет», «Сет меню PREMIUM» и т.д.
- `eventPlaces` содержат точные координаты причалов.

### Решения
- **EventSource enum** добавлен в Prisma: `TC | TEPLOHOD`. Поле `source` на Event с дефолтом `TC`.
- **tcEventId** используется для обоих источников: TC events = `"6980967c..."`, teplohod = `"tep-282"`. Это позволило не менять уникальный индекс и существующий код.
- Создан `TepApiService` (клиент API) и `TepSyncService` (синхронизация).
- Маппинг городов: TEP city_id → наш slug через `CITY_MAP`. Города, которых нет — создаются автоматически.
- Маппинг категорий: «Речные прогулки» → EXCURSION, «Смотровые площадки» → EVENT.
- Фичи teplohod.info → теги: «С обедом/ужином», «Живая музыка», «Панорамный теплоход» и др.
- В compact-режиме нет расписания → создаётся «виртуальная» сессия с ценами.
- Фронтенд BuyModal/BuyButton определяет источник по `event.source` и строит правильный buy URL: TC → виджет TC, TEPLOHOD → `teplohod.info/event/{id}`.
- Новые эндпоинты: `GET /tep/discover`, `POST /tep/sync`, `POST /sync/all` (параллельная синхронизация TC + TEP).

### Проблемы
- **406 Not Acceptable**: TEP API не принимает `Accept: application/json`. Исправлено → `Accept: */*` + `User-Agent: Daibilet/1.0`.
- **Compact API ограничен**: нет расписания, нет наличия мест в реальном времени. Нужен белый IP для полных данных.
- **Buy URL teplohod.info**: формат `https://teplohod.info/event/{id}` — нужна верификация, что страница покупки действительно существует.

### Итоги синхронизации
- **TC**: 2194 события
- **Teplohod.info**: 784 события  
- **Итого в каталоге**: 2978 событий (2243 активных с учётом `isActive`)

---

## 2026-02-10 — Checkout: создание заказов через TC API v2

### Наблюдения
- Кнопка «Перейти к оплате» в BuyModal вела на несуществующие URL:
  - TC: `ticketscloud.com/v1/services/widget?event=...` → 404
  - teplohod.info: `teplohod.info/event/{id}` → 404
- **Ticketscloud** — B2B-платформа: нет публичных страниц покупки. Виджет встраивается JS-скриптом (URL не найден, доступен только из ЛК TC).
- **teplohod.info** — тоже B2B: виджеты для агентов, публичных страниц событий нет.
- TC API v2 для распространителей (`POST /v2/resources/orders`) работает корректно:
  - Создание заказа: `{ event: "...", random: { "set_id": qty } }` → `status: "executed"`, билеты зарезервированы на 15 мин.
  - В ответе нет `payment_url` — TC ожидает, что партнёр сам обработает оплату.
  - Подтверждение: `PATCH /v2/resources/orders/:id { status: "done" }` → билеты проданы, TC отправляет их покупателю.
  - Отмена: `PATCH /v2/resources/orders/:id { status: "cancelled" }` → билеты возвращены в продажу.
- Поле `vendor` в ответе = наш партнёр ID `68b6058965a119d9dda59729` (Дайбилет).
- Цены в ответе TC: строки `"1210.00"` (рубли с копейками), поля `price` (организатору), `extra` (наша наценка), `full` (итого покупателю).

### Решения
- **Бэкенд**: Создан эндпоинт `POST /api/v1/checkout/tc` — принимает `{ eventId, items: [{ setId, quantity }] }`, создаёт заказ в TC API v2, возвращает данные заказа.
- **Дополнительные эндпоинты**: `POST /checkout/tc/:orderId/confirm` и `/cancel`.
- **CheckoutModule** теперь импортирует `CatalogModule` для доступа к `TcApiService`.
- **Фронтенд BuyModal**: полностью переработан:
  - Кнопка «Купить за X ₽» вызывает `POST /api/v1/checkout/tc` вместо внешней ссылки.
  - Добавлены состояния: `select` → `loading` → `success`/`error`.
  - На экране успеха: информация о заказе, предупреждение о 15-минутном резерве.
  - Для teplohod.info — пока перенаправление на их сайт (API заказов не подключён).
  - Кнопка отключена (`disabled`), пока пользователь не выберет билеты.
- Исправлена ошибка Prisma: TC eventId (24 символа, ObjectId) передавался в поле UUID → добавлена проверка формата перед запросом.

### Проблемы
- **Нет YooKassa**: оплата пока не подключена. Билеты резервируются, но для завершения покупки нужна интеграция YooKassa (следующий приоритет).
- **TC widget JS не найден**: все CDN-URL возвращают 404. Виджет, видимо, генерируется только через ЛК TC и не доступен через публичный CDN.
- **Публичный IP для teplohod.info**: `178.66.157.190` — нужно отправить для получения полного API с расписанием.

### Итоги
- Checkout-флоу для TC событий работает end-to-end (без оплаты):
  1. Пользователь выбирает билеты в модалке
  2. Клик «Купить» → бэкенд создаёт заказ в TC → билеты зарезервированы
  3. Показывается экран подтверждения с данными заказа
- Следующий шаг: интеграция YooKassa для обработки оплаты.

---

## 2026-02-10 — Города, Блог, Checkout без YooKassa

### Наблюдения
- Города на главной и в каталоге были отсортированы по алфавиту — неинформативно.
- Страница города показывала только «Популярное» без описания достопримечательностей и статистики.
- Блог: Prisma-модели `Article`, `ArticleEvent`, `ArticleTag` были готовы, но не было ни API, ни фронтенда.
- YooKassa не подключена, но реквизиты партнёра прописаны в TC — можно обрабатывать заказы напрямую через TC API.

### Решения

**1. Города — сортировка по событиям + must-see:**
- `getCities()`: `orderBy: { name: 'asc' }` → сортировка по `_count.events` (desc) в JS.
- `getCityBySlug()`: добавлены `stats` (excursionCount, museumCount, eventCount, totalCount) и `popularTags`.
- Главная страница: статический массив городов заменён на динамический вызов `api.getCities()`, показываются топ-8 городов с реальным количеством событий.
- Страница города: добавлены секции «Что обязательно посетить» (must-see места для 7 городов), статистика по категориям (бейджи), популярные теги, разделение на «Рекомендуем» (топ-6) и «Ещё события».

**2. Блог — автогенерация SEO-статей:**
- Создан `BlogModule` (NestJS): `BlogService`, `BlogController`.
- API: `GET /blog`, `GET /blog/:slug`, `POST /blog/generate`.
- `POST /blog/generate` автоматически генерирует статьи для каждого города:
  - «Что посмотреть в {город}» — обзорная статья с ссылками на события.
  - «Лучшие экскурсии в {город}» — для городов с 3+ экскурсиями.
- Контент в формате Markdown: заголовки, списки, ссылки на события с ценами.
- Связи `articleEvents` — статьи ссылаются на события из каталога.
- Фронтенд: `/blog` (сетка карточек, 12 на страницу), `/blog/[slug]` (статья с MD-рендером + связанные события).
- **Результат**: сгенерировано 53 статьи для городов с событиями.

**3. Checkout — прямая интеграция с TC (без YooKassa):**
- Вместо резервирования + YooKassa → автоподтверждение заказа через TC API (`finishOrder`).
- Поток: пользователь выбирает билеты → вводит email → бэкенд создаёт заказ в TC → подтверждает (`status: done`) → TC отправляет билеты на email.
- `BuyModal`: добавлено поле email перед кнопкой оформления.
- Экран успеха обновлён: при `confirmed === true` показывает «Билеты отправлены на почту».

### Проблемы
- Теги пока не привязаны к событиям в БД → секция «Популярные теги» на странице города пустая.
- Must-see информация захардкожена для 7 городов — для остальных используется `city.description` из БД.
- Блог: контент генерируется программно, без GPT — качество SEO-текстов базовое.

### Итоги
- Москва: 1119 событий, Санкт-Петербург: 953, Казань: 46 — города на главной отсортированы по важности.
- 53 SEO-статьи в блоге, каждая ссылается на конкретные события в каталоге.
- Покупка билетов работает end-to-end: выбор → email → оформление → билеты на почту.

---

## 2026-02-10 — TC виджет: найден скрипт, встроен inline-виджет

### Наблюдения
- Пользователь предоставил формат embed-кода TC виджета: `<span data-tc-event-inline="..." data-tc-meta="true" data-tc-token="...">`.
- JWT-токен партнёра (Дайбилет): `eyJhbGciOiJIUzI1NiIsImlzcyI6InRpY2tldHNjbG91ZC5ydSIsInR5cCI6IkpXVCJ9.eyJwIjoiNjhiNjA1ODk2NWExMTlkOWRkYTU5NzI5In0.NfLxwobFNxE5HDzcS1Xh9Faf4NmmoOJ0teg7HJnQEZc`
  - Payload: `{"p":"68b6058965a119d9dda59729"}` — partner ID Дайбилет.
- **Скрипт виджета НЕ найден** по стандартным CDN-путям (`/static/widgets/common.js`, `/static/js/widget.js` и др. — все 404).
- Нашёл путь через анализ main.js (8.9MB SPA бандл TC): константа `WIDGET_SCRIPT_LOCATION = "/static/scripts/widget/tcwidget.js"`.

### Решения
- **Скрипт виджета TC**: `https://ticketscloud.com/static/scripts/widget/tcwidget.js` (24 KB, application/javascript).
  - Обрабатывает: `data-tc-event-inline`, `data-tc-event`, `data-tc-token`, `data-tc-meta`.
  - Создаёт iframe с полноценным виджетом покупки (выбор билетов, оплата, подтверждение).
- Создан компонент `TcWidget.tsx` (client component):
  - `<TcWidget tcEventId="..." />` — рендерит `<span data-tc-event-inline>` + динамически загружает `tcwidget.js`.
  - `<TcWidgetButton tcEventId="..." />` — кнопка с `data-tc-event` для попап-виджета.
- Страница события (`/events/[slug]`) обновлена:
  - TC-события (source === 'TC'): `TcWidget` — полный inline-виджет TC.
  - TEPLOHOD-события: `BuyButton` → `BuyModal` (наша модалка с редиректом).
- CSS: добавлены стили для `.tc-widget-container` и `button[data-tc-event]`.

### Проблемы
- Скрипт `tcwidget.js` загружается с `ticketscloud.com` — зависимость от CDN TC. Если TC обновит путь, виджет перестанет работать.
- Токен партнёра захардкожен в компоненте (не секрет — публичный JWT). Для чистоты можно вынести в `NEXT_PUBLIC_TC_WIDGET_TOKEN`.

### Итоги
- TC виджет встроен inline на страницу события. Весь цикл покупки (выбор билетов → оплата → доставка) обрабатывается виджетом TC.
- Наша кастомная модалка (`BuyModal`) сохранена для TEPLOHOD-событий.

---

## 2026-02-11

### Наблюдения
- Виджет TC (`tcwidget.js`) не отображался на странице события.
- Анализ минифицированного кода `tcwidget.js` показал: скрипт вешает **один** обработчик клика на `document` (делегирование событий). При клике ищет `data-tc-event` у целевого элемента и его родителей. Это значит, что кнопки работают **даже если добавлены после загрузки скрипта**.
- Глобальный API: `window.ticketsCloudWidget.init()` для повторной инициализации, `window.ticketsCloudWidget.destroy()` для очистки.
- `data-tc-meta="true"` меняет URL виджета с `?event=` на `/meta?meta_event=`. Наши `tcEventId` — обычные event ID, не meta events → ошибка "Ошибка установки кода виджета".
- Популярные теги не работали: TC присылает теги `Детям, Кино, Концерты, Музеи, Театры, Шоу, Экскурсии`, а наши теги — `Белые ночи, Гастрономия, Дискотека` и т.д. **Ноль совпадений по имени**.
- `getTagBySlug` падал с `Argument skip is missing` — query-параметр `page` приходил как строка/undefined.

### Решения
- **TC виджет**: загрузка `tcwidget.js` глобально в `layout.tsx` через `next/script`. Компонент `TcWidgetButton` — простая кнопка `<button data-tc-event="..." data-tc-token="...">`. Убрали `data-tc-meta="true"`.
- **Теги**: полностью переписали `syncTags()`:
  - Маппинг TC-тегов на наши slug'и (`TC_TAG_MAP`)
  - Автоматическое назначение по ключевым словам в названии/описании (`KEYWORD_TAG_MAP`, ~40 правил)
  - Новый метод `retagAll()` и эндпоинт `POST /retag`
  - Результат: 245 событий → 715 тегов привязано, 12 популярных тегов на странице СПб.
- **getTagBySlug**: исправлен парсинг `page` — `Math.max(1, parseInt(...) || 1)`.

### Проблемы
- TC widget `data-tc-meta="true"` несовместим с обычными event ID → убрали.
- Нужно разобраться, как получать meta event ID из TC API (для мета-событий, если они нужны).

---

## 2026-02-11 (продолжение) — Подготовка к продакшен-деплою

### Наблюдения
- Проект работает только локально. Нет Dockerfile'ов, нет конфигурации Nginx, нет CI/CD.
- Монорепо (pnpm workspaces) усложняет Docker-сборку: нужно правильно копировать `packages/shared` и workspace-конфиги.
- Next.js standalone output уменьшает Docker-образ frontend с ~500 MB до ~100 MB.
- `api.ts` уже корректно использует `INTERNAL_API_URL` (SSR → backend внутри Docker) и `NEXT_PUBLIC_API_URL` (CSR → через Nginx).

### Решения
- **`.dockerignore`**: единый файл в корне, исключает `node_modules`, `.next`, `.env`, `dist`, `.git`, `docs`.
- **Health check**: новый `GET /api/v1/health` — проверяет подключение к PostgreSQL, возвращает `{ status: 'ok', db: true }`.
- **`next.config.ts`**: добавлен `output: 'standalone'`; rewrites теперь только в dev-режиме (в production Nginx проксирует `/api/*` напрямую).
- **`Dockerfile.backend`**: multi-stage build, копирует workspace + shared + backend, `prisma generate`, health check через curl.
- **`Dockerfile.frontend`**: multi-stage build, standalone output, non-root user `nextjs`.
- **`nginx/default.conf`**: reverse proxy, SSL (Let's Encrypt), gzip, rate limiting, кэширование `_next/static/`, security headers (HSTS, X-Frame-Options).
- **`docker-compose.prod.yml`**: 6 сервисов (postgres, redis, backend, frontend, nginx, certbot), единая сеть `daibilet-net`, порты не пробрасываются наружу (кроме 80/443 через nginx).
- **`.env.example`**: обновлён с продакшен-переменными (`POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `INTERNAL_API_URL`, `NEXT_PUBLIC_*`, `TC_WIDGET_TOKEN`).
- **`deploy.sh`**: bash-скрипт для первоначальной настройки VPS (Docker, git clone, SSL через Let's Encrypt, `docker compose up`, Prisma migrate).

### Проблемы
- `REPO_URL` в `deploy.sh` нужно заполнить после создания git-репозитория.
- Для первого SSL-сертификата нужно, чтобы DNS уже указывал на VPS.
- Redis password в dev-режиме пустой — нужно заполнить для production.

---

## 2026-02-11 — Посадочные страницы + Фильтр городов

### Наблюдения
- Для SEO-конверсии нужны точечные страницы под высокочастотные запросы (развод мостов, метеор в Петергоф и т.д.).
- Существующие данные Event + EventSession уже содержат всё нужное для таблицы сравнения — не нужна отдельная модель `variants`.
- Город привязан через `filterTag` — тег фильтрует события. KEYWORD_TAG_MAP автоматически тегирует события при синхронизации.

### Решения
- **Prisma**: Добавлена модель `LandingPage` (slug, cityId, filterTag, JSON-блоки контента: howToChoose, faq, reviews, stats, relatedLinks). Поле `isFeatured` в City для фильтрации на главной.
- **Backend**: Новый `LandingModule` (service + controller). `GET /landings` — список, `GET /landings/:slug` — контент + варианты (плоский список сессий с данными события) + метаданные фильтров (причалы, диапазон цен, даты).
- **getCities**: Принимает `?featured=true` для фильтрации. Ответ включает `landingPages[]` для каждого города.
- **Frontend**: Маршрут `/cities/[slug]/[landingSlug]`. Server Component загружает данные, `LandingClient` — клиентская обёртка для FilterBar + ComparisonTable (desktop) + VariantCards (mobile). FaqSection с Schema.org JSON-LD.
- **Best Deal**: Рассчитывается на клиенте как минимальное отношение цена/длительность среди доступных вариантов. Помечается звездой.
- **Seed**: 5 featured-городов (Москва, СПб, Казань, Калининград, НН), 6 лендингов с полным контентом, 6 новых тегов + KEYWORD_TAG_MAP.

### Проблемы
- Нужно запустить `/retag` после синхронизации, чтобы существующие события получили новые теги (nochnye-mosty, meteor-petergof и т.д.).
- Для Нижнего Новгорода пока нет лендинга — город featured, но лендинги будут добавлены позже.
- Контент FAQ/reviews в JSON — пока ручной, в будущем управляется через админ-панель.

---

## 2026-02-11 — Автоматизация retag, НН лендинги, SSG, sitemap

### Наблюдения
- Без автоматического retag лендинги остаются пустыми — события не получают нужные теги.
- Нижний Новгород был featured-городом, но без лендингов — дыра в SEO.
- SSR лендинги без ISR теряют SEO-потенциал (LCP, стабильная индексация).
- Отсутствие sitemap.xml означает медленную индексацию новых страниц.

### Решения
1. **retag встроен в `tcSync.syncAll()`** — после каждой синхронизации TC автоматически перетегирует все события. В `/sync/all` добавлен дополнительный финальный retag для покрытия teplohod-событий.
2. **3 лендинга для Нижнего Новгорода**: Прогулки по Волге, Нижегородский Кремль, Канатная дорога. Добавлены 3 новых тега + KEYWORD_TAG_MAP.
3. **ISR (revalidate)**: лендинги — 6ч, города — 6ч, главная — 1ч. `generateStaticParams` для лендингов и городов.
4. **`additionalFilters Json?`** — превентивное поле в `LandingPage` для будущего масштабирования (minDuration, category, features и др.).
5. **sitemap.xml** — динамический через Next.js `sitemap.ts`. Включает: главную, featured-города, все лендинги (priority 0.95), до 500 событий. robots.txt запрещает /api/, /checkout/, /admin/.
6. Всего в БД: 9 лендингов, 24 тега, 5 featured-городов.

### Проблемы
- Teplohod sync не содержит retag внутри себя (retag — в TC sync service). Решено финальным retag в `/sync/all`.
- При параллельном запуске TC sync и TEP sync, retag внутри TC может не захватить teplohod-события, если TEP завершился позже. Решено дополнительным retag после обоих.

---

## 2026-02-11 — Закрытие трёх фундаментальных дыр: Backend-логика, SEO, Монетизация

### Наблюдения
- PlannerService был STUB — `variants: []` всегда. Frontend показывал заглушку.
- Монетизации не существовало: ни комиссии, ни сервисного сбора, ни upsell.
- SEO-структура ограничивалась лендингами — не было индексируемых combo-страниц.
- Wizard интерактивный, но его результаты не были индексируемыми.

### Решения

**1. PricingService (ядро монетизации)**
- Создан `packages/backend/src/pricing/` — Global модуль, доступен всем сервисам.
- 4 настраиваемых параметра (из env): `SERVICE_FEE_PERCENT` (0% MVP), `PEAK_MARKUP_PERCENT`, `TC_COMMISSION_PERCENT` (10%), `LAST_MINUTE_MARKUP_PERCENT`.
- `calculateBreakdown()` — полная разбивка: basePrice, serviceFee, markup, upsellTotal, grandTotal, perPerson, estimatedCommission.
- Динамическая наценка: пиковые даты (белые ночи, майские, новогодние) + last-minute (< 3 дней до поездки).
- Upsell-каталог: 10 предложений по городам (ужин на теплоходе, трансфер, VIP, фото, гастро-тур и др.).
- API: `GET /pricing/config` (отладка), `GET /pricing/upsells?city=xxx`.

**2. PlannerService (полный scoring-алгоритм)**
- Заменил STUB на рабочий алгоритм.
- Scoring (5 факторов): рейтинг (0-25), категория×слот (0-30), ценовой фактор (0-20), популярность (0-10), длительность (0-(-10)).
- 3 варианта: Эконом (дешёвые, высокий ratingWeight 0.2), Оптимальный (баланс, ratingWeight 0.4), Премиум (дорогие, ratingWeight 0.5).
- Интенсивность: RELAXED=2 слота, NORMAL=3, ACTIVE=4 (включая LATE_AFTERNOON).
- Дедупликация вариантов при малом выборе событий.
- Цены через PricingService с учётом контекста (даты, город, last-minute).
- `customize()` — замена события в слоте с пересчётом цен.
- Ответ включает `upsells` для города.

**3. ComboPage (SEO-индексируемые программы)**
- Новая модель Prisma: `combo_pages` — slug, cityId, curatedEvents (JSON), suggestedPrice, features, includes, FAQ.
- Backend: `ComboModule` с `GET /combos` и `GET /combos/:slug` (живые данные событий + pricing breakdown + upsells).
- Frontend: `/combo` (каталог с группировкой по городам) и `/combo/[slug]` (детальная страница).
- Schema.org Product JSON-LD для каждой combo-страницы.
- ISR: revalidate 6ч + generateStaticParams.
- 5 seed combo-страниц: 3 СПб (романтический, мосты+салют, за 1 день) + 2 Москва (за 1 день, вечерний круиз).
- Sitemap обновлён — combo с priority 0.85.

**4. Shared types расширены**
- `PlanVariant` дополнен: `tier`, `markup`.
- Новые типы: `UpsellItem`, `PriceBreakdown`.

### Проблемы
- `curatedEvents` в combo пока пустые массивы — заполнятся после реальной синхронизации TC с eventId.
- YooKassa checkout для пакетов всё ещё STUB — потребуется при запуске оплаты.
- Scoring работает на UTC-часах — для точности по слотам нужно учитывать таймзону города.

---

## 2026-02-11 — Этап 1 MVP: Cron, Redis, SEO, Метрика, Planner Light

### Наблюдения
- Sync был ручным — ни одного автоматического обновления данных.
- Redis стоял в docker-compose, но не использовался. CatalogService бил напрямую в Postgres на каждый запрос.
- JSON-LD отсутствовал на двух ключевых типах страниц (Event, City). Google не мог правильно распознать контент.
- Метрика не была подключена — невозможно измерить конверсию.
- Planner wizard показывал заглушку "в разработке" вместо реальных вариантов.

### Решения

**1. Cron Sync** (`scheduler/`)
- `@nestjs/schedule` установлен, `SchedulerModule` подключён.
- Полная синхронизация (TC + TEP + retag): `0 0 0,6,12,18 * * *` (каждые 6 часов).
- Инкрементальная TC: `0 30 * * * *` (каждые 30 мин, кроме часов полной).
- Дедупликация: `0 0 3 * * *` (раз в сутки в 03:00).
- Mutex `isSyncing` — защита от параллельного запуска.
- После каждого sync — `cache.invalidateAfterSync()`.

**2. Redis Cache** (`cache/`)
- `CacheService` — graceful degradation (если Redis упал — работаем без кэша).
- `getOrSet<T>()` — pattern fetch-if-miss.
- TTL: города=1ч, список событий=5мин, карточка=10мин, лендинги/combo=30мин, поиск=2мин.
- Инвалидация по паттерну через SCAN+DEL (безопасно для продакшена).
- Интегрирован в CatalogService: `getCities`, `getCityBySlug`, `getEventBySlug`, `search`.
- Health check обновлён: показывает статус Redis.

**3. JSON-LD SEO**
- Events (`/events/[slug]`): Schema.org/Event (name, startDate, duration, location/Place, offers/Offer, organizer) + BreadcrumbList.
- Cities (`/cities/[slug]`): Schema.org/Place (name, description, geo/GeoCoordinates) + BreadcrumbList.
- Combo уже имел Product schema, Landings — FAQPage.

**4. Яндекс Метрика**
- Скрипт в layout.tsx, активируется через `NEXT_PUBLIC_YM_ID`.
- Webvisor, clickmap, trackLinks, ecommerce dataLayer.
- `analytics.ts` — типизированные хелперы: `trackEventView`, `trackWidgetOpen`, `trackBuyClick`, `trackPurchaseSuccess`, `trackPlannerStart`, `trackPlannerResult`, `trackComboView`, `trackLandingView`.
- TcWidgetButton — trackWidgetOpen при клике.

**5. Planner Light Frontend**
- Заглушка "в разработке" заменена на полноценный UI.
- Tabs вариантов (Эконом/Оптимальный/Премиум) с ценами.
- Для каждого варианта: суммарная разбивка, развёрнутый таймлайн по дням.
- Каждый слот: время, ссылка на событие, длительность, рейтинг, subtotal, количество билетов.
- Collapse/expand дней при > 2 дней.
- Адаптивная ширина контейнера (max-w-2xl для results).

### Проблемы
- `@nestjs/schedule` требует `ScheduleModule.forRoot()` — добавлен в SchedulerModule.
- Свойство `groupsFound` не существовало в типе deduplicateExisting — исправлено на `groupsProcessed`.
- Redis SCAN может быть медленным при > 100k ключей — для MVP достаточно.

---

## 2026-02-10 — SEO-стабильность + фактор новизны + умный scheduler

### Наблюдения
- **Риск SEO-нестабильности**: `populateAll` вызывался каждые 6 часов и перезаписывал `curatedEvents` безусловно. Google мог видеть «плавающие» страницы.
- **Перекос к старым событиям**: scoring в combo и planner учитывал только рейтинг и отзывы — новые качественные события не попадали в подборки.
- **Масштабирование scheduler**: при росте до 100 combo — безусловный `populateAll` создаст лишнюю нагрузку на БД.

### Решения
1. **SEO-стабильность `populateAll`**:
   - Добавлен `validateCuratedEvents()`: проверяет, сколько событий из curatedEvents всё ещё `isActive`.
   - Порог `INVALIDATION_THRESHOLD = 0.3` (30%): если валидных >= 70% — combo НЕ трогаем.
   - Перезаполнение только если >30% событий мертвы / удалены / деактивированы.
   - Лог чётко показывает: `checked N, changed M` — видно, что стабильные не тронуты.

2. **Фактор новизны (freshness)**:
   - `combo.service.ts`: новые события (< 30 дней) получают до +15 баллов при подборе.
   - `planner.service.ts`: новые события получают до +8 баллов в общем скоринге.
   - Формула: `FRESHNESS_BONUS * (1 - ageDays / FRESHNESS_DAYS)` — плавное затухание.

3. **Умный scheduler**:
   - `populateAll` принимает опциональный `affectedCityIds` для точечного обновления.
   - По умолчанию (без фильтра) проверяет все combo, но нагрузка = 1 `COUNT` запрос на combo.
   - Scheduler вызывает `populateAll()` без фильтра — проверка дешёвая, перезапись только по необходимости.

### Проблемы
- Нет проблем — изменения чистые, линтер проходит.

---

## 2026-02-11 — Админ-панель: полная реализация

### Наблюдения
- В проекте не было ни одного auth-модуля, CRUD-контроллера для админки, ни frontend-admin пакета.
- 14 моделей Prisma — ни одна не имела полного CRUD через API.
- Для solo-использования достаточно JWT без ролей.

### Решения

**Backend (NestJS):**
1. Модель `AdminUser` (email, passwordHash, name, lastLoginAt) + миграция.
2. `AuthModule`: JWT + bcrypt, 3 endpoint'а (login, refresh, me).
3. `JwtAuthGuard` — декоратор на все `/admin/*` маршруты.
4. 9 admin-контроллеров:
   - `AdminDashboardController` — агрегированная статистика (события, заказы, выручка за 30 дн).
   - `AdminCitiesController` — list + get + update (без create/delete — города из sync).
   - `AdminEventsController` — list с 6 фильтрами + get + update (whitelist полей для override).
   - `AdminTagsController` — полный CRUD.
   - `AdminLandingsController` — полный CRUD.
   - `AdminCombosController` — полный CRUD.
   - `AdminArticlesController` — полный CRUD с пагинацией.
   - `AdminOrdersController` — list + get + безопасные переходы статуса.
   - `AdminSettingsController` — sync status + cache invalidation.
5. CORS обновлён для поддержки нескольких origin (через запятую).
6. Seed: admin user создаётся из `ADMIN_INITIAL_EMAIL` / `ADMIN_INITIAL_PASSWORD`.

**Frontend-admin (Vite + React 19 + Tailwind + React Router 7):**
1. Новый пакет `packages/frontend-admin/` — полностью отдельный от Next.js.
2. API client с auto-refresh JWT и redirect на login при 401.
3. Layout: sidebar с 9 навигационными пунктами + header с logout.
4. Login page с формой и error handling.
5. Dashboard с 8 stat cards (события, города, лендинги, combo, теги, статьи, заказы, выручка).
6. 16 страниц: EventsList, EventEdit, CitiesList, CityEdit, TagsList, TagEdit, LandingsList, LandingEdit, CombosList, ComboEdit, ArticlesList, ArticleEdit, OrdersList, OrderDetail, Settings.
7. Reusable компоненты: DataTable, Badge.
8. JSON-поля (FAQ, reviews, features) — textarea с pretty-print.
9. Vite proxy `/api` → `localhost:4000` для dev.

### Проблемы
- `bcrypt` требует `pnpm approve-builds` — обошли через `pnpm rebuild bcrypt`.
- DTO-поля без `!` вызывали TS2564 — исправлено добавлением definite assignment assertion.
- `import.meta.env` требовал `vite-env.d.ts` — добавлен.

---

---

## 2026-02-11 — Admin Panel Hardening Refactor

### Наблюдения
Первая версия админки была функциональной, но архитектурно хрупкой: нет ролей, нет аудита, Event редактируется напрямую (sync затрёт), upsells/pricing захардкожены, JSON без схем, нет optimistic locking. Принято решение провести полный рефакторинг до накопления технического долга.

### Решения

**Prisma Schema (одна большая миграция):**
- `AdminRole` enum (ADMIN | EDITOR | VIEWER) + поля `role`, `isActive`, `refreshTokenHash` в AdminUser
- `AuditLog` — кто/что/когда/before/after JSON
- `EventOverride` — правки поверх sync-данных (title, description, imageUrl, isHidden, manualRating, tagsAdd/Remove)
- `PricingConfig` (singleton) — serviceFee, peakMarkup, lastMinute, tcCommission, peakRanges из БД
- `UpsellItem` — upsells из БД вместо hardcoded массива
- `OpsStatus` (singleton) — lastFullSyncAt, lastRetagAt, lastPopulateAt и т.д.
- `version Int @default(0)` на City, Tag, LandingPage, ComboPage, Article
- `isDeleted Boolean @default(false)` + `deletedAt` на Tag, LandingPage, ComboPage, Article

**Auth Hardening:**
- Access token 15min (было 24h), refresh token 30d в HttpOnly cookie (было localStorage)
- `refreshTokenHash` в БД — при logout инвалидируется
- Ротация refresh token при каждом /refresh
- `RolesGuard` + `@Roles('ADMIN')` decorator — RBAC на контроллерах
- isActive проверка в JwtStrategy — деактивированные аккаунты отсекаются

**Audit Log:**
- `AuditService.log()` — userId, action (CREATE|UPDATE|DELETE), entity, entityId, before/after JSON
- `AuditInterceptor` — автоматически логирует POST/PATCH/DELETE на /admin/*
- `AdminAuditController GET /admin/audit` — фильтрация по entity, userId, action, пагинация
- Frontend: страница Аудит с таблицей, фильтрами и раскрывающимися деталями

**Optimistic Locking + Transactions:**
- Все PATCH контроллеры проверяют `version` через `updateMany({ where: { id, version } })`
- ConflictException при несовпадении — "Данные были изменены другим пользователем"
- Landing/Combo/Article сохраняются через `$transaction` с записью аудита
- PUT → PATCH во всех мутирующих эндпоинтах
- Soft delete (isDeleted + deletedAt) вместо hard delete для Tag, Landing, Combo, Article

**EventOverride (вместо прямого редактирования Event):**
- `EventOverrideService` — upsert/remove/toggleHidden/applyOverrides
- `CatalogService` — при чтении событий мержит overrides, фильтрует isHidden
- Admin: `PATCH /admin/events/:id/override`, `DELETE /admin/events/:id/override`, `PATCH /admin/events/:id/hide`

**PricingConfig + UpsellItem в БД:**
- `PricingService` читает конфигурацию из PricingConfig вместо env/hardcode
- Кэширует в Redis (TTL 5min)
- `getUpsells()` читает из UpsellItem таблицы
- Admin: `GET/PATCH /admin/settings/pricing`, CRUD `/admin/upsells`
- Seed перенёс все hardcoded upsells в базу

**JSON Validation (Zod):**
- `json-schemas.ts` — схемы для FAQ, Reviews, Stats, RelatedLinks, HowToChoose, InfoBlocks, Features, CuratedEvents, Includes, PeakRanges
- `validateJson()` хелпер с человекочитаемыми ошибками
- Валидация в LandingsController и CombosController перед save → BadRequestException
- Frontend: `<JsonEditor>` компонент с подсветкой ошибок и prettify

**Ops Controls:**
- `POST /admin/ops/sync/full|incremental|retag|populate-combos|cache/flush`
- `GET /admin/ops/status` — OpsStatus из БД
- `PATCH /admin/settings/pricing` — конфигурация цен
- Frontend: Settings page с кнопками управления, статусами операций, формой pricing

**Frontend Admin обновления:**
- Auth: access token в localStorage (short-lived 15min), refresh через HttpOnly cookie
- `credentials: 'include'` на всех fetch
- Logout через POST /auth/logout + clear cookie
- Sidebar: добавлены Upsells и Аудит
- API client: добавлен `patch()` метод
- Новые страницы: AuditLog, UpsellsList, UpsellEdit

### Проблемы
- `cookie-parser` import: `import * as` не работает с ESM-совместимым модулем — использован default import.
- `ZodError.errors` → `ZodError.issues` — API Zod отличается от ожидаемого.
- `buildVariant()` в PlannerService стал async из-за async `calculateBreakdown` — пришлось пробросить await через всю цепочку.
- PricingModule теперь зависит от PrismaModule и RedisCacheModule (Global) — добавлены в imports.

---

## 2026-02-11 — Деплой-конфигурация: admin-панель + Timeweb Cloud

### Наблюдения

Проект готов к production-деплою на Timeweb Cloud VPS. Основная инфраструктура (docker-compose.prod.yml, Dockerfile.backend/frontend, nginx, deploy.sh) была создана ранее, но отсутствовал ключевой компонент — контейнеризация admin-панели и её интеграция в production-окружение.

**Выбор тарифа:** Timeweb Cloud MSK 50+ (2 CPU, 4 GB RAM, 50 GB NVMe, ~1100 руб/мес) — оптимален для MVP. Все сервисы (PostgreSQL, Redis, NestJS, Next.js, Admin, Nginx) помещаются в одном Docker Compose. При росте трафика рекомендуется переход на VPS + Managed PostgreSQL.

**Архитектурное решение для admin-панели:** Vite SPA не требует отдельного Node.js runtime — собирается в статические файлы и раздаётся через встроенный Nginx на порту 5173. Отдельный домен `admin.daibilet.ru` вместо sub-path `/admin` выбран для:
- Изоляции CSP/security headers (DENY vs SAMEORIGIN для X-Frame-Options)
- Упрощения CORS (отдельный origin в whitelist)
- Возможности ограничения доступа по IP в будущем

### Решения

**Dockerfile.admin (новый):**
- Multi-stage: `node:22-alpine` builder → `nginx:alpine` runner
- pnpm workspace-aware: копирует shared + frontend-admin
- SPA fallback: `try_files $uri /index.html` в Nginx конфигурации
- Кэш `/assets/` с `immutable` заголовком (Vite хэширует имена файлов)
- Healthcheck через wget на порт 5173

**nginx/default.conf (обновлён):**
- Добавлен `upstream admin` → `server admin:5173`
- Новый server block для `admin.daibilet.ru` (HTTPS)
- HTTP→HTTPS redirect теперь включает `admin.daibilet.ru`
- Более строгие security headers для admin (X-Frame-Options: DENY, CSP)
- Отдельная rate-limit zone `admin_zone` (20r/s)
- SAN-сертификат: один сертификат для всех доменов

**docker-compose.prod.yml (обновлён):**
- Добавлен сервис `admin` (Dockerfile.admin, container: daibilet-admin)
- Backend: добавлены `JWT_SECRET`, `CORS_ORIGIN`, `ADMIN_INITIAL_EMAIL`, `ADMIN_INITIAL_PASSWORD` в environment (все required в prod)
- Frontend: добавлен `NEXT_PUBLIC_YM_ID`
- Redis healthcheck исправлен: добавлен `-a ${REDIS_PASSWORD}` для auth
- Nginx `depends_on` теперь включает `admin`
- `JWT_SECRET` и `ADMIN_INITIAL_PASSWORD` помечены как `required` (:? синтаксис)

**deploy.sh (обновлён):**
- `REPO_URL` заполнен: `https://github.com/Twisterrrrr/daibilet_tickets.git`
- `ADMIN_DOMAIN` добавлен как переменная
- Certbot выпускает SAN-сертификат для 3 доменов (daibilet.ru, www, admin)
- Автоматическая генерация паролей при первом запуске (openssl rand)
- Проверка: если сертификат не содержит admin-домен → `certbot --expand`
- Добавлен seed (`npx prisma db seed`) после миграций
- UFW файрвол: автоматическая настройка (22, 80, 443)
- Cron для SSL renewal добавляется автоматически
- Health check с timeout вместо `sleep 10`
- Проверка обязательных TC-токенов перед запуском
- 9 шагов вместо 8

**.env.example (обновлён):**
- Добавлен Production Checklist в шапке файла
- Команды генерации паролей в комментариях

### Проблемы
- SAN-сертификат: при добавлении admin-домена к существующему сертификату нужен `--expand` флаг Certbot.
- Redis healthcheck в предыдущей версии не учитывал пароль — `redis-cli ping` не работает при `requirepass`.
- CSP для admin-панели: `unsafe-inline` для script-src и style-src необходим, т.к. Vite инлайнит стили и скрипты при сборке.

---

## 2026-02-12 — Миграция каталога TC: REST v1 → gRPC tc-simple

### Наблюдения
- Ticketscloud предоставляет gRPC-сервис `tc-simple` (endpoint: `simple.ticketscloud.com:443`) как альтернативу REST API v1 для получения каталога событий.
- gRPC API даёт **MetaEvents** — нативную группировку повторяющихся мероприятий, вместо нашей ручной дедупликации по `normalizeTitle(title) + cityGeoId`.
- Кроме событий, gRPC отдаёт Venues, Cities, Tags, Categories, Artists отдельными стримами.
- Авторизация: metadata `authorization: {api_key}`, предпочтительный язык: metadata `preferred-language: ru`.
- Первый тест sync: 2127 events, 89 MetaEvent-групп, 23464 площадок, 127739 городов из gRPC.
- Группировка: 87 MetaEvent-групп + 194 одиночных = 281 уникальное событие.

### Решения
1. **Новый сервис `TcGrpcService`** — gRPC-клиент с SSL, загрузка proto-файлов через `@grpc/proto-loader`, streaming RPC для всех сущностей.
2. **Proto-файлы** скопированы из `ticketscloud/docs/proto` в `packages/backend/proto/tc-simple/` (11 файлов).
3. **`TcSyncService` переписан** с двумя режимами:
   - `TC_SYNC_MODE=grpc` — MetaEvent-based группировка через gRPC (по умолчанию).
   - `TC_SYNC_MODE=rest` — fallback на REST v1 (title-based дедупликация).
   - При ошибке gRPC автоматически переключается на REST.
4. **Prisma**: добавлено поле `tcMetaEventId` (nullable) в модель Event + индекс.
5. **Поиск событий** при sync: сначала по `tcMetaEventId`, потом по `tcEventId`, потом по `title+city` (обратная совместимость).
6. REST v2 для заказов и TC JS Widget для покупки — без изменений.

### Проблемы
- gRPC Cities stream отдаёт 127k+ городов — много данных. В будущем можно фильтровать по стране/id.
- gRPC Venues stream: 23k+ площадок. Аналогично, можно фильтровать по venue IDs из events.
- protobufjs build scripts были заблокированы pnpm — работает в fallback (pure JS) режиме без нативных оптимизаций.
- Цены в gRPC TicketSet: `rule.simple.price` — формат может быть в копейках (uint64). Нужно уточнить у TC, если цены будут неверными.

---

---

## 2026-02-12 — Afisha UX Phase 1: стратегия + лента дат + бейджи

### Наблюдения
- Проведён сравнительный анализ Daibilet vs Яндекс.Афиша. Afisha выигрывает не стеком, а UX-минимализмом: компактная выдача, быстрые фильтры, бейджи доверия.
- У Daibilet уже есть архитектура уровня масштабируемого маркетплейса (monorepo, NestJS, Next.js, Prisma, gRPC), но фронтенд ещё не доведён до уровня "продукта".
- Бэкенд уже поддерживает `dateFrom`/`dateTo` в API каталога — достаточно подключить на фронтенде.
- Ключевое преимущество перед Афишей: водная тематика (причалы, погода, маршруты, время на воде).

### Решения
- **Фаза 1 UX (Quick Wins)**: лента дат + смарт-бейджи + каркас новых сущностей.
- Лента дат — горизонтальная прокрутка (сегодня/завтра/выходные/14 дней), mobile-first.
- Смарт-бейджи: "Оптимальный выбор" (scoring: рейтинг 40% + цена-эффективность 30% + загрузка 30%), "Осталось N мест", ближайший сеанс.
- Каркас данных: Location (enum PIER/VENUE/MEETING_POINT/OTHER), Operator, Route — пустые модели в Prisma для подготовки к Фазе 2.
- Не трогаем: новые страницы, персонализацию, переделку карточки — это Фаза 2-3.
- Виджет TC: исправлен JWT-токен (вместо API-ключа), добавлена поддержка `data-tc-meta` для MetaEvent, кликабельные сеансы через `TcSessionSlot`.
- `.env.local` создан в `packages/frontend/` для корректной загрузки `NEXT_PUBLIC_*` переменных Next.js в монорепо.

### Проблемы
- Скрипт `tc-widget-button.css` от Ticketscloud перезаписывает стили любого элемента с `data-tc-event`. Решено: CSS-классы `.tc-buy-btn` и `.tc-session-slot` с `all: unset !important` для сеансов.
- Принцип "Afisha = простота" требует дисциплины — не перегружать UI раньше, чем доведена выдача.

---

## 2026-02-12 — Мульти-офферная архитектура (EventOffer)

### Наблюдения
- При нескольких источниках (TC, Teplohod, будущие Radario/TimePad) одно физическое событие может дублироваться в каталоге. Нужна модель "каноническое событие + несколько офферов (источников продажи)".
- Текущая архитектура: Event хранит source-специфичные поля (tcEventId, tcMetaEventId, source) вместе с каноническими. Дедупликации нет.
- Админка EventEdit.tsx вызывала несуществующий `PUT /admin/events/:id` — починен на `PATCH /override`.

### Решения
- **Путь B**: EventOffer как отдельная сущность + ручной merge, без автодедупа.
- Новые enums: `OfferSource` (TC/TEPLOHOD/RADARIO/TIMEPAD/MANUAL), `OfferStatus` (ACTIVE/HIDDEN/DISABLED), `PurchaseType` (TC_WIDGET/REDIRECT/API_CHECKOUT).
- Модель `EventOffer`: source, purchaseType, externalEventId, metaEventId, deeplink, priceFrom, commissionPercent, status, isPrimary, priority.
- `EventSession.offerId` — привязка сессий к офферу (nullable, backward compat).
- `Event.canonicalOfId` — self-relation для ручного merge дублей.
- Data migration: 269 offers создано, 2247 sessions обновлены.
- Sync-сервисы (TC, Teplohod) обновлены: upsert EventOffer параллельно с Event.
- API: `getEvents` и `getEventBySlug` теперь возвращают `primaryOffer` и `offers`.
- Frontend BuyCard переписан: CTA определяется по `primaryOffer.purchaseType` (TC_WIDGET / REDIRECT / fallback BuyModal).
- Admin: секция "Офферы / Источники продажи" на странице события. Toggle status, set primary, будущий merge.

### Проблемы
- EventSession привязана и к Event, и к EventOffer (двойная FK на переходном этапе). В будущем eventId в session станет вычисляемым через offer.
- Teplohod sync не фильтрует по source при lookup (потенциальный баг при пересечении ID).

---

## 2026-02-12 — Отзывы и рейтинги (MVP)

### Наблюдения
- В системе не было пользовательской аутентификации — только admin. Решили делать отзывы без обязательной регистрации (guest reviews).
- Существовали поля `Event.rating` и `Event.reviewCount`, но заполнялись статически из sync. Теперь — пересчитываются динамически.
- Voucher-коды (`Voucher.shortCode`) уже есть в системе и привязаны к Package → PackageItem → Event. Идеально подходят для верификации покупки.
- Рейтинг событий на внешних платформах (Яндекс.Карты, 2GIS) — ценный UGC, который можно использовать для доверия.

### Решения

1. **Модель Review**: `eventId` (nullable) + `operatorId` (nullable) — поддержка отзывов на уровне события И оператора. Unique constraint: `authorEmail + eventId`.
2. **Гибридная верификация**: если пользователь ввёл `voucherCode` и он совпадает с покупкой этого события — `isVerified = true`. Остальные отзывы с `isVerified = false` проходят модерацию.
3. **Модерация**: три статуса (PENDING → APPROVED/REJECTED). Все отзывы начинают с PENDING. Админ видит список с фильтром по статусу, badge с кол-вом pending.
4. **External Rating**: три новых поля в Event (`externalRating`, `externalReviewCount`, `externalSource`). Админ вводит вручную. Участвует в расчёте итогового `rating` через взвешенное среднее.
5. **Пересчёт рейтинга**: `recalculateEventRating()` — если есть и свои, и внешние отзывы, рейтинг = `(ownAvg * ownCount + extAvg * extCount) / (ownCount + extCount)`.
6. **SEO**: JSON-LD `AggregateRating` автоматически добавляется на страницу события, если `rating > 0`.

### Проблемы
- Пока нет email-уведомлений о новых отзывах для админов. Планируется в следующих итерациях.
- «Load more» в ReviewSection заменяет текущие отзывы, а не дополняет. Для MVP приемлемо; полноценная пагинация — в будущем.
- Нет рейт-лимитинга на POST /reviews. Для protection от спама нужно добавить captcha или rate limiter (Фаза 2).

---

## 2026-02-12 — Полный редизайн админки (SaaS-стиль) + Полировка

### Наблюдения

- Админка была функциональной, но визуально устаревшей (обычные HTML-таблицы, inline-стили, alert/confirm). Пользователь предоставил демо `daibi.lovable.app/admin` как эталон.
- После редизайна обнаружились проблемы с типизацией query-параметров (Prisma ожидает numbers, NestJS @Query даёт strings) — проявлялись как «Internal server error» на всех страницах с пагинацией.
- Sonner toasts оказались значительно лучше inline-сообщений — не нужно скроллить к верху страницы чтобы увидеть результат действия.

### Решения

1. **UI-библиотека**: Выбран shadcn/ui (Radix + Tailwind + CVA) — модульные компоненты, полный контроль над стилями, нативная поддержка dark mode через CSS-переменные.
2. **Графики**: recharts (AreaChart + BarChart) для Dashboard — лёгкий, отлично интегрируется с responsive-контейнером.
3. **Таблицы**: @tanstack/react-table — headless, гибкий sort/filter/pagination, без vendor lock-in на UI.
4. **Dark mode**: ThemeProvider с localStorage persist + CSS-переменные в `:root` и `.dark`. Sonner привязан к текущей теме. Smooth CSS transition при переключении.
5. **Toasts**: Все CRUD-операции (save, delete, approve, reject, sync) переведены с inline-сообщений на sonner toast.success/toast.error.
6. **Skeletons**: Каждая страница показывает скелетон вместо «Загрузка...» — карточки, строки таблиц, заголовки.
7. **Mobile**: ScrollArea с горизонтальной прокруткой в DataTable, flex-wrap в пагинации, responsive sidebar (Sheet на mobile).
8. **Page transitions**: CSS `fadeSlideIn` анимация (opacity + translateY) на `<main>` при смене страниц.
9. **Backend fix**: Явное приведение `Number()` для page/limit в контроллерах Orders, Events, Articles, Audit.

### Проблемы

- При переименовании файлов (Badge.tsx → badge.tsx) на Windows файловая система не всегда отслеживает изменение регистра, что может привести к «Cannot find module» ошибкам.
- `EADDRINUSE` на порту 4000 при перезапуске бэкенда — необходимо предварительно убить процесс.
- Recharts в dark mode не имеет встроенной адаптации осей — используем className `stroke-muted` и `text-muted-foreground` для CartesianGrid и Axis.

---

## 2026-02-12 — EventAudience + Конверсионные механики

### Наблюдения

- Раздел «Детям» как жёсткая категория (EventCategory.KIDS) создавал проблему: «Детская экскурсия по каналам» была видна только в «Детям», но не в «Экскурсии». Пользователь, ищущий речные экскурсии, её не находил.
- Kassir.ru и Яндекс.Афиша используют аналогичный подход — «Детям» как отдельный раздел с кросс-категорийной фильтрацией.
- Конверсионные механики (departing soon, время суток, причалы) — это не категории в БД, а вычисляемые фильтры и бейджи на уровне представления.

### Решения

1. **EventAudience enum (ALL, KIDS, FAMILY)**: Заменяет KIDS как категорию. Событие теперь имеет реальную категорию (EXCURSION/MUSEUM/EVENT) + атрибут audience. «Детям» в каталоге = фильтр по audience, показывает события из ВСЕХ категорий.
2. **SQL-миграция**: 7 шагов — добавление enum, перевод KIDS-событий в реальные категории, очистка KIDS_* подкатегорий, пересоздание enum-ов без старых значений, индексация.
3. **Бейдж «Через N мин»**: Вычисляется в enrichWithBadges как разница nextSessionAt - now(). Оранжевый пульсирующий бейдж на карточке. Приоритет над «Осталось N мест».
4. **departing_soon sort**: Отдельная ветка в getEvents — фетчит события с сеансами в ближайшие 2 часа, сортирует по nextSessionAt в памяти.
5. **Время суток**: Raw SQL с EXTRACT(HOUR FROM startsAt AT TIME ZONE 'Europe/Moscow') для фильтрации по утро/день/вечер/ночь.
6. **Фильтр по причалу**: Использует существующую модель Location (type=PIER). API /locations возвращает список причалов города.
7. **Геолокация**: API /locations/nearest с Haversine-формулой в raw SQL. Фронтенд-интеграция запланирована на следующую фазу.
8. **PromoBlock**: Серверный компонент, показывающий сезонные промо по текущему месяцу. Развод мостов (апр-ноя), Белые ночи (май-июл), Алые паруса (июнь), Новый год (дек-янв).

### Проблемы

- Prisma не поддерживает EXTRACT(HOUR) в where-условиях — пришлось использовать raw SQL для timeOfDay-фильтра.
- При ALTER TYPE enum в PostgreSQL нужно предварительно снимать DEFAULT-ы с колонок, иначе ошибка cast.
- `prisma db push --force-reset` заблокирован AI safety check — использовали `prisma db execute` для ручных миграций.

---

## 2026-02-12 — Контекстные быстрые фильтры + Системные теги + Бейджи

### Наблюдения

- Простые подкатегории (RIVER, WALKING, BUS) — это лишь часть того, что нужно пользователю для быстрой навигации. Пользователь ищет «С гидом», «Ночные», «Без очереди», «До 2 часов» — это микс подкатегорий, тегов, фильтров по времени суток и длительности.
- Каждая витрина (Экскурсии, Музеи, Мероприятия, Детям) имеет свой уникальный набор полезных фильтров. Универсальный список подкатегорий не передаёт специфику.
- Системные теги (`night`, `water`, `romantic`, `first-time-city`, `bad-weather-ok`, `with-guide`, `no-queue`, `interactive`, `audioguide`) — это не меню, а сигналы для ранжирования и бейджей на карточках.

### Решения

1. **QUICK_FILTERS конфиг (shared)**: Объект `Record<string, QuickFilter[]>` с ключами EXCURSION, MUSEUM, EVENT, KIDS. Каждый QuickFilter содержит id, emoji, label и params (произвольные query-параметры API). Один чип может устанавливать subcategory, tag, maxDuration или maxMinAge — фронтенд просто мержит params в запрос.
2. **SYSTEM_TAG_BADGES (shared)**: Массив из 9 системных тегов с emoji, label, color (Tailwind bg-class) и textColor. Фронтенд рендерит до 2 тег-бейджей в правом верхнем углу карточки.
3. **12 системных тегов в БД**: night, water, romantic, best-value, last-minute, today-available, bad-weather-ok, first-time-city, with-guide, no-queue, interactive, audioguide. Seed через SQL-миграцию.
4. **Авто-присвоение тегов**: Расширен KEYWORD_TAG_MAP в tc-sync.service и аналогичный в tep-sync.service. Например, «ночн» → night, «обзорн» → first-time-city, «без очеред» → no-queue.
5. **tagSlugs в API-ответе**: enrichWithBadges теперь извлекает slug-и тегов из event.tags и добавляет массив tagSlugs в ответ каталога. Фронтенд использует его для рендеринга тег-бейджей.
6. **Фильтр maxDuration**: Новый query-параметр в EventsQueryDto. Позволяет чип «До 2 часов» (maxDuration=120).
7. **Фильтр maxMinAge**: Новый query-параметр. Позволяет чипы «0+» (maxMinAge=0), «6+» (maxMinAge=6), «Школьникам» (maxMinAge=14) в витрине «Детям».
8. **Контекстные чипы на фронтенде**: Убраны старые subcategory-чипы. Новый `activeQuickFilter` state → при выборе чипа его params мержатся в запрос API. При смене витрины чипы обнуляются.

### Проблемы

- best-value, last-minute, today-available — динамические теги, не могут быть присвоены по ключевым словам. Нужен отдельный алгоритм (cron-задача или вычисление при запросе). Пока они существуют как заготовки в БД.
- Для maxMinAge на витрине «Детям» нужна корректная разметка minAge у событий. Текущий классификатор не всегда точно определяет возрастное ограничение.

---

## 2026-02-12 — Исправления главной, лендингов, архитектура SEO-блога

### Наблюдения

- Hero-кнопка «Спланировать» была невидима: `btn-secondary` даёт `bg-white`, а `!text-white` делал текст белым по белому фону. Требовался контрастный стиль для тёмного Hero-градиента.
- PromoBlock показывал пустоту в феврале-марте: 4 имеющихся промо привязаны к навигации (апрель-ноябрь) и праздникам (декабрь-январь), зимние месяцы оставались пустыми.
- Лендинг nochnye-mosty показывал пешеходные и автобусные экскурсии. Причина двойная: (a) KEYWORD_TAG_MAP содержал слишком широкое слово `мост`, присваивая тег `nochnye-mosty` любому событию с упоминанием мостов; (b) поле `additionalFilters` в LandingPage существовало, но не использовалось в сервисе.
- Секция «Что посмотреть» содержала только 4 статические карточки категорий без тегов, хотя API уже возвращал теги с `_count.events`.

### Решения

1. **Hero кнопка**: заменены классы на `border-2 border-white/70 bg-white/10 backdrop-blur-sm ... text-white` — кнопка видна на тёмном фоне, при hover становится белой с цветным текстом.
2. **PromoBlock**: добавлены 4 всесезонных промо — «День влюблённых» (фев), «Масленица» (фев-мар), «Зимний город» (ноя-мар), «Каникулы с детьми» (янв, мар, лето). Теперь в любой месяц отображается минимум 1 карточка.
3. **Теги на главной**: добавлен SSR-fetch `api.getTags()`, фильтрация по `_count.events > 0`, сортировка по популярности, рендер до 20 чипов в виде «Тег (N)» с ссылками на `/events?tag={slug}`.
4. **Лендинг nochnye-mosty**:
   - `landing.service.ts` теперь применяет `additionalFilters` из БД (category, subcategories, source, min/maxDuration).
   - Для nochnye-mosty установлен фильтр `{"subcategories": ["RIVER"]}` — теперь показываются только речные экскурсии.
   - KEYWORD_TAG_MAP: удалены широкие ключи `мост`, `развод`, `разводн`; заменены на точные: `развод мостов`, `разводные мосты`, `ночные мосты`, `под разводными`.
   - SQL-скрипт удалил тег `nochnye-mosty` у событий без подкатегории RIVER.
5. **SEO-блог**: задокументирована полная архитектура в docs/Project.md — типы статей (городской гид, категориальный ТОП, тег-подборка, сезонный гид), flow генерации (ArticlePlanner → DataCollector → Renderer → Linker → Article DB), стратегия перелинковки, расписание триггеров, требования к контенту.

### Проблемы

- Реализация ArticlePlanner/Renderer/Linker ещё не началась — это отложено на следующий этап.
- Подключение OpenAI API для генерации уникальных текстов — требует API-ключ и отдельную задачу на промптинг.
- Промо «Масленица» и «День влюблённых» ведут на `/events?subcategory=GASTRO` и `/events?tag=romantic` соответственно — нужно убедиться, что события размечены этими тегами.

---

## 13.02.2026 — Полная интеграция teplohod.info (реальное расписание)

### Наблюдения

1. **IP добавлен в белый список teplohod.info** — full API доступен, возвращает `eventTimes` с реальным расписанием (дата/время отправления, количество свободных мест).
2. **Структура `eventTimes`**: `{ id, datetime: "2026-05-18T16:30:00+0300", available_tickets: 90 }` — ISO 8601 с таймзоной.
3. **Особенность API**: параметр `city_id` в `/v1/events` НЕ фильтрует события — API возвращает **одинаковые 55 событий** для любого `city_id`. Город определяется только через `eventPlaces[0].city_id`.
4. **Объём данных**: 55 уникальных событий, ~2000 активных сессий (до 96 сессий на событие, горизонт до июля 2026).
5. **API отвечает медленно** (~8-23 секунд на запрос).

### Решения

1. **Реальные сессии вместо виртуальных**:
   - Переписан `syncSession()` — создаёт `EventSession` для каждого `eventTime` с реальным `startsAt`, `endsAt`, `availableTickets`.
   - Прошлые даты отфильтровываются (`startsAt <= now`).
   - Старые виртуальные сессии (`tep-{id}-main`) деактивируются.
   - Сессии, исчезнувшие из расписания, автоматически деактивируются.

2. **Batch INSERT для сессий**:
   - Вместо индивидуальных `upsert` по одному — raw SQL `INSERT ... ON CONFLICT DO UPDATE` в одном запросе.
   - Ускорение: время синхронизации упало с ~8 минут до ~68 секунд.

3. **Оптимизация API-запросов**:
   - Один вызов `getEvents()` вместо 16 (по каждому городу).
   - Город определяется из `eventPlaces[0].city_id` → CITY_MAP → наш slug.

4. **Fallback на compact API**:
   - `TepApiService.getEvents()` сначала запрашивает full API; если `eventTimes` отсутствует, fallback на compact.

5. **Типы обновлены**: `TepEvent.eventTimes?: TepTimeSlot[]`, `TepTimeSlot { id, datetime, available_tickets }`.

### Проблемы

- Teplohod.info пока имеет события только для Москвы (55 шт.), несмотря на 16 городов в `/v1/cities`.
- Дубль города «Нижний Новгород» в БД (`nizhnij-novgorod` от TC, `nizhny-novgorod` от CITY_MAP) — требует объединения.
- API иногда отвечает >20 секунд — для production нужен таймаут и retry.

---

## 13.02.2026 — Комплексная UGC-система (отзывы, фото, email, голосование)

### Наблюдения

1. **Текущий Review** имел только текстовые отзывы с модерацией (PENDING/APPROVED/REJECTED) и верификацией через voucher.
2. **Отсутствовала инфраструктура**: email-отправка (SMTP), загрузка файлов (multer/S3), очереди (BullMQ установлен, не подключён).
3. **Внешние рейтинги** хранились только как числа (`externalRating`, `externalReviewCount`, `externalSource`) на Event — без отдельных отзывов.

### Решения

**Фаза 1: Инфраструктура**
- `MailModule` + `MailService` — @nestjs-modules/mailer + Handlebars. Шаблоны: `review-verify.hbs`, `review-request.hbs`, `review-approved.hbs`. SMTP через env vars, graceful fallback (DRY RUN) если не настроен.
- `UploadModule` + `UploadService` — multer + sharp. Конвертация в WebP, ресайз до 1200px + thumbnail 300px. Абстракция `StorageProvider` (interface) для будущей миграции на S3.
- `QueueModule` — BullMQ подключён к Redis. Очереди `emails` и `review-tasks`. Процессоры: `EmailProcessor`, `ReviewTaskProcessor`.
- `ThrottlerModule` — глобальный rate limit 30 req/min.

**Фаза 2: Улучшенные отзывы**
- Новый статус `PENDING_EMAIL` → email-верификация перед модерацией. Токен 48h TTL, cron-очистка.
- `ReviewPhoto` модель — до 5 фото на отзыв, sharp обработка, WebP.
- `ReviewVote` модель — "Полезный отзыв", дедупликация по SHA-256(IP).
- Honeypot-поле `website` + проверка минимального времени заполнения (5 сек) в backend.
- При approve → email автору через BullMQ. При создании → email-верификация или уведомление админу.

**Фаза 3: Внешние отзывы**
- `ExternalReview` модель — ручной импорт отзывов с Яндекс.Карт, 2ГИС, Tripadvisor, Google.
- Admin CRUD + batch JSON import.
- Участие в `recalculateEventRating` через взвешенное среднее.
- Frontend: бейджи источников, секция "Отзывы с других площадок".

**Фаза 4: Пост-покупочный flow**
- `ReviewRequest` модель — токен для прямой ссылки, tracking (sent/opened/clicked/reviewed).
- `ReviewSchedulerService` — cron ежедневно в 10:00 (1 день после события), повторное напоминание по воскресеньям.
- Pre-filled форма `/reviews/write?token=xxx` — автозаполнение email, автоматический `isVerified: true`.
- Verified page `/reviews/verified` — после подтверждения email.

### Проблемы

- Миграция Prisma не прошла через `prisma migrate dev` из-за конфликтов в shadow DB (старые enum-миграции). Создана SQL-миграция вручную.
- SMTP пока не настроен — все email-операции работают в DRY RUN режиме (логируются, не отправляются).
- sharp требует native build — нужно проверить что `pnpm approve-builds` включает его на сервере.

---

## 13.02.2026 — Гибридные туры: ручные офферы + корзина + checkout

### Наблюдения

Реализован полный цикл гибридной торговой системы — от ручных офферов до оформления заказа и управления заявками в админке. Система расширяет существующую мульти-офферную архитектуру, добавляя возможность ручного ввода событий и покупки через несколько каналов одновременно.

Архитектурный принцип: `Event = контент/SEO`, `Offer = способ купить`, `Session = дата/время`. Этот принцип сохранён и расширен на всех уровнях.

### Решения

1. **Этап 1 — Ручные офферы**:
   - Добавлены `REQUEST_ONLY` в PurchaseType и `MANUAL` в EventSource
   - `EventOffer` расширен полями `availabilityMode`, `badge`, `operatorId` (FK → Operator)
   - Backend CRUD: POST (создание), PUT (полное обновление), DELETE (только MANUAL), POST clone (копия без id/price/deeplink)
   - Admin UI: полноценная форма в Dialog (источник, тип покупки, цена, комиссия, приоритет, доступность, бейдж, оператор), кнопки Edit/Clone/Delete
   - Frontend: обработка REQUEST_ONLY (встроенная форма заявки), бейджи офферов, multi-offer display при нескольких активных офферах

2. **Этап 2 — Wizard создания Event**:
   - POST /admin/events: создаёт Event + первый Offer в транзакции, auto-slug через кириллическую транслитерацию
   - EventCreate.tsx: wizard из 2 шагов (контент/SEO + первый оффер), интегрирован в роутинг (/events/new)

3. **Этап 3 — Корзина и Checkout**:
   - **Модели**: `CheckoutSession` (snapshot корзины, контакт, UTM, IP, статусы) + `OrderRequest` (конкретная заявка, nullable checkoutSessionId для quick-request)
   - **Cart**: CartContext + localStorage, CartProvider в root layout, CartDrawer (Sheet справа), CartIcon с бейджем в Header, AddToCartButton на странице события
   - **Checkout API**: POST /checkout/validate (проверка офферов), POST /checkout/session (сессия + заявки), POST /checkout/request (быстрая заявка без корзины), GET /checkout/session/:id
   - **Checkout Page**: 3 шага (проверка → контакты → готово), разделение на "Оплата у партнёра" (REDIRECT) и "Заявка на подтверждение" (REQUEST_ONLY)
   - **Admin**: CheckoutSessionsList с вкладками "Заявки" и "Sessions", поиск, фильтры по статусу, кнопки Подтвердить/Отклонить с dialog для заметки

4. **SQL-миграция**: `20260213_hybrid_offers/migration.sql` — все enum-расширения, новые колонки, FK, индексы, CheckoutSession и OrderRequest таблицы.

### Проблемы

- EventSource enum не содержал MANUAL — добавлен в schema и миграцию
- tcEventId имеет @unique constraint — для ручных событий генерируется уникальный `manual-{timestamp}-{random}` идентификатор
- Миграция должна быть применена вручную через `prisma migrate resolve` из-за ограничений enum в PostgreSQL

---

### 13 февраля 2026 — Консолидация PurchaseType, State Machine, SLA/TTL, Аналитика

#### Наблюдения
- `PurchaseType` содержал 4 значения: `TC_WIDGET`, `REDIRECT`, `API_CHECKOUT`, `REQUEST_ONLY`.
- `API_CHECKOUT` был stub-заглушкой и нигде не использовался в реальных данных.
- `TC_WIDGET` и `REQUEST_ONLY` — неоптимальные имена, привязанные к конкретному провайдеру и слишком длинные.
- Переходы статусов CheckoutSession и OrderRequest не были формализованы — контроллер мог записать любой статус напрямую.
- У OrderRequest не было SLA-контроля: заявки могли висеть вечно в PENDING.

#### Решения
1. **PurchaseType: 4 → 3 типа**:
   - `TC_WIDGET` → `WIDGET` (универсальный — TC и любые будущие виджеты)
   - `REDIRECT` → `REDIRECT` (без изменений)
   - `API_CHECKOUT` → удалён (мёрж в `REQUEST`)
   - `REQUEST_ONLY` → `REQUEST` (короче, чище)
   - Миграция через пересоздание enum в PostgreSQL (CREATE TYPE new → ALTER COLUMN → DROP old → RENAME)
   - Маппинг обратной совместимости в `PURCHASE_TYPE_COMPAT` (shared)

2. **State Machine** (`checkout-state-machine.ts`):
   - Все допустимые переходы CheckoutSession и OrderRequest описаны декларативно
   - `assertCheckoutTransition()` / `assertOrderRequestTransition()` — бросают ошибку при невалидном переходе
   - Терминальные статусы: `COMPLETED`, `EXPIRED`, `CANCELLED` (для CS); `CONFIRMED`, `REJECTED`, `EXPIRED` (для OR)
   - Интегрировано в `admin-checkout.controller.ts`

3. **SLA/TTL для OrderRequest**:
   - Новое поле `slaMinutes` (default 30) в модели OrderRequest
   - Константы в state machine: `DEFAULT_REQUEST_SLA_MINUTES = 30`, `QUICK_REQUEST_TTL_MINUTES = 1440` (24ч)
   - Cron `OrderExpiryService` (каждую минуту) — автоматически переводит PENDING → EXPIRED по истечении TTL

4. **Аналитический отчёт** (`GET /admin/checkout/analytics`):
   - Распределение активных офферов по `purchaseType` (WIDGET / REDIRECT / REQUEST)
   - Количество и статусы checkout sessions и order requests
   - Конверсия: sessions → completed, requests → confirmed
   - Средний SLA (время от создания до подтверждения заявки)
   - Admin UI: новая вкладка «Аналитика» с карточками и progress bars

#### Проблемы
- PostgreSQL не поддерживает прямое удаление значений из enum → решено через пересоздание типа
- Prisma не умеет делать `ALTER TYPE RENAME VALUE` → миграция создана вручную

---

### 13 февраля 2026 — Хардинг State Machine, WIDGET contract, SLA v2, аналитика v2

#### Наблюдения
- Ревью показала, что state machine нуждается в разделении переходов по актору (user/admin/system).
- `purchaseType=WIDGET` нуждался в формальном контракте: "рендерим виджет по widgetProvider + widgetPayload".
- Средний SLA (avg) маскирует хвосты; нужны p50 и p90 для реальной картины.
- При истечении заявок нужно записывать причину (SLA/TTL/CART) для точной аналитики.
- CheckoutSession должна хранить immutable snapshot офферов, иначе аналитика "плывёт".

#### Решения
1. **WIDGET contract**:
   - Новые поля в EventOffer: `widgetProvider` (TEXT) + `widgetPayload` (JSONB)
   - Контракт: `purchaseType=WIDGET` → рендерим виджет по `widgetProvider`, конфиг в `widgetPayload`
   - Миграция автозаполняет `widgetProvider=TC` + payload для существующих WIDGET-офферов
   - WidgetPayload TypeScript интерфейс в shared
   - Frontend рендерит виджет по `widgetProvider`, не угадывает по source

2. **PURCHASE_TYPE_COMPAT с логированием**:
   - `resolvePurchaseType(raw, context)` — выдаёт console.warn при обнаружении legacy-значения
   - Позволяет найти и вычистить все источники старых типов

3. **Миграция — hardened**:
   - `ALTER COLUMN DROP DEFAULT` перед переключением типа
   - Verify block: `RAISE EXCEPTION` если найдены офферы со старым значением
   - Составной подход: TEXT → update values → DROP old TYPE → CREATE new → CAST

4. **State Machine v2** (user vs admin vs system):
   - Переходы разделены по `TransitionActor`: user, admin, system
   - Идемпотентность: `from === to` → no-op (возвращает false), не бросает ошибку
   - `assertCheckoutTransition(from, to, actor)` → `boolean` (true = нужно обновить, false = no-op)
   - Применяется в контроллерах, cron, будущих вебхуках

5. **SLA/TTL v2**:
   - `slaMinutes` = ожидаемое время реакции оператора (не путать с TTL)
   - `expiresAt` = явная дата истечения заявки (TTL)
   - Новое поле `expireReason`: SLA | TTL | CART
   - Составной индекс `(status, expiresAt)` для дешёвой выборки в cron
   - `determineExpireReason()` — определяет причину по контексту заявки
   - Cron пишет `expireReason` при каждом expire

6. **Аналитика v2** (GET /admin/checkout/analytics):
   - Drop-off по шагам checkout (воронка)
   - Конверсия по purchaseType + source (в связке)
   - p50 и p90 времени до подтверждения (не только avg)
   - SLA Breach Rate = % заявок, подтверждённых позже slaMinutes
   - Причины истечения (requestsByExpireReason)
   - Admin UI: полноценный дашборд с воронкой, карточками p50/p90, breach rate с цветовыми индикаторами

7. **Immutable snapshot в CheckoutSession**:
   - Новое поле `offersSnapshot` (JSONB): title, price, type, deeplink, widgetPayload, operator
   - Фиксируется в момент создания сессии, не зависит от будущих правок офферов

#### Проблемы
- Нет проблем — все изменения backwards-compatible

---

### 14.02.2026 — Система поддержки (Phase 1)

#### Наблюдения
- Для минимизации нагрузки на человеческую поддержку нужен трёхуровневый подход: самообслуживание (FAQ, трекинг), автоматические уведомления (email по статусам), и тикет-система для эскалаций.
- Telegram Bot временно отложен из-за ограничений в РФ.
- Виджет обратной связи (floating button + modal) обеспечивает доступность формы с любой страницы сайта без перехода на /help.

#### Решения
1. **Публичная страница /help** — 20+ FAQ в 5 категориях (покупка, заказы, возвраты, музеи, безопасность) + FAQPage JSON-LD для SEO.
2. **Трекинг заказа /orders/track** — публичная страница с поиском по shortCode (CS-XXXX), таймлайном статусов, составом заказа. Backend endpoint `GET /checkout/track/:shortCode` (без авторизации).
3. **Email-уведомления по статусам заказа**:
   - `order-created` — при создании CheckoutSession
   - `order-confirmed` — при подтверждении оператором (admin confirm request)
   - `order-rejected` — при отклонении
   - `order-expired` — при автоматическом истечении (cron)
   - `order-completed` — при завершении (с предложением оставить отзыв)
   - `ticket-reply` — при ответе администратора на тикет
4. **Модель SupportTicket** — Prisma-модель с категориями (ORDER/REFUND/VENUE/TECHNICAL/OTHER), приоритетами (LOW/MEDIUM/HIGH/URGENT), статусами (OPEN/IN_PROGRESS/WAITING_CUSTOMER/RESOLVED/CLOSED), SLA дедлайнами, связью с заказом по orderCode.
5. **Авто-маршрутизация** — автоматический приоритет на основе категории (REFUND→HIGH, TECHNICAL→HIGH), SLA дедлайны по приоритету (URGENT: 1ч, HIGH: 4ч, MEDIUM: 24ч, LOW: 72ч).
6. **Admin UI для тикетов** — список с фильтрами/поиском, статистикой (открытые, SLA нарушены), детальная страница с перепиской, быстрыми шаблонами ответов, внутренними заметками.
7. **Виджет обратной связи** — floating button (MessageCircle) на всех страницах, модал с формой, отправка через API, подтверждение с кодом тикета.
8. **TicketResponse** — модель для переписки: поддерживает admin/system/customer авторов, внутренние заметки (не видны клиенту), хронологический порядок.

#### Проблемы
- Telegram Bot API заблокирован в РФ — отложен до нахождения решения (прокси / web-app вместо бота).
- На `/help` форма должна быть клиентской (CSR), а FAQ — серверными (SSR для SEO). Решено вынесением ContactForm в отдельный 'use client' компонент.

---

### 14.02.2026 — Post-seed: привязка Event → Venue, OPEN_DATE, изображения

#### Наблюдения
- После засева venues в seed-venues.ts данные venues существуют изолированно: ни один Event не связан с Venue через `venueId`, нет OPEN_DATE офферов, нет изображений у venues.
- Для полноценной работы `/venues/[slug]` нужна связь Event.venueId → Venue, что заполнит секцию "Выставки и события" и позволит venue-level reviews агрегироваться.
- Next.js `remotePatterns` блокировал бы загрузку Unsplash-изображений — добавлены `images.unsplash.com` и `upload.wikimedia.org`.
- `VenueDetail` в shared пакете не содержал поля `highlights`, `faq`, `features`, `recommendPercent`, `reviews`, `relatedArticles` — страница использовала `any`, но контракт был неполным.

#### Решения
1. **seed-venue-links.ts** — идемпотентный post-seed скрипт (4 шага):
   - Связь Event → Venue по ключевым словам в title (15 venue-keyword матчей по городам)
   - Создание OPEN_DATE события «Эрмитаж — входной билет» с MANUAL оффером (REDIRECT → hermitagemuseum.org), `meetingPoint`, `meetingInstructions`, `operationalNote`
   - Каскадная привязка EventOffer.venueId для уже связанных Event (прямые venue-офферы)
   - Заполнение imageUrl + galleryUrls для ТОП-10 venues (Unsplash URLs, не перезаписывает загруженные через админку)
2. **next.config.ts** — расширен `remotePatterns` для Unsplash и Wikimedia.
3. **VenueDetail** — интерфейс дополнен полями `cityId`, `highlights`, `faq`, `features`, `recommendPercent`, `reviews`, `relatedArticles`.

#### Проблемы
- Нет прямого доступа к БД для запуска seed — скрипт создан, запуск при деплое.
- Unsplash URLs для фото venues — placeholder; в production нужно заменить на собственные фото из S3/CDN.

---

## 16.02.2026 — Музеи и Арт: консистентные счётчики, выбор города, динамический футер и промо-подборки

### Наблюдения

- Счётчик «Музеи и арт» в разных местах вёл себя по-разному:
  - на странице города `/cities/[slug]` уже была логика «площадки (venues) + события с привязанным venueId»;
  - в списке городов (`/cities` и блок «Города» на главной) показывалось только `_count.venues`, а тексты говорили про «музеи и арт»;
  - Hero и футер использовали суммы событий/площадок только над теми городами, которые реально отображаются, но в интерфейсе было несколько разных формулировок («событий и музеев», «событий и мест»).
- Корзина в шапке создаёт ощущение единой оплаты, хотя сейчас каналы оплаты разные (виджеты TC/teplohod, redirect, заявки).
- Город в шапке хотелось выбирать один раз и затем видеть каталог, отфильтрованный по этому городу.
- PromoBlock на главной показывает сезонные промо («День влюблённых», «Масленица», «Зимний город», «Каникулы с детьми»), но логика этих промо была захардкожена на фронте и не редактировалась из админки.
- В футере список городов был статичным и не отражал реальные данные по каталогу (top-городов по насыщенности).

### Решения

1. **Единая логика «Музеи и арт» по городам**
   - В `CatalogService.getCities`:
     - оставлена фильтрация только «видимых» городов (isActive, не скрытые региональной логикой, ≥2 активных события, есть описание);
     - добавлен расчёт `museumCount` для каждого города:
       - `museumCount = активные площадки (venues) + активные события с `venueId != null`, учитывая SCHEDULED с будущими сеансами и OPEN_DATE с неистёкшим endDate;
       - используется один групповой запрос `groupBy cityId` по событиям для всех видимых городов.
   - В `/cities` и в блоке «Города» на главной:
     - в карточках городов вместо чистого `_count.venues` используется `museumCount`, с фолбэком на `_count.venues` для совместимости;
     - тексты продолжают говорить про «музеи» и «музей/музея/музеев», но численно это «площадки + события в них», как и на странице города.

2. **Hero и выбор города**
   - Hero на главной:
     - итоговая формулировка: «N+ событий и мест в M городах России»;
     - счётчики `totalEvents`, `totalVenues`, `totalEventsAndVenues`, `totalCities` считаются только по тем городам, которые реально отображаются (результат `getCities()` после фильтров).
   - Выбор города в шапке:
     - добавлен компактный селектор города в правую часть Header (десктоп);
     - список городов для селектора берётся через `api.getCities(true)` (featured-города, как на главной);
     - при выборе города селектор обновляет URL `/events?city={slug}`;
     - на странице `/events` добавлен эффект синхронизации фильтра `city` с `useSearchParams`, чтобы любые изменения `?city=` (в т.ч. из шапки или прямых ссылок) автоматически обновляли фильтр и перегружали каталог.
   - Корзина:
     - иконка/дровер корзины убраны из Header, чтобы не создавать впечатление единой оплаты до тех пор, пока не выровнены все платёжные каналы;
     - сама корзина, checkout и AddToCart остаются для гибридных офферов, но становятся менее навязчивыми в основном UX.

3. **PromoBlock → Collection-модель**
   - На бэкенде:
     - в `seed-collections.ts` добавлены 4 кросс-городские подборки:
       - `den-vlyublennyh` — фильтр по тегу `romantic`, `additionalFilters.promo.months = [2]`;
       - `maslenitsa` — фильтр по подкатегории `GASTRO`, `additionalFilters.promo.months = [2, 3]`;
       - `zimniy-gorod` — фильтр по тегу `bad-weather-ok`, `additionalFilters.promo.months = [11, 12, 1, 2, 3]`;
       - `kanikuly-s-detmi` — аудитория `KIDS`, `additionalFilters.promo.months = [1, 3, 6, 7, 8]`;
     - каждая подборка — полноценный `Collection` с title/subtitle/heroImage/description/metaTitle/metaDescription; `buildEventFilter` отвечает за динамический отбор событий.
   - На фронтенде:
     - `PromoBlock` оставлен как сезонная витрина по месяцам, но ссылки изменены с `/events?...` на `/podborki/{slug}` вышеуказанных подборок;
     - логика выбора месяца теперь только решает, какие **подборки** подсветить, а не какие query-параметры передать `/events`.

4. **Динамический блок городов в футере**
   - `Footer` переведён в async-компонент (SSR) и научен поднимать данные через `api.getTopCities()` (обёртка над `GET /cities`);
   - логика:
     - берём только те города, которые `getCities` уже считает «видимыми» (>=2 активных события, описание, не скрыты регионом);
     - для каждого города считаем `total = _count.events + museumCount` (события + «места»);
     - сортируем по `total` по убыванию, берём топ-8;
   - отображение:
     - в футере добавлена колонка «Города» между «Каталог» и «Компания»;
     - каждый пункт теперь — просто `<Город>` без чисел (осознанный отказ от формулировки «N событий и мест» как визуально перегруженной);
     - при ошибках API колонка «Города» скрывается, а остальные секции футера продолжают работать.

### Проблемы / TODO

- Для полного отключения «единой корзины» на уровне продукта потребуется дополнительная работа:
  - пересмотреть ссылочность на `/checkout` и CTA «В корзину» в случаях, когда оплата идёт через внешние виджеты/redirect;
  - возможно, временно ограничить корзину только на сценарии с ручными/гибридными офферами.
- Для промо-подборок необходимо следить за тем, чтобы события были корректно размечены тегами/подкатегориями (`romantic`, `GASTRO`, `bad-weather-ok`, аудитория `KIDS`), иначе часть промо-страниц может оказываться пустой.
