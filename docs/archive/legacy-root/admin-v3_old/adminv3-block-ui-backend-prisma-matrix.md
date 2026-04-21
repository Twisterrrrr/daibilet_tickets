# Матрица готовности: блок → UI (Admin V3) → backend endpoints → Prisma модели/слабые связи

Дата: 2026-04-15

Статусы:
- **Готово**: UI не stub, основные сценарии list/detail/edit работают; backend покрывает; в Prisma связи нормализованы или есть безопасный dual-read/write.
- **Частично**: UI/endpoint есть, но критично не хватает wiring/dual-write/dual-read/редактора связей/валидации.
- **Нет**: UI stub/нет раздела или backend/модель отсутствуют для задачи.

## Матрица (high-signal)

| Блок | UI (Admin V3) | Backend endpoints | Prisma модели | Слабые связи / foundation риски | Статус |
|---|---|---|---|---|---|
| **Articles** | `modules/articles/pages/ArticlesListPage.tsx` (+ detail/edit частично) | `packages/backend/src/admin/admin-articles.controller.ts` (`/admin/articles`) | `Article`, `ArticleLandingLink`, `ArticleCollectionLink`, `ArticleTag`, `ArticleEvent` | legacy `Article.relatedLandingIds[]`, `relatedCollectionIds[]` (UI пока работает через arrays) | **Частично** |
| **Landings** | `modules/landings/pages/LandingsListPage.tsx`, `LandingDetailPage.tsx` | `admin-landings.controller.ts` (`/admin/landings`, `/resolved-events`) | `LandingPage`, `Tag` (FK `filterTagId`) | legacy `LandingPage.filterTag` (slug) vs `filterTagId` (FK); UI пока slug-first | **Частично** |
| **Collections** | `modules/collections/pages/CollectionsListPage.tsx` (+ detail/edit частично) | `admin-collections.controller.ts` (`/admin/collections`, `/items/*`, `/resolved-items`) | `Collection`, `CollectionItem`, `CollectionTagFilter`, `Tag` | legacy `Collection.filterTags[]` (slug[]) vs `CollectionTagFilter` (FK) | **Частично** |
| **Tags** | `modules/tags/pages/TagsListPage.tsx` (Stub) | `admin-tags.controller.ts` (`/admin/tags`) | `Tag` (+ used by `EventTag`, `ArticleTag`, `CollectionTagFilter`, `LandingPage.filterTagId`) | UI не даёт управлять tag активностью/удалённостью/SEO; влияет на C2 | **Нет** (UI) / backend **Готово** |
| **Events** | `pages/events/EventsListPage.tsx` (list), detail в разработке | `admin-events.controller.ts` (`/admin/events`) | `Event`, `EventOffer`, `EventSession`, `EventTag` | C3 семантика `operatorId` vs `supplierId` (двусмысленность) | **Частично** |
| **Venues** | `modules/venues/pages/VenuesListPage.tsx`, `VenueDetailPage.tsx`, candidates | `admin-venues.controller.ts` (`/admin/venues`) | `Venue` (+ lifecycle поля) | в основном норм; есть candidate/merge semantics | **Частично** |
| **Suppliers** | `modules/suppliers/pages/*` | `admin-suppliers.controller.ts` (`/admin/suppliers`) | `Operator` (supplier флаги/профили) | C3 supplier/operator duality | **Частично** |
| **Orders/Checkout** | `modules/orders/pages/CheckoutOrdersListPage.tsx` | `admin-orders.controller.ts` (`/admin/orders`/`/admin/checkout*`) | `CheckoutSession`, `OrderRequest`, `PaymentIntent` | snapshot-ориентировано; слабых строковых FK мало | **Частично** |
| **Refunds** | `modules/refunds/pages/RefundsListPage.tsx` | `admin-refunds.controller.ts` | `RefundRequest` | — | **Готово (MVP)** |
| **Customers (site users)** | есть страницы (MVP) | `admin-site-users`/users endpoints (см. audit) | `User`, `UserFavorite` | C4: `UserFavorite.eventSlug` vs `eventId` | **Частично** |
| **Dashboard** | `pages/dashboard/DashboardPage.tsx` | `admin-dashboard.controller.ts` | агрегаты | — | **Готово (MVP)** |
| **Settings** | stub / пусто | `admin-settings` (см. audit) | `AppSetting` | UI отсутствует | **Нет** |

