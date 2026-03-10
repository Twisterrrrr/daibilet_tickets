# Стратегия тегов лендингов и canonical enrichment

> Документ описывает план теговой стратегии для лендингов и canonical tag enrichment.

## 1. Проблема

- **Ticketscloud (TC)** и **Teplohod (TEP)** приходят с разными наборами тегов.
- Лендинги фильтруют события по `filterTag` (например `nochnye-mosty`).
- TC-sync уже ставит `nochnye-mosty` при наличии ключевых слов, Teplohod — только `nochnye`, `night`.
- Без единого слоя enrichment события из разных источников попадают на лендинги непоследовательно.

## 2. Решение: Canonical Tag Enrichment

**Идея**: единый каталоговый слой нормализации тегов по `title` + `description`, независимо от источника (TC, Teplohod, ручной импорт).

### 2.1 Место применения

- `retagAll()` в `TcSyncService` — пересвязывает теги для **всех** активных событий (TC и Teplohod).
- Enrichment вызывается внутри `syncTags` и добавляет canonical-теги на основе keyword matching.
- Используется `citySlug` для city-specific тегов (чтобы не добавлять `rechnye-progulki-msk` событиям из СПб).

### 2.2 Структура маппинга

- **Глобальные теги** — keyword → slug, без проверки города.
- **City-specific теги** — keyword + citySlug → slug (добавляются только для событий из нужного города).

## 3. Лендинги и filterTag

| Лендинг (slug)   | filterTag             | Город            |
|------------------|-----------------------|------------------|
| nochnye-mosty    | nochnye-mosty         | saint-petersburg |
| salyut           | salyut-s-vody         | saint-petersburg |
| meteory          | meteor-petergof       | saint-petersburg |
| rechnye-progulki | rechnye-progulki-msk  | moscow           |
| sviyazhsk        | sviyazhsk             | kazan            |
| zolotye-vorota   | zolotye-vorota-vlad   | vladimir         |
| strelka-i-volga  | strelka-yaroslavl     | yaroslavl        |
| kurshskaya-kosa  | kurshskaya-kosa       | kaliningrad      |
| progulki-po-volge| progulki-volga-nn     | nizhny-novgorod  |

## 4. Salyut через Collection (кросс-город)

- **LandingPage** для salyut привязан к СПб (`cityId` обязателен).
- Для кросс-городской подборки используется **Collection** с `cityId = null`.
- Маршрут: `/collections/salyut` или `/promo/collections/salyut`.
- В UI — фильтр по городу и колонка «Город».
- Collection выбирает события по тегу `salyut-s-vody` без фильтра по городу.

## 5. Ключевые слова для enrichment

Примеры (полный список в `canonical-tag-enrichment.ts`):

- **nochnye-mosty**: развод мостов, разводные мосты, разводка мостов, ночные мосты, ночной мост, под разводными, прогулка на развод.
- **salyut-s-vody**: салют, фейерверк, день победы, 9 мая, салют с воды.
- **meteor-petergof**: метеор (только катер; «петергоф» без метеора = автобус).
- **rechnye-progulki-msk**: речные прогулки, москва-река, теплоход москва (city: moscow).
- **sviyazhsk**: свияжск, остров-град.
- **zolotye-vorota-vlad**: золотые ворота, успенский собор владимир, дмитриевский собор (city: vladimir).
- **strelka-yaroslavl**: стрелка ярославль, спасо-преображенский, которосль (city: yaroslavl).
- **kurshskaya-kosa**: куршск, коса, танцующий лес (city: kaliningrad).
- **progulki-volga-nn**: волга нижегородск, ока нижегородск, прогулка волга (city: nizhny-novgorod).

## 6. Auto Landing Engine (Materializer)

Страница лендинга показывается только если `events(city, filterTag) >= minEvents`.

- **TopicDefinition** — конфиг в `topic-definition.config.ts`: citySlug, slug, filterTag, minEvents.
- **LandingMaterializerService** — пересчитывает `isActive` для лендингов по правилам TopicDefinition.
- **Эндпоинты**: `POST /admin/landings/materialize`, `POST /admin/settings/ops/retag-and-materialize` (staging verification).
- **Автоматически**: materialize вызывается после full sync (sync → retag → materialize) в CatalogController и SyncProcessor.

### Staging verification

`POST /admin/settings/ops/retag-and-materialize` — retag + materialize, возвращает `{ retag, materialize }` с полями:
- `beforeVisible` / `visible` / `hidden` — сверка до/после;
- `changedSlugs` — какие лендинги изменили статус;
- `updated` / `unchanged` — для аудита.

Подробнее: `docs/TopicDefinitionMatrix.md`.

## 7. Тесты

`packages/backend/src/catalog/__tests__/canonical-tag-enrichment.spec.ts` — 29 table-driven тестов:

- позитивные и негативные кейсы по каждой теме;
- city-gating (nochnye-mosty вне СПб, rechnye-progulki-msk вне Москвы);
- multi-match (салют + развод мостов → оба тега);
- защита от ложных срабатываний (ночная прогулка без мостов, праздничный ужин без салюта).

## 8. Принципы

- Минимальный diff, не менять схему LandingPage.
- Сохранять текущее поведение TC_TAG_MAP и существующей логики.
- Enrichment только добавляет теги, не удаляет (удаление — отдельная логика, например `water` у автобусных).
- После внедрения — прогнать `retag` для всех событий.
