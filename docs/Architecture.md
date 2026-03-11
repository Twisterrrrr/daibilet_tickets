# Архитектура Daibilet

> Объединённый документ: каталог, лендинги, topic definitions, page templates, event card cache.

---

## 1. Общая архитектура

- **Event** — источник (Event + EventOverride) + publish-gate.
- **Каталог** — direct DB queries; будущее: event_card_cache / static index (см. §5).
- **Landing Engine** — TopicDefinition → isActive по порогу событий; Canonical Tag Enrichment.

---

## 2. Каталог событий

### 2.1 Текущая модель (MVP)

Прямые запросы к нормализованным таблицам: events, sessions, cities, offers, overrides.

### 2.2 Будущее: Event Card Cache / Static Index

См. §5 (Event Catalog Index).

---

## 3. Landing Engine

### 3.1 Проблема

**Ticketscloud (TC)** и **Teplohod (TEP)** приходят с разными наборами тегов.
Лендинги фильтруют по `filterTag` (например `nochnye-mosty`).

### 3.2 Canonical Tag Enrichment

- Единый слой нормализации тегов по `title` + `description`.
- `retagAll()` в TcSyncService — для всех активных событий.
- City-specific теги (keyword + citySlug → slug).

### 3.3 Materializer

- **Правило:** `visible = events(city, filterTag) >= minEvents`
- **LandingMaterializerService** — пересчитывает `isActive` по TopicDefinition.
- **Эндпоинты:** `POST /admin/landings/materialize`, `POST /admin/settings/ops/retag-and-materialize`.
- **Автоматически:** sync → retag → materialize (CatalogController, SyncProcessor).

### 3.4 Staging verification

`POST /admin/settings/ops/retag-and-materialize` возвращает:
- `beforeVisible` / `visible` / `hidden` — сверка до/после;
- `changedSlugs` — какие лендинги изменили статус.

---

## 4. TopicDefinition Matrix

### 4.1 Города

| slug | filterTag | minEvents | Город |
|------|-----------|-----------|-------|
| nochnye-mosty | nochnye-mosty | 2 | saint-petersburg |
| meteory | meteor-petergof | 3 | saint-petersburg |
| salyut | salyut-s-vody | 2 | saint-petersburg |
| rechnye-progulki | rechnye-progulki-msk | 3 | moscow |
| sviyazhsk | sviyazhsk | 2 | kazan |
| progulki-po-volge | progulki-volga-nn | 3 | nizhny-novgorod |
| nizhegorodskij-kreml | kreml-nn | 2 | nizhny-novgorod |
| kanatnaya-doroga | kanatka-nn | 2 | nizhny-novgorod |
| kurshskaya-kosa | kurshskaya-kosa | 2 | kaliningrad |
| strelka-i-volga | strelka-yaroslavl | 2 | yaroslavl |
| zolotye-vorota | zolotye-vorota-vlad | 2 | vladimir |

### 4.2 Cross-city (Collections)

| slug | filterTags | minEvents |
|------|------------|-----------|
| salyut | salyut-s-vody | 3 |

### 4.3 Salyut через Collection

- **LandingPage** salyut привязан к СПб.
- **Collection** с `cityId = null` — кросс-городская подборка.
- Маршрут: `/collections/salyut`.
- Collection выбирает события по тегу `salyut-s-vody`.

### 4.4 Ключевые слова (примеры)

- **nochnye-mosty**: развод мостов, ночные мосты.
- **salyut-s-vody**: салют, фейерверк, 9 мая.
- **meteor-petergof**: метеор (катер).
- **sviyazhsk**: свияжск, остров-град.
- Полный список: `packages/backend/src/catalog/canonical-tag-enrichment.ts`.

---

## 5. Page Templates & Event Catalog Index

### 5.1 Page template specs (черновик)

**Event (EventOverride.templateData):**

| Категория | Подкатегории | Поля |
|-----------|--------------|------|
| EXCURSION | RIVER, WALKING, BUS | route, shipName*, menu*, rules, advantages, bookingRules |
| MUSEUM | MUSEUM_CLASSIC, EXHIBITION | rules |
| EVENT | CONCERT, SHOW, THEATER | program, cast, hall, rules |

**Venue:** фиксированные поля (description, openingHours, highlights, faq). Специфика по VenueType — в черновике `archive/old-specs/PageTemplateSpecs.md`.

### 5.2 Event Catalog Index (future design)

**Когда вводить:**
- > 10k событий или > 100 RPS на каталог;
- рост latency catalog queries.

**Вариант A: Precomputed Event Card Cache**

- Таблица `event_card_cache` — denormalized card (city_slug, title, slug, price_from, rating, next_session, tags).
- Обновление: event-driven или batch worker.

**Вариант B: Static Index + Query Filter**

- JSON-индекс событий; фильтрация in-memory.
- Для SEO-страниц с большим количеством комбинаций city × category × tags.

Детали: `archive/old-specs/EventCatalogIndex.md`.

---

## 6. Тесты

`packages/backend/src/catalog/__tests__/canonical-tag-enrichment.spec.ts` — 29 тестов: позитив/негатив, city-gating, multi-match.
