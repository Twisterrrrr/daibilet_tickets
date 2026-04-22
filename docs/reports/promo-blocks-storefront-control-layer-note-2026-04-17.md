## Promo Blocks → Storefront control layer (2026-04-17)

### Контекст и проблема
В кодовой базе исторически существует **legacy слой** `PromoBlock` (публичный API `GET /promo-blocks` для главной) и **placement-based слой** `PromoPlacementBlock` (управление размещениями по зонам/контексту).

Ранее админский UI для Promo был ближе к CRUD-списку. Для Launch/Operations нужен **control layer**, который отвечает на вопросы:
- **what** показываем
- **where** показываем (surface/zone)
- **in what order** (priority/sortOrder)
- **under what rules** (scope/targeting)
- **with what window** (startsAt/endsAt)
- **why not shown** (diagnostics)

Важно: не притворяться, что модерация/агрегация покрывает venue/reviews/articles, если backend-агрегатор ещё не сделан.

---

### 1) Audit текущего состояния

#### Prisma
- **Legacy**: `PromoBlock` (`promo_blocks`) — карточки (title/description/href), collection-mode, окна (startsAt/endsAt), приоритеты, city/targetCitySlugs и др.
- **Control layer**: `PromoPlacementBlock` (`promo_placement_blocks`) — размещения по зонам (`placementZone`) и scope (`pageScopeType` + cityId/landingId/collectionId/articleId) + target (`targetType` + target*Id), окна, priority/sortOrder, статус `PromoBlockStatus` (`DRAFT|PUBLISHED|ARCHIVED`), publishedAt.

#### Backend endpoints
- **Admin legacy**: `GET/POST/PATCH/DELETE /admin/promo-blocks` (`AdminPromoBlocksController`).
- **Admin placement-based**: `GET/POST/PATCH /admin/promo-placement-blocks` (`AdminPromoPlacementBlocksController`).
- **Public legacy**: `GET /promo-blocks?city=...` и `GET /promo-blocks/:slug/items` (`PromoBlocksPublicController`).

#### Storefront/public usage (что реально сейчас)
- Публичный слой сейчас использует **legacy `PromoBlock`** (карточки для главной) + runtime validation (collection empty/not found, пустой href и т.д.).
- Placement-based слой — база для дальнейшего расширения control layer по surface/zone.

---

### 2) Target architecture (минимальная, честная)

#### Слои
1) **Admin control layer** (placement-based): управляет *где/когда/что* размещаем.
2) **Resolved read model** (storefront-facing): выдаёт только применимые к контексту, активные по окну и уже отсортированные блоки.
3) **Storefront render DTO**: безопасный набор полей для рендера (без admin-only).

#### Surfaces/zones (минимум)
В текущей схеме `PromoPlacementZone` уже покрывает базовые зоны:
- HOME_* / CITY_* / LANDING_* / ARTICLE_INLINE / COLLECTION_INLINE / CATALOG_INLINE

#### Governance/правда про scope
- Сейчас **EVENT** end-to-end поддержан как цель, остальные цели (COLLECTION/LANDING/ARTICLE) возможны по модели и валидируются на create/update, но **модерация/оркестрация** остаётся честно event-only, пока нет агрегатора.

---

### 3) Изменения контрактов / backend

#### Admin list read-model (placement blocks)
`AdminPromoPlacementBlocksService.list()` теперь возвращает в items дополнительно:
- `isCurrentlyActive`
- `preview` (resolvedUrl + displayTitle/subtitle/image)

Это делает list “операционным” без захода в detail.

#### Storefront-facing resolved API (новый)
Добавлен public endpoint:
- `GET /promo-placement-blocks/resolved`
  - вход: `placementZone`, `pageScopeType`, контекстные id (cityId/landingId/collectionId/articleId), `limit`
  - выход: resolved items (PUBLISHED + valid window + scope match), отсортированные.

---

### 4) Admin UI (операционный экран)

Добавлена страница Admin V3:
- `/admin-v3/promo-placement-blocks`

Свойства:
- **URL-state**: фильтры/пагинация/сортировка bookmarkable.
- **List**: показывает placement/scope/target/window/order/active-now, быстрые действия publish/archive.
- **Create/Edit drawer**: редактирование placement/scope/target/presentation/window/order/status.

---

### 5) Тесты
- Backend: unit тест на `PromoPlacementBlocksPublicService.resolve` (scope/window/orderBy + preview title/url).

---

### 6) Rollout: что реально сейчас vs future-ready

#### Реально сейчас
- Control layer и resolved query **работают для placement-based размещений** (честный фильтр по PUBLISHED + window + scope).
- Admin может управлять зонами/окнами/приоритетом и видеть preview/active-now.

#### Future-ready (не притворяемся, что готово)
- Полная оркестрация/модерация для venue/reviews/articles требует отдельного **backend aggregator** (typed adapters + unified moderation DTO).
- Rules engine для population (MANUAL/RULE/HYBRID) — следующий шаг, если витрине нужно динамическое наполнение beyond target-entity.