## Выбор 1 вертикального среза “довести до идеала”

Рекомендованный кандидат: **“Статьи ↔ Теги ↔ Подборки/Лендинги (C1 + C2) + в связке с событиями через теги/резолв”**.

Почему это лучший вертикальный срез:
- **Проверяет Phase C**: C1 (ArticleLink tables) + C2 (Landing filterTagId, CollectionTagFilter) на реальном UI/read-path.
- **Задевает Phase B**: “related content” можно строить объяснимо на нормализованных связях (Article↔Landing/Collection + Tag graph).
- **Готовит Phase D (SEO)**: лендинги/подборки/статьи — прямые SEO-объекты, важно чтобы ссылки были целостными.
- **Готовит Phase A**: UI редактор связей (позиции/приоритеты) поверх нормализованных таблиц.

Что означает “идеал” для этого среза (Definition of Done):
- Admin V3 **читает normalized-first**:
  - Article detail показывает связи из `ArticleLandingLink`/`ArticleCollectionLink` (а legacy arrays — только fallback/legacy view).
  - Landing detail работает через `filterTagId` (при наличии) и корректно отображает Tag.
  - Collection detail/edit работает через `CollectionTagFilter` (при наличии), fallback на legacy `filterTags`.
- Admin V3 **пишет dual-write** (без cleanup legacy):
  - Article edit сохраняет link-таблицы (и при необходимости заполняет legacy arrays).
  - Landing edit сохраняет `filterTagId` + синхронизирует `filterTag` (slug) через validation/service.
  - Collection edit сохраняет `CollectionTagFilter` + синхронизирует `filterTags` (slug[]).
- Валидации write-path уже есть на backend (через `AdminContentWriteValidationService`) и должны оставаться источником истины.
- Backfill уже выполнен + второй dry-run подтверждает идемпотентность (см. `docs/reports/*backfill*`).

## Mini-foundation pass (Collections / Articles / Landings) — 2026-04-16

**Цель:** узкий, обратимый pass без миграций и крупных рефакторингов.

- **Collections (safety)**
  - Canonical editor: `tagFilters[]` (UI) остаётся primary.
  - Legacy `filterTags[]` теперь используется только как **read-only compatibility mirror**:
    - UI больше не шлёт `tagFilters: []` автоматически для legacy-only записей.
    - Если canonical пуст и пользователь не трогал редактор тегов, PATCH не передаёт `tagFilters`/`filterTags` — legacy состояние не затирается.
    - Если canonical был отредактирован (add/remove/reorder), PATCH шлёт `tagFilters` + mirror `filterTags` (по slug из выбранных тегов).
  - Backend контракт `admin-collections.controller.ts` не менялся по сути: при `tagFilters === undefined` фильтры не трогаются; при наличии `tagFilters` поведение остаётся canonical overwrite + legacy mirror.

- **Articles (UX cleanup)**
  - Основной редактор связей: `landingLinks[]` / `collectionLinks[]`.
  - Legacy `relatedLandingIds[]` / `relatedCollectionIds[]` в `ArticleEditPage` переведены в **read-only Advanced mirror**:
    - поля показываются только для дебага/совместимости;
    - payload save опирается исключительно на canonical links, legacy зеркалится на backend, как и раньше.

- **Landings (create-path canonical-first)**
  - В режиме `id === 'new'` лендинг создаётся через тот же `LandingFilterTagEditor` (picker) — primary источник: `filterTagId` + `filterTagRef`.
  - Legacy `filterTag` (slug) больше не редактируется напрямую в create-flow.
  - Для существующих лендингов с нерезолвленным legacy slug UI:
    - показывает явный warning;
    - предлагает выбрать canonical tag через picker (backend `validateLandingFilterTag` уже делает slug/id normalisation).

**Out of scope:** автоконверсия legacy slug → canonical FK, refactor landing engine, DnD, аудит SEO за пределами этого среза.

