# Landings Architecture

## Role

Landing is a city-bound marketing presentation over the same selection foundation as collections.

- Collection = selection engine surface
- Landing = conversion/content packaging over selection output

Landings are **not** articles and **not** a replacement for collections.

## Data Model

`LandingPage` includes:

- identity: `id`, `cityId`, `slug`, `title`, `subtitle`
- workflow: `status`, `templateType`, `selectionMode`
- selection basis: `collectionId` (optional), `filterTag`, `additionalFilters`, `rankingJson`
- content packaging: hero/faq/info/reviews/links/legal/meta
- discoverability: `showInCollections`, `isIndexable`

Statuses:

- `DRAFT`
- `ACTIVE`
- `ARCHIVED`

Template types (MVP):

- `GENERIC_CARDS`
- `COMPARISON_TABLE`
- `HYBRID`
- `SEASONAL_EVENT` — сезонные событийные лендинги (например, салют 9 мая, Новый год) с дополнительным JSON `seasonalPayload`.

## Subcategory-first (read-path, 2026)

- Публичный отбор событий лендинга: **`buildLandingEventsWhere`** — ветка по тегу (`filterTag` → `tagId`) **OR** ветки по `additionalFilters.subcategories` (slug → `SubcategoryPolicyService.buildEventSubcategoryFilter`).
- Совпадает с материализатором и `GET /admin/catalog/consistency` для активных лендингов.
- Подробности: [Catalog-Classification-Policy.md](Catalog-Classification-Policy.md) §10–§11.

## Shared Selection Principle

Selection remains unified:

- `CollectionSelectionService` is canonical for **collections**.
- **Landings** use `buildLandingEventsWhere` (tag OR subcategories + сеансы/OPEN_DATE); city + `filterTag` + `additionalFilters` из `LandingPage`.
- No duplicated independent selection engines.

## Admin Surfaces

`/admin/landings`:

- list with status/template/index/showInCollections signals
- editor with sections for basis, template, status, SEO, JSON content blocks

## Catalog Contracts

- `GET /catalog/landings/:citySlug/:slug`
- `GET /catalog/collections/featured-landings?city=...`

## showInCollections

If `showInCollections = true` and landing is active:

- it appears in a dedicated featured block on `/podborki`
- it is returned by `featured-landings` endpoint
- it stays separate from regular collections list (different entity and UX role)

## Публичные маршруты и UX (март 2026)

### Каноническая страница лендинга

- URL: `/cities/:citySlug/:landingSlug` (`packages/frontend/src/app/cities/[slug]/[landingSlug]/page.tsx`).
- Данные: `GET /catalog/landings/:citySlug/:slug` → `toLandingVM`, список вариантов и фильтров.
- Список рейсов: `LandingClient` + `FilterBar` + `ComparisonTable` / `VariantCards` по `templateType`.
- **Режим слотов времени** задаётся в `landingTimeSlotMode(landingSlug)` (`_landingVm.ts`):
  - `night` — например `nochnye-mosty` (интервалы под развод мостов);
  - `hidden` — дневные/региональные лендинги из фиксированного набора slug (чипы времени скрыты);
  - `evening` — всё остальное (вечерние интервалы).
- Редиректы: если канонический URL совпадает с хабом «речные» или «автобусы», но данных лендинга нет — редирект на `/cities/:slug` (см. `river-cruises-routing`, `bus-tours-routing`).

### Тематические хабы и сезонные витрины

| Маршрут | Назначение |
|--------|------------|
| `/river-cruises`, `/river-cruises/[citySlug]` | Обзор городов с подборками речных/водных прогулок, ссылки на канонические лендинги |
| `/bus-tours`, `/bus-tours/[citySlug]` | То же для автобусных/обзорных экскурсий |
| `/salute-9-may` | Хаб «Салют 9 мая»: список городов с лендингами `/cities/:citySlug/salute-9-may` |
| `/labs/nochnye-mosty` | Лабораторный UI на тех же данных, что прод-лендинг «ночные мосты» |

### Даты и фильтры (shared + UI)

- `@daibilet/shared`: модуль `moscow-calendar` — **`CITY_TIMEZONES`**, **`getCityTimezone(slug)`**, **`calendarDayFromIso`**, **`dateToISO`**, **`getTodayISO`/`getTomorrowISO`** по IANA-зоне города; алиасы `moscow*` и `dateToMoscowISO` — по умолчанию `Europe/Moscow`. Бэкенд формирует `filters.dates` в TZ города лендинга; `LandingClient`/`FilterBar`/таблица и карточки получают ту же зону от `citySlug` (как `timezone` в [city-landing-enhancer](https://github.com/Twisterrrrr/city-landing-enhancer) `DateFilter`).
- `FilterBar`: чипы дат/времени/причала/цены; **сортировка — табы с нижним подчёркиванием** активного варианта.
- `DateRibbon` (каталог событий): в попапе «Другая дата» подсветка выбранного дня только если выбрана **кастомная** дата (не день с ленты «Сегодня»/«Завтра» и не диапазон выходных).

### Seasonal landings / seasonWindow

- Для `templateType = SEASONAL_EVENT` допускается дополнительное поле `seasonalPayload` с ключом `seasonWindow: { startMonthDay: 'MM-DD', endMonthDay: 'MM-DD' }`.
- `LandingMaterializerService` при проходе по `TOPIC_DEFINITIONS_CITY` учитывает сезон: лендинг активен только если **количество релевантных событий ≥ minEvents** и **текущая дата попадает в окно**.
- Поддерживаются интервалы внутри года (`03-01`–`05-09`) и «через год» (`12-01`–`01-10`).
- «Салют 9 мая» в Москве, Петербурге, Казани и Нижнем Новгороде настроен как `SEASONAL_EVENT` с окном `03-01`–`05-09`; вне этого периода лендинги автоматически скрываются материализатором.
