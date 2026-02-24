# Переезд на Directus как внутреннюю админку

Цель: контент/SEO/venues/редактура событий в Directus; импорт TC и teplohod.info попадает в Directus и готов к постредакции без риска перетирания при следующем sync.

Модель: **Event** (оригинал из источника) + **EventOverride** (правки «для Daibilet»). Sync обновляет только Event/Offer/Session; override не трогает.

---

## Фаза 0 — Подготовка (сделано)

### 0.1 Что редактируем вручную
- **Редактируем:** City, Tag, LandingPage, Article, Venue, EventOverride, (опционально ExternalWidget).
- **Не редактируем:** импортные «сырьевые» поля Event/EventSession/EventOffer (кроме статуса/primary при необходимости).

### 0.2 Поля очереди постредакции (реализовано)
- **EventOverride.editorStatus** — `NEEDS_REVIEW` | `IN_PROGRESS` | `PUBLISHED` | `REJECTED`.
- **EventOverride.needsReviewAt** — для сортировки очереди.
- **EventOverride.lastImportedAt** — когда последний раз обновлялся импорт (Event.updatedAt).
- **EventOverride.updatedBy** — сделан nullable; для авто-созданных sync override = null.

Миграция: `prisma/migrations/20260223180000_editor_status_postedit_queue/migration.sql`.

---

## Фаза 1 — Directus рядом с текущим стеком
- Развернуть Directus как отдельный сервис (docker-compose / отдельный контейнер).
- Подключить к текущему Postgres (сначала read-only пользователь).
- Учесть 4GB RAM: один контейнер Directus без лишних воркеров.

---

## Фаза 2 — Подтянуть контент в Directus
- Включить коллекции: City, Tag, Article, LandingPage, ComboPage, SeoTemplate, SeoContent, SeoMeta (если есть).
- Настроить названия/интерфейс, права: контент-редакторы не видят финансовые/заказные таблицы.

---

## Фаза 3 — Импорт TC/TEPLOHOD → очередь в Directus (частично сделано)

### 3.1 Данные в Directus
- **Event** — read-only для редакторов.
- **EventOverride** — editable.
- В форме: блок «Оригинал» (из Event) и блок «Для Daibilet» (поля EventOverride).

### 3.2 Авто-создание override на импорт (реализовано)
После sync (TC и Teplohod) вызывается **PostEditQueueService.ensureOverridesForImportedEvents**:
- для **новых** импортных событий создаётся EventOverride с `editorStatus = NEEDS_REVIEW`;
- для **обновлённых** импортных: если override не PUBLISHED — возврат в NEEDS_REVIEW (или сохранение IN_PROGRESS);
- **PUBLISHED** не сбрасывается — только обновляется `lastImportedAt`.

Подключение:
- **Full sync:** после TC sync и TEP sync вызывается очередь с `since: runStartedAt` (по TC и по TEPLOHOD).
- **Incremental sync:** после TC sync — очередь по TC с `since: runStartedAt`.

Код: `packages/backend/src/catalog/postedit-queue.service.ts`, вызовы в `packages/backend/src/queue/sync.processor.ts`.

### 3.3 Виджеты teplohod
При необходимости редактировать виджеты в Directus — модель ExternalWidget/widgetPayload уже есть; можно дать права на редактирование.

---

## Фаза 4 — Публикация на сайт и кеш/SEO
- **Правило «опубликовано»:** сайт берёт `effectiveTitle = override.title ?? event.title` и т.п.; если `editorStatus !== PUBLISHED` или `isHidden === true` — не показывать / robots noindex (см. SEO.md).
- **Инвалидация кеша:** при сохранении EventOverride (и City, Landing, Seo*) — дергать существующую инвалидацию; опционально webhook Directus → `POST /admin/ops/invalidate`.

Реализовано в коде:
- **EventOverrideService.applyOverrides** — не показывает события с override, у которых `editorStatus !== PUBLISHED` или `isHidden === true`.

Дополнительно для ручных событий и билетов с открытой датой:
- **Event.source = MANUAL** — события оператора, создаваемые в Directus.
- **EventOffer.priceMode / validityMode / validUntil / validDays / minAmount / suggestedAmounts** — режимы OPEN_DATE/OPEN_PRICE для MANUAL-офферов (например, билеты в музей без фиксированной даты).

---

## Задачи Cursor Auto / pipeline (чеклист)
- [x] Добавить EditorStatus + поля EventOverride (editorStatus, needsReviewAt, lastImportedAt), миграция
- [x] PostEditQueueService.ensureOverridesForImportedEvents
- [x] Вызов очереди после TC/TEP sync в SyncProcessor (full + incremental)
- [x] applyOverrides: скрывать события с editorStatus !== PUBLISHED
- [x] OverrideEventDto + API: поле editorStatus для ручной установки PUBLISHED
- [x] Расширить EventOffer для OPEN_DATE/OPEN_PRICE (PriceMode, ValidityMode, поля в схеме + миграция)
- [ ] AdminSplit: матрица разделов старой админки → Directus vs Nest (этот документ)
- [ ] deploy/directus: docker-compose + env (staging)
- [ ] Directus prod + домен directus.daibilet.ru за nginx
- [ ] DB user read-only для Directus (staging)
- [ ] Включить коллекции City/Tag/Article/Landing/Seo* в Directus
- [ ] Роли Admin / Editor / SEO в Directus
- [ ] Event (read-only) + EventOverride (write) в Directus, форма «Оригинал» vs «Для Daibilet»
- [ ] Directus view: «Очередь постредакции» (filter: editorStatus=NEEDS_REVIEW, source in TC/TEPLOHOD)
- [ ] Документация для редактора: как работает импорт и очередь постредакции

