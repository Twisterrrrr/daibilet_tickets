# Landing Composition System — целевая архитектура (2026‑04)

> **Назначение:** зафиксировать управляемую контентную модель лендингов и верхнеуровневых тематических страниц так, чтобы UX был масштабируемым (как в референсах уровня Lovable), а не набором разовых `page.tsx`.  
> **Связь с текущим кодом:** отбор событий уже единообразен через `buildLandingEventsWhere` ([`landing-event-filter.helper.ts`](../packages/backend/src/landing/landing-event-filter.helper.ts)); материалайзер — [`LandingMaterializerService`](../packages/backend/src/landing/landing-materializer.service.ts) + [`TOPIC_DEFINITIONS_CITY`](../packages/backend/src/landing/topic-definition.config.ts). Этот документ описывает **следующий слой** — композицию страницы, темы и SEO‑контур.

---

## 1. Продуктовая модель (роли страниц)

| Роль | Что это для пользователя | Пример URL |
|------|---------------------------|------------|
| **Подборка (Collection)** | Каталожный срез: события/площадки тем же способом, что и каталог | `/collections/:slug` |
| **Лендинг CITY** | Локальная воронка под город: глянец + выбор варианта (сеансы, сравнение) | `/cities/:citySlug/:landingSlug` |
| **Лендинг MULTI_CITY** | Верхнеуровневая тема: hero, сетка городов, мосты в CITY и в каталог; **не** «ещё одна подборка» | `/river-cruises`, `/bus-tours`, `/salute-9-may` |

**Важно:** отдельного типа сущности **HUB** в модели данных **не вводим**. URL в корне (`/river-cruises` и т.д.) — это **страницы типа `MULTI_CITY`** (или временно отдельные Next‑маршруты, пока не смонтированы на одну модель). Различия «навигационная витрина vs полноценная посадочная» задаются полями (`layoutVariant`, `surfaceVariant`, `canonicalMode`, `isIndexable`), а не третьим `LandingType`.

**Инвариант рендеринга (продукт):** `MULTI_CITY` **не обязан** повторять полноценный каталожный event feed как `CITY`. Верхний тематический слой — прежде всего **hero + city grid + related flows + опциональный featured preview**; глубокая воронка с вариантами/таблицей — на **CITY**. Иначе `MULTI_CITY` снова превращается во «второй каталог».

### Частные особенности отдельных лендингов (per-landing overrides)

Отдельные посадочные (например **«ужин на теплоходе в Москве»**) могут иметь **свой** набор UX: пиктограммы, дополнительные фильтры/чипы, акценты сценариев. Это **не** отдельный `LandingType` в Prisma и **не** новая сущность «тип страницы на каждый продукт», а комбинация:

| Механизм | Назначение |
|----------|------------|
| **`LandingContentBlock`** | `type` + **`variant`** + **`payload` (Json)** — иконки, списки преимуществ, сценарии («с ужином», «вечерний слот»), структура блока без новой таблицы на каждый кейс. |
| **`themeId` → `LandingTheme`** | Общие дефолты для семейства тем; частные отличия остаются на уровне страницы и блоков. |
| **`templateType` + `layoutVariant` + `surfaceVariant`** | Отличают каркас страницы (карточки / сравнение / гибрид / сезонность) и «кожу» без форка кодовой базы на каждый URL. |
| **Выборка** | По-прежнему **`filterTag` / `filterTagId` + `additionalFilters`**; «московский ужин» — своя пара город + фильтры, а не второй selection engine. |
| **Публичный фронт (узкие исключения)** | Допустимы **точечные** хелперы по `slug` или `themeId` (режим слотов, набор фильтров как в [`landingTimeSlotMode`](../packages/frontend/src/app/cities/_landingVm.ts)) — только там, где блоки + payload не выражают поведение декларативно; избегать разрастания «if по каждому лендингу» без привязки к теме/блоку. |

Итог: **универсальная модель композиции** + **вариативность данных** в блоках и полях шаблона закрывают «особенности» без плоджения типов сущностей.

Документ [`Landings-Architecture.md`](Landings-Architecture.md) в разделе «Global HUB» описывает **роутинг и SEO‑интент**; тип **`HUB` в Prisma при эволюции заменяется на `MULTI_CITY`** — см. §7.

---

## 2. Источник выборки событий (единая правда)

