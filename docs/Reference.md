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

---

## 2. Observability

- **RequestId:** header `x-request-id`, логи `[requestId=...]`
- **PII masking:** email, phone, auth — маскируются в логах
- **Sentry:** при SENTRY_DSN + production
- **Ops:** GET /admin/ops/health, GET /admin/ops/metrics

---

## 3. Кэш (CacheInvalidationMatrix)

| Сущность | Ключи | Инвалидация |
|----------|-------|-------------|
| Events | events:list:*, events:detail:* | Event create/update/delete |
| Search | search:* | Event/Venue изменение |
| Catalog | catalog:* | Sync, EventOverride |

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
