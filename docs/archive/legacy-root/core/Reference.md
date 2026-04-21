# Справочник — спецификации и правила

> Объединённый документ: PageTemplateSpecs, Cache, Observability, ConsolidationPlan, typing-guide.

---

## 1. Шаблоны страниц (PageTemplateSpecs)

### Посадочная «Музеи» (20.02.2026)

**URL:** `/cities/[slug]/museums`. **Блоки:** HERO → Лучший выбор (CTA) → Секции → Каталог → Маршрут дня → FAQ → SEO-текст. **Контент:** getMuseumsLandingContent(citySlug). **API:** GET /catalog?category=MUSEUM&city={slug}.

### Единый каталог (Вариант B)

GET /api/v1/catalog. category=MUSEUM → Venue; EXCURSION|EVENT → Event. CatalogItem — общий формат. `/events` при MUSEUM → CatalogCard → VenueCard. Детали: venue → /venues/[slug], event → /events/[slug].

### По категориям Event

| Поле | Экскурсии | Музеи | Мероприятия |
|------|-----------|-------|-------------|
| dateMode | SCHEDULED | OPEN_DATE/SCHEDULED | SCHEDULED |
| Режим работы | — | ✓ Venue | — |
| Ближайший сеанс | ✓ | опц. | ✓ |
| Программа/состав | — | — | ✓ |
| Маршрут/меню/теплоход | ✓ | — | — |
| Текущие выставки | — | ✓ | — |

**Музеи:** venueId, isPermanent, endDate, openingHours. **EVENT:** program, cast, hall. **EXCURSION:** маршрут, меню, теплоход (RIVER).

### Venue PDP — поле `template` в публичной деталке (24.03.2026)

**Эндпоинты:** `GET /api/v1/venues/:slug`, предпросмотр `GET /api/v1/preview/venues/:id` (тот же shape `VenueDetail`). **Доп. поле:** опциональный объект **`template`** (`VenuePublicTemplate` в `@daibilet/shared`): нормализованные секции из `venueTemplateData` + fallback на legacy (`description`, `shortDescription`, `galleryUrls`, `openingHours`, `faq`, `highlights`). **Типы площадок с template-aware витриной (MVP):** `MUSEUM`, `ART_SPACE`, `GALLERY`, `EXHIBITION_HALL`. **Доп. ключи JSON (помимо полей из `getVenueTemplateSpecs`):** `introTitle` (подзаголовок H1), `highlights` / `templateHighlights`, `amenities` / `amenitiesNote`, `amenitiesList` / `amenityList`. Подробнее: `Project.md` (модель Venue), `Diary.md` за 24.03.2026.

---

## 2. Observability

- **RequestId:** header `x-request-id`, прокидывается в `req.id` / ответ `x-request-id`; в теле ошибок JSON — поля `requestId`, `error` (см. `AllExceptionsFilter`).
- **Structured logs:** HTTP-завершения (`LoggingInterceptor`) и платёжные счётчики (`PaymentMetricsService`) — JSON с полями `level`, `type`, `message`, `requestId` (опц.), `meta`. Кэш analytics-tabs логирует `type: ANALYTICS_TABS_CACHE`, `message: hit|miss`.
- **PII masking:** поля `email` / `phone` в объектах и вхождения в строках (`maskPii` / `maskPiiInString`); query-параметры в url-логах — `sanitizeUrlForLog` (в т.ч. `phone`).
- **Latency (скользящее окно в памяти):** `OperationLatencyTrackerService` — для ключевых операций `p50`, `p95`, `count`, `lastUpdatedAt` (+ legacy-поля). Метрики: `admin.dashboard.analyticsTabs.compute`, `admin.catalog.consistency.compute`.
- **GET /admin/ops/metrics** (единая реализация в `AdminOpsController`): плоские счётчики платежей (`...`), `counters`, `rates` (доля ошибок + процентные поля для алертов), `alerts`, `cache` (hits/misses/hitRate), `latency.byMetric`, `latency.analyticsTabsCompute`, `latency.catalogConsistencyCompute`, `system.uptime` / `uptimeSeconds`, `startedAt`, `timestamp`, `diagnostics` (ссылки на связанные GET).
- **GET /admin/ops/diagnostics** (`AdminReconciliationController`): быстрые COUNT по каталогу (`catalog.*`), `collections.emptyCollections` / `landings.emptyLandings` (числа из кэша consistency, если он прогрет; иначе `null` и подсказка в `meta`).
- **Кэш-политика (админ):**
  - `GET /admin/dashboard/analytics-tabs`: ключ Redis `analytics:{sinceDays}:{sha256(filters)[0:16]}`, TTL 60–180s (env `CACHE_TTL_ANALYTICS_TABS` внутри клампа), успешные ответы только; обход: `nocache=1` / `ANALYTICS_TABS_DEBUG=1` / `ANALYTICS_TABS_CACHE_BYPASS=1`. `sinceDays` только 7 | 14 | 30 (иное → 7).
  - `GET /admin/catalog/consistency`: ключ `catalog:consistency`, TTL 60–120s (env в клампе). Мягкий бюджет на тяжёлый блок selection по умолчанию **1s** (`CATALOG_CONSISTENCY_BUDGET_MS`, `0` = без таймаута); при таймауте — частичный ответ с `degraded: true`.
- **Sentry:** при `SENTRY_DSN` и 5xx; `requestId` в tags.
- **RBAC / security:** `docs/RBAC-Matrix.md`, чек-лист ответов `docs/Security-Test-Matrix.md`.

---

## 3. Кэш (CacheInvalidationMatrix)

| Сущность | Ключи | Инвалидация |
|----------|-------|-------------|
| Events | events:list:*, events:detail:* | Event create/update/delete |
| Search | search:* | Event/Venue изменение |
| Catalog | catalog:* | Sync, EventOverride |
| Admin analytics-tabs | analytics:{sinceDays}:{hash} | `invalidateAfterSync`, TTL 60–180s |
| Admin catalog consistency | catalog:consistency | refresh=1, sync, TTL 60–120s |

---

## 4. План упрощения (ConsolidationPlan)

Цель: 40–60 файлов backend, docs: Project, Tasktracker, Deploy, Reference, Diary.

- **Admin:** 21 controller → 1, DTO → 1 файл (DTO ✅)
- **Supplier / Partner / SEO:** объединены ✅
- **Docs:** объединены в 5 файлов ✅

---

## 5. Типизация (typing-guide)

**Принцип:** DTO (широкие) → mapper → Prisma Input. JSON: `Prisma.JsonValue` / `toJsonValue()`.

| Зона | Решение |
|------|---------|
| Каталог `{}` | `asCatalogEntityLite()`, `isRecord()` из common/typing.ts |
| tc-sync / JSON | `toJsonValue(v)` перед записью в JSON-колонки |
| planner slot | guard + `ScoredEvent` |
| checkout | `getOrderOrThrow()`, `OrderWithRelations` |
| collection | `EventWithRelations`, единый include |
| admin-* | мапперы `mapDtoToCreateInput`, не передавать DTO в create/update |

**Допустим `as`:** после mapper, после JSON.parse/stringify, req.user после guard. **Недопустим:** входящие данные без проверок.