**Правило (рекомендованное):** публичный лендинг строится из **фильтров** — `filterTag` / `filterTagId` + `additionalFilters` (и существующий пайплайн `buildLandingEventsWhere`).

- **Collection** остаётся отдельным продуктовым слоем (каталог). Не делать **`collectionId` альтернативным источником истины** для лендинга без **единого filter engine**: иначе двойная правда (лендинг vs подборка), расхождение SEO и контента.

- **Долгосрочно:** один **unified filter builder** для лендинга и подборки (общая семантика OR тегов, подкатегорий, порогов). До этого — явное правило в операциях: «подборка с тем же смыслом» задаётся теми же тегами/фильтрами, что и лендинг, либо подборка не создаётся.

---

## 3. Таксономия темы и тегов

- **Одна тема продукта → один канонический slug тега** (например `salyut-9-maya`, `river-cruises`), чтобы не плодить `salut` / `salute` / `9may`.
- По необходимости расширить метаданные тега (в справочнике или политике): флаги в духе `isLandingEnabled`, `isCollectionEnabled`, `clusterSemantic` — без дублирования смысла в разных slug.
- **Topic definitions** для материалайзера развивать от одного `minEvents` к явному контракту, например:

```ts
type TopicDefinition = {
  minEvents: number;
  minUpcomingSessions?: number;
  seasonality?: { start?: string; end?: string }; // уже частично в seasonalPayload / seasonWindow
  // minQualityScore?: number; // когда появится score
};
```

---

## 4. Целевая схема данных (Prisma — черновик для миграции)

Идентификаторы новых сущностей — **в стиле проекта** (`@db.Uuid`, `@default(uuid())`), не смешивать с `cuid()` в одной БД без причины.

### 4.1. `LandingType` — только два значения

```prisma
enum LandingType {
  CITY
  MULTI_CITY
}
```

Эволюция: существующее значение `HUB` в коде/БД мигрируется в **`MULTI_CITY`** (или маппинг при чтении), затем удаляется из enum.

### 4.2. `LandingPage` — ядро страницы

Держать: identity, routing/SEO, источник выборки (ссылки на тег/фильтры), публикацию, ссылку на тему, hero верхнего уровня, варианты отображения.

Поля (объединение с текущей моделью; часть уже есть, часть — новая):

- Базовые: `id`, `type`, `status`, `cityId?`, `themeId?`, `slug`, `title`, `subtitle?`
- Hero: `heroTitle?`, `heroSubtitle?`, `heroBadge?`, `heroAssetId?`, `heroMobileAssetId?` (или связь с `MediaAsset`, как принято в проекте)
- Шаблон/поверхность: `templateType`, `layoutVariant?`, `surfaceVariant?`
- Выборка: `filterTagId?`, `additionalFilters Json?`, `eventSourceType`, `selectionMode`, **`collectionId` не использовать как основной источник** до unified engine (поле может остаться legacy/null)
- SEO: `seoH1?`, `seoTitle?`, `seoDescription?`, `ogImageAssetId?`, `canonicalMode`, `canonicalLandingId?`, `isIndexable`, `isActive`, `publishedAt?`
- Порядок/версия: `sortOrder`, timestamps

`@@unique([cityId, slug])` сохраняется; для `MULTI_CITY` обычно `cityId = null`, уникальность по `slug` при `cityId` null — уточнить в миграции (`@@unique` частичный или отдельный индекс).

### 4.3. `LandingTheme`

Общие дефолты для семейства страниц (чтобы не копировать hero/SEO по городам):

- `id`, `slug` @unique, `name`, `title?`, `subtitle?`
- `defaultHeroTitle?`, `defaultHeroBody?`, `defaultSeoTitle?`, `defaultSeoDesc?`
- `coverAssetId?`, `isActive`
- `landings` → `LandingPage[]`

### 4.4. `LandingContentBlock` — управляемая композиция UX

```prisma
model LandingContentBlock {
  id              String   @id @default(uuid()) @db.Uuid
  landingPageId   String   @db.Uuid
  type            LandingBlockType
  variant         String?
  title           String?
  subtitle        String?
  eyebrow         String?
  body            String?  @db.Text
  richTextJson    Json?
  payload         Json?
  assetId         String?  @db.Uuid
  mobileAssetId   String?  @db.Uuid
  isEnabled       Boolean  @default(true)
  sortOrder       Int      @default(0)
  visibilityRules Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  landingPage LandingPage @relation(fields: [landingPageId], references: [id], onDelete: Cascade)

  @@index([landingPageId, sortOrder])
}
```