---

## Как работает очередь постредакции
1. Sync (TC или TEP) обновляет Event/EventSession/EventOffer.
2. Сразу после sync вызывается `ensureOverridesForImportedEvents(source, since)`.
3. Для каждого импортного события (source TC или TEPLOHOD), обновлённого после `since`: если нет override — создаётся с NEEDS_REVIEW; если есть и не PUBLISHED — обновляется в NEEDS_REVIEW (или остаётся IN_PROGRESS); если PUBLISHED — только lastImportedAt.
4. В Directus редактор видит очередь (filter NEEDS_REVIEW), правит override, выставляет PUBLISHED.
5. Сайт в applyOverrides показывает только события с override PUBLISHED (или без override).

---

## AdminSplit: матрица разделов старой админки → Directus vs Nest

### Правила
- **Directus** = UI + контент/справочники + очереди и простые ops-кнопки.
- **Nest** = бизнес-логика (checkout, sync, платежи, fulfilment, кэш, аудит, RBAC, Supplier Portal).

### Таблица разделов (Sidebar старой админки)

| Раздел (старый UI) | Что делает | Источник правды (Directus) | Что остаётся в Nest | Статус |
| --- | --- | --- | --- | --- |
| Dashboard | Обзор метрик | Кастомный дашборд (опционально) | Метрики/агрегации (API) | TODO |
| События | CRUD, override, merge | `events` (MANUAL), `event_overrides` | Каталог/поиск, sync TC/TEP, EventSession | IN_PROGRESS |
| Merge дублей | Дедупликация событий | Custom Page в Directus (список кандидатов + кнопка merge) | FuzzyDedupService, /admin/events/deduplicate | TODO |
| Заказы | Поиск/просмотр Package + ваучер | Custom Page `Orders` (read-first + actions) | Packages/Orders/CheckoutService/VoucherService | TODO |
| Заявки | ORDER_REQUESTS, quick request | Custom Page `Requests` | OrderRequest + CheckoutSession | TODO |
| Поддержка | Тикеты поддержки | Коллекция `support_tickets` | Mail/notifications, SLA | TODO |
| Города | CRUD городов, featured | `cities` | CatalogService.getCities, RegionService | DONE (Directus как источник данных) |
| Места (Venues) | CRUD площадок/музеев | `venues` | VenueService, commission расчёт | DONE (Directus CRUD) |
| Теги | Теги/связки | `tags`, связи через Directus | TagService в каталоге | DONE (Directus CRUD) |
| Подборки | Тематические коллекции | `collections` | CollectionService (выдача) | DONE (Directus CRUD) |
| Лендинги | Лендинги по тегам/фильтрам | `landing_pages` | LandingService (рендер/кэш) | DONE (Directus CRUD) |
| Combo | Комбо-страницы | `combo_pages` | ComboService (populate, расчёты) | DONE (Directus CRUD) |
| Статьи | Контент/блог | `articles` (+ articleTags/events) | BlogService | DONE (Directus CRUD) |
| Виджеты Teplohod | Связка Event↔Widget | `external_widgets` (или аналог) | TepApiService (check), cache | IN_PROGRESS |
| Поставщики | Operators, Supplier Portal | `operators` (справочник) | Supplier Portal, API keys | IN_PROGRESS |
| Модерация | Очередь UGC/поставщиков | Views в Directus по ModerationStatus/EditorStatus | ModerationService | TODO |
| Отзывы | Reviews | `reviews` | ReviewService (верификация, агрегация) | IN_PROGRESS |
| Внешние отзывы | Rating агрегаторы | `external_reviews` | ExternalReviewService | IN_PROGRESS |
| Upsells | Конфиг апселлов | `upsells` | UpsellService | TODO |
| Failed Jobs | Мониторинг очередей | Custom Page `FailedJobs` | BullMQ, FulfillmentProcessor | TODO |
| Сверка | Reconciliation/Retry | Custom Page `Reconciliation` | AdminReconciliationController, FulfillmentService | TODO |
| Аудит | Логи действий | `audit_log` (read-only) | AuditInterceptor/Service | TODO |
| Настройки | Ops-кнопки, флаги | Custom Page `Ops Tools` + env | Settings/ops endpoints в Nest | IN_PROGRESS |

### Опасные операции (только через Nest endpoints)

- Fulfilment: start/execute/retry.
- Refunds/payments: любые операции с платежами.
- Cache invalidation: `CacheInvalidationService` (`invalidateEvent*`, `invalidateCity`, `invalidateFull`).
- Sync jobs: full/incremental sync, backfills, retag.
- Reconciliation: ручной retry fulfillment, правка статусов оплат.

