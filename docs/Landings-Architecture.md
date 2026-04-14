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

---

## Multi-city / topic hub / city landing — целевой паттерн (proposal, 2026‑04)

### Зачем

Нужен “landing-домен”, который работает не только как “одна страница = один slug”, а как:

- **общий хаб‑топик** (без привязки к городу)
- **городская версия топика** (основная коммерческая посадка)
- **мультилендинг‑семейство**: один топик → набор city‑вариантов

При этом Landing остаётся отдельной сущностью и ролью:

- Article = объясняет
- Collection = упаковывает предложения/выборку
- Landing = ловит коммерческий спрос и конвертирует в каталог/выбор события

### Текущая реальность в проекте (что уже есть)

- **Канонический URL city landing** уже принят как `/cities/:citySlug/:landingSlug`.
- **Topic hubs** уже реализованы как отдельные публичные маршруты (например, `/river-cruises`, `/salute-9-may`) и ведут в city landings.
- **Подбор событий для лендинга** уже унифицирован и привязан к общему “selection” принципу (см. `buildLandingEventsWhere` / subcategory-first).

Это значит, что MVP‑часть “hub → города” у нас уже работает, но пока не формализована как единый домен “family/variants” внутри `LandingPage`.

### Целевые режимы страницы (нормализованная модель для редактора)

1) **Global / topic hub**

- Страница темы без привязки к одному городу
- UX: “Выберите город” + ссылки на city варианты
- SEO: отдельный интент (обзор/навигация), не дубль city‑лендингов

2) **City landing**

- Коммерческая посадка “тема в городе”
- Каноника: на саму себя
- Публикация должна быть запрещена, если нет выдачи (чтобы не плодить thin pages)

3) **Multi‑city topic family**

- Родитель темы + набор городских реализаций
- UX: список вариантов по городам + быстрый flow “создать вариант для города”

### Роутинг и canonical policy (что фиксируем)

- **City landing**: `/cities/:citySlug/:landingSlug` — canonical на самого себя.
- **Hub/family**: остаётся отдельным URL‑пространством (примерно как сейчас `/river-cruises`, `/salute-9-may`).
- **Важно**: hub **не каноникалится** в child и наоборот; hub и city‑страница должны отличаться по интенту/контенту, чтобы не создать дубли.

### Модель данных (целевая эволюция, не переписывая существующее сразу)

Текущая `LandingPage` уже несёт identity/workflow/selection/content. Для поддержки “семейств” нужно добавить (или эквивалентно представить) 2 недостающих аспекта:

- **тип/режим**: HUB vs CITY vs MULTI_CITY (family)
- **связь родитель‑дочь**: parentLandingId и список childLandings

Критичное ограничение, которое сохраняем:

- **уникальность city + slug** (как сейчас принято в публичном routing)

### Источник каталога на landing (минимально‑безопасный MVP)

Поддерживаем 3 режима источника событий (в UI/DTO/валидации), но на MVP можно начать с наиболее безопасного:

- **PRIMARY_COLLECTION** (самый контролируемый)
- **AUTO_QUERY** (масштабирование, но требует валидируемого конфига)
- **MIXED** (позже; важно не породить второй независимый selection engine)

Принцип: selection остаётся единым; landing не должен заводить “свой” независимый механизм.

### Preview “resolved events” (обязательный UX-инвариант)

Редактор в админке должен видеть:

- сколько событий реально резолвится,
- какие именно,
- есть ли city‑варианты у family/hub,
- как выглядит public URL и canonical.

Без этого лендинг превращается в “чёрный ящик” и быстро деградирует.

### Связи с Collections / Articles / Events (не меняя контрактов)

- **Landing ↔ Collection**: основной слой (primary + related).
- **Landing ↔ Article**: поддержка информационного интента, FAQ/гайд и перелинковка.
- **Landing ↔ Event**: лучше избегать ручного списка на MVP (через collection/queryConfig), чтобы не дублировать collections.

### Что это меняет в roadmap

Этот документ фиксирует целевой паттерн “hub/family/city” как **единый домен** поверх уже существующих city‑лендингов и публичных хабов.
Реализация должна идти “foundation → admin preview → public routing/meta”, сохраняя текущие контракты и принципы selection.