### 4.5. `LandingBlockType` — конечный словарь (расширяемый осознанно)

Не «один universal JSON». Стартовый набор (объединение рабочих предложений):

`HERO`, `TRUST_BADGES`, `VALUE_PROPS`, `QUICK_FILTERS`, `FEATURED_VARIANTS`, `SCHEDULE_PREVIEW`, `CITY_GRID`, `CATEGORY_CHIPS`, `INFO_ICONS`, `STORY`, `HIGHLIGHTS`, `ITINERARY`, `PRICING`, `FAQ`, `REVIEWS`, `GALLERY`, `COMPARISON`, `RELATED_LANDINGS`, `RELATED_COLLECTIONS`, `RELATED_ARTICLES`, `CTA_BANNER`, `SEO_TEXT`, `RAW_RICH_TEXT`.

Каждый тип маппится на **один React‑компонент блока** на публичном фронте (`LandingRenderer` / `BlockRegistry`).

### 4.6. Связи «куда вести дальше»

Либо отдельные таблицы `LandingNavigationLink` / `LandingRelatedEntity`, либо (MVP) структурированные блоки `RELATED_*` + payload. Решение фиксируется при миграции, чтобы не плодить три разных способа хранить одни и те же ссылки.

---

## 5. DTO: редакторский vs публичный

- **Admin list/detail** — богатые поля, диагностика, счётчики, issues.
- **Public payload** — один компактный контракт: `page` (мета + hero + seo) + `blocks[]` + `eventFeed?` (карточки/варианты/фильтры для CITY) + `related?`.

Публичный клиент **не** должен получать «кашу» всех админских полей.

---

## 6. SEO audit (read-model, не обязательно отдельная таблица на старте)

**Домены (чтобы аудит лендингов не растворился в общем SEO по сущностям):**

| Домен | Смысл |
|--------|--------|
| **metadata completeness** | title/description/H1/OG, длины |
| **canonical / indexability** | `canonicalMode`, self vs alternate, конфликт с `canonicalLandingId` |
| **source completeness** | filters-first: `matchedEventsCount`, пустая выдача |
| **content completeness** | hero, видимые блоки, FAQ, SEO-текст, thin content при `isIndexable` |
| **intent collision** | CITY vs MULTI_CITY на один intent (slug/theme) |
| **related links integrity** | связи на коллекции/статьи/дочерние лендинги (постепенно) |

Реализация на старте: `GET /admin/landings/:id/seo-audit` + [`landing-seo-audit.service.ts`](../packages/backend/src/landing/landing-seo-audit.service.ts).

Коды issues считать **на лету** при `GET /admin/landings/:id` и/или `GET /admin/landings/:id/seo-audit`:

Примеры: `NO_H1`, `NO_SEO_TITLE`, `NO_SEO_DESCRIPTION`, `TITLE_TOO_LONG`, `DESCRIPTION_TOO_LONG`, `NO_HERO`, `NO_VISIBLE_BLOCKS`, `NO_FAQ`, `NO_SEO_TEXT`, `LOW_EVENT_COUNT`, `NO_MATCHED_EVENTS`, `CANONICAL_MISSING`, `CANONICAL_CONFLICT`, `DUPLICATE_SLUG_RISK`, `CITY_MULTI_CITY_INTENT_COLLISION`, `INDEXABLE_WITH_THIN_CONTENT`, `BROKEN_RELATED_LINK`, `MISSING_OG_IMAGE`, `NOINDEX_WITH_ACTIVE_INTERNAL_LINKING`.

Интеграция с общим SEO‑контуром: [`SeoAudit-Taxonomy-MasterPlan.md`](SeoAudit-Taxonomy-MasterPlan.md).

Ключевые проверки:

1. **Thin content** — индексируемая страница без достаточного набора блоков/текста.
2. **Intent collision** — CITY и MULTI_CITY на одну тему с дублирующими title/H1/описанием.
3. **Canonical** — кто главный для широкого vs локального запроса; `canonicalMode` + `canonicalLandingId`.
4. **Пустая выборка** — `matchedEventsCount = 0` при `isIndexable = true` (ошибка).

---

## 7. Совместимость с [`Landings-Architecture.md`](Landings-Architecture.md)

| Старый термин в документе | Целевая модель |
|---------------------------|----------------|
| Global HUB (topic) | **`LandingPage` с `type = MULTI_CITY`** для URL в корне |
| HUB vs CITY как разные сущности | Оба — **`LandingPage`; различие только `LandingType` и полей** |
| `topicKey` / parent-child | Уточнить: либо `themeId` + `canonicalLandingId`, либо явная связь parent/child между двумя `LandingPage` — выбрать один паттерн при миграции |

Публичные маршруты Next.js могут оставаться прежними (`/river-cruises/...`), но **источник контента** постепенно переносится с захардкоженных страниц на данные из БД через общий рендерер блоков.

---

## 8. Admin V3 — вкладки (обзор)

Композиция через вкладки, не одна форма на все поля — см. **детальный план Phase C (§11)**.

Кратко по вкладкам: (1) Основное, (2) Hero, (3) Источник событий, (4) Блоки, (5) Связи, (6) SEO, (7) Диагностика.

---

## 9. API (черновик контуров)

**Admin:** список/детал/patch лендинга; CRUD блоков; reorder; `source-preview`; `seo-audit`; publish/unpublish.

**Public:** один агрегированный ответ на страницу (варианты путей согласовать с существующим `GET /catalog/landings/:citySlug/:slug` и отдельным контрактом для MULTI_CITY — либо один resolver с типом, либо два пути; главное — **один** стабильный public DTO для рендерера).

---

## 10. Rollout (этапы)

| Этап | Содержание |
|------|------------|
| **A** | Миграции Prisma: `LandingTheme`, `LandingContentBlock`, enum’ы, поля на `LandingPage`, миграция `HUB` → `MULTI_CITY` |
| **B** | Backend: admin list/detail, assembler публичного payload, source-preview, SEO audit read-model |
| **C** | Admin V3: список, карточка, редактор блоков, превью источника — **§11** |
| **D** | Public: `LandingRenderer` + реестр блоков; постепенная замена захардкоженных MULTI_CITY страниц |
| **E** | Миграция контента существующих маршрутов (`river-cruises`, `bus-tours`, …) в блоки + регрессионные тесты |

---

## 11. Phase C — Admin V3 (детальный план)

**Цель:** редактор лендинга как **управляемая композиция** (вкладки, блоки, превью выборки и SEO), без дублирования логики выборки событий и без отдельного типа HUB.

**База в репозитории:** модули [`packages/frontend-admin-v3/src/modules/landings/`](../../packages/frontend-admin-v3/src/modules/landings/), API `GET/PATCH /admin/landings`, `GET /admin/landings/:id/resolved-events`, `GET /admin/landings/:id/seo-audit`; в ответе деталки уже есть `theme`, `contentBlocks` (после миграций).

### C.0 Предпосылки (backend)

- Убедиться, что применены миграции Phase A и доступны `LandingTheme` / `LandingContentBlock`.
- **CRUD блоков:** если в API ещё нет мутаций, добавить минимальный контур (идемпотентно и без смены публичного контракта каталога):
  - `POST /admin/landings/:id/blocks`
  - `PATCH /admin/landings/:id/blocks/:blockId`
  - `DELETE /admin/landings/:id/blocks/:blockId`
  - `POST /admin/landings/:id/blocks/reorder` (тело: массив `blockId` в порядке)
- Опционально: `GET /admin/landings/:id/source-preview` — алиас или обогащение поверх `resolved-events` + счётчики (не дублировать `collectionId` как источник выборки).

### C.1 Список лендингов (`LandingsListPage`)

- Фильтры в URL-state: `type` (CITY / MULTI_CITY), `status`, `city`, `themeId` (когда появится справочник тем в API), `isActive`, `isIndexable`, флаг «есть SEO issues» (если бэк отдаёт агрегат или запрос к `seo-audit` батчем — по возможности позже).
- Колонки: название, slug, тип, город / «—» для MULTI_CITY, тема, `matched` preview (из кэша или лениво), число блоков, индикатор проблем SEO (иконка/бейдж).
- Действия: открыть карточку, при наличии — «preview public» (ссылка на публичный URL или iframe только при отдельной задаче).

### C.2 Карточка лендинга — каркас (`LandingDetailPage`)

- **Tabs** (единый компонент табов проекта): не смешивать все поля в один скролл.
- Сохранение: по вкладкам или общая кнопка «Сохранить» с валидацией секции; не терять `PATCH` частичный для несвязанных полей.

### C.3 Вкладка «Основное»

- Поля: `landingType`, `cityId` (условно обязателен для CITY), `themeId` (селект из `GET /admin/landing-themes`, когда появится; до этого — текстовый `themeId` UUID или отложить), `slug`, `title`, `subtitle`, `status`, `sortOrder`, `isActive`, `publishedAt`, `parentLandingId` (только CITY; родитель — MULTI_CITY), флаги индексации на уровне политики (согласовать с существующими полями формы).

### C.4 Вкладка «Hero»

- `heroTitle`, `heroSubtitle`, `heroBadge`, `heroImageUrl`, `heroMobileImageUrl` (или поля проекта для медиа), `layoutVariant`, `surfaceVariant`, legacy `heroText` до полного переноса в блоки.
- Превью миниатюры (опционально).

### C.5 Вкладка «Источник событий»

- Только **filters-first:** `filterTag` / `filterTagId`, `additionalFilters` (JSON с валидацией как в текущем админе), `selectionMode`, `collectionId` — **подпись в UI:** «связь / подборка, не источник выборки».
- Встроенный **preview:** вызов `GET .../resolved-events` или `source-preview`: число событий, 3–5 примеров `title`/`slug`, предупреждения (пустой тег, 0 событий).

### C.6 Вкладка «Блоки» (ядро Phase C)

- Список строк: порядок (`sortOrder`), тип блока (`LandingBlockType`), заголовок, enabled, действия: редактировать, дублировать, удалить.
- **Reorder:** drag-and-drop или кнопки вверх/вниз → `POST .../blocks/reorder`.
- **Добавить блок:** модалка или сайдпанель — выбор типа из enum, затем форма по типу:
  - общие поля: `variant`, `title`, `subtitle`, `eyebrow`, `body`, `assetUrl`, `mobileAssetUrl`;
  - **`payload`:** для сложных структур (пиктограммы, список карточек) — **схема по `type`/`variant`**: короткие поля в форме, редкое — JSON textarea с подсказкой схемы (как в проекте для других JSON полей).
- **Per-landing особенности** (см. §1 таблица): конфигурировать через **`payload`** и **`variant`**, а не отдельные роуты в админке.

### C.7 Вкладка «Связи»

- `relatedArticleIds`, `relatedCollectionIds`, `relatedLinks` (legacy JSON), `canonicalLandingId`, при необходимости выбор дочерних CITY для MULTI_CITY (read-only список из `childLandings`).

### C.8 Вкладка «SEO»

- `seoH1`, `seoTitle`, `seoDescription`, `ogImageUrl`, `canonicalMode`, `canonicalLandingId`, `canonicalUrl`, `isIndexable`, `metaTitle`/`metaDescription` (fallback или миграция подписей).

### C.9 Вкладка «Диагностика»

- Встраивание ответа **`GET /admin/landings/:id/seo-audit`** (issues, warnings, score, `matchedEventsCount`).
- Дублирование краткой сводки из `hubReadiness`, если остаётся в ответе деталки — без противоречий по текстам.

### C.10 Порядок внедрения (рекомендуемый)

1. Расширить список (C.1) минимально — колонка «блоков» и тип.
2. Разбить деталку на вкладки (C.2) с существующими полями без блоков.
3. Подключить **Источник событий** + preview (C.5).
4. Реализовать **API CRUD блоков** (C.0) и вкладку **Блоки** (C.6).
5. SEO + Диагностика (C.8–C.9).
6. Hero как отдельная вкладка (C.4) при переносе контента с legacy полей.

### C.11 Критерии готовности Phase C

- Редактор может собрать страницу из блоков без правки `page.tsx` на витрине.
- Ни один UI не предлагает `collectionId` как «источник каталога» для лендинга.
- Для одного лендинга можно задать **особый** набор блоков и `payload` (в т.ч. пиктограммы / сценарии), совместимый с публичным `LandingRenderer` (Phase D).

---

## 12. Связанные документы

- [`Landings-Architecture.md`](Landings-Architecture.md) — текущий роутинг, материалайзер, сезонность.
- [`Collections-Architecture.md`](Collections-Architecture.md) — подборки vs лендинги.
- [`Tags-Architecture.md`](Tags-Architecture.md) — теги и назначение на события.
- [`SeoAudit-Taxonomy-MasterPlan.md`](SeoAudit-Taxonomy-MasterPlan.md) — общий SEO‑аудит.
