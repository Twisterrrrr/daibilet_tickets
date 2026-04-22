# Политика классификации каталога (Catalog Classification Policy)

> Источник истины для публикации событий и для разработки в зоне каталога.  
> Обновлено: 2026-03-24 (Epic 1 — subcategories-first, tags secondary; Step B/C — eligibility + диагностика).

## 1. Каноническая модель

| Слой | Роль | Обязательность для publish |
|------|------|----------------------------|
| **category** (`EventCategory`) | Верхний уровень таксономии | Да |
| **subcategories** | Основной смысловой слой (M:N `Subcategory` + `EventSubcategoryLink`, с legacy-fallback на enum `Event.subcategories`) | Да: минимум **1**, максимум **3** |
| **audience** | Структурный атрибут аудитории | Условно (см. `EventQualityService`, напр. KIDS + minAge) |
| **tags** (STRUCTURAL / POPULAR) | Enrichment, маркетинг, legacy, derived | **Нет** — отсутствие тегов не блокирует публикацию |

## 2. Подсчёт эффективных подкатегорий (new-first / legacy-fallback)

1. Если у события есть активные связи `EventSubcategoryLink` → `Subcategory.isActive === true`, считаем **только их** (количество уникальных `subcategoryId`).
2. Иначе, если связей нет, используем legacy-поле `Event.subcategories` (массив enum `EventSubcategory`): эффективное число = длина массива (если не пустой).

Согласовано с логикой фильтрации в `SubcategoryPolicyService.buildEventSubcategoryFilter`.

## 3. Лимиты

- **Событие:** не более **3** подкатегорий (запись через API и проверка publish-gate).
- **Площадка (Venue):** лимит по-прежнему задаётся отдельно (`MAX_VENUE_SUBCATEGORIES`, сейчас 5) — не смешивать с лимитом события.

## 4. Publish-gate и качество

- Реализация: `EventQualityService.validateForPublish`, агрегированные чеки — `PublishGateService`.
- **Не использовать** как блокеры: отсутствие STRUCTURAL тегов групп THEME/FORMAT (коды `MISSING_STRUCTURAL_THEME_TAG` / `MISSING_STRUCTURAL_FORMAT_TAG` сняты).
- **Блокеры классификации:** `MISSING_CATEGORY`, `MISSING_SUBCATEGORY`, `TOO_MANY_SUBCATEGORIES` (исторические данные с >3 связями до сжатия).
- Остальные блокеры (локация, офферы, сеансы, медиа и т.д.) — без изменений семантики.

## 5. Теги

- STRUCTURAL / POPULAR остаются в БД и UI для обогащения и совместимости.
- Редактор **не обязан** вручную заполнять structural-теги ради публикации.
- Derived/enrichment из category + subcategories + audience + текста — допустимы в отдельных слоях (не смешивать с SEO meta generation в рамках этой политики).

## 6. Legacy и миграция

- Read/query слои могут временно использовать tag-fallback там, где ещё не переведены на subcategories (режим **new-first, legacy-fallback**).
- Для **publish** источник истины — category + эффективные subcategories, не теги.
- События с **>3** активными `EventSubcategoryLink`: публикация **блокируется** (`TOO_MANY_SUBCATEGORIES`) до ручного или скриптового сжатия списка.

## 7. Связанный код

- `packages/backend/src/catalog/event-quality.service.ts`
- `packages/backend/src/catalog/publish-gate.service.ts`
- `packages/backend/src/catalog/catalog-classification-normalizer.service.ts`
- `packages/backend/src/subcategories/subcategory-policy.service.ts`
- `packages/backend/src/catalog/collection-selection.service.ts` — подборки
- `packages/backend/src/landing/landing-event-filter.helper.ts` — лендинги + тот же отбор, что materializer
- `packages/backend/src/catalog/catalog-consistency.service.ts` — `GET /admin/catalog/consistency`

## 8. Тесты (Step B, интеграционные сценарии без БД)

Файл: `packages/backend/src/catalog/__tests__/catalog-eligibility.integration.spec.ts`

- Коллекция с `filterCategory` + `filterSubcategory` и пустыми `filterTags`: в `buildWhere` / `resolveSelection` нет обязательного условия по `tags`.
- Лендинг: `buildLandingEventsWhere` при `tag === null` и `additionalFilters.subcategories` даёт выдачу без `tagId` (materializer использует тот же helper).
- `ListingHealthService`: нет кодов блокеров по тегам; отдельно проверяется мягкий `SUBCATEGORY_LEGACY_ONLY` для legacy enum без связей.
- `CatalogConsistencyService.getSnapshot`: счётчики пустой выдачи активных подборок/лендингов и `excessSubcategoryLinksOver3` из `$queryRaw`.

Юнит-спека отбора подборок: `packages/backend/src/catalog/__tests__/collection-selection.service.spec.ts`.

## 9. Step C — админ-витрина согласованности

- API: `GET /admin/catalog/consistency` (роли ADMIN, EDITOR).
- UI: **Система → Каталог: согласованность** (`/catalog-consistency`) в `frontend-admin`, страница `CatalogConsistencyPage.tsx`.

## 10. Публичный список событий (`GET /events`, `buildEventWhere`)

- Подкатегория **не** раскладывается в верхний уровень `where` (не ломает `OR` по источникам в production).
- При одновременном `subcategory` и фильтре по тегам (`tag`, `structuralTags`, `popularTags`) условия по смыслу объединяются **OR** (как подборки/лендинги): событие проходит, если подходит по подкатегории **или** по всем заданным тегам (между тегами по-прежнему **AND**).
- Фильтр по датам/сеансам (`sessionFilter` из `CatalogService.fetchEvents`) добавляется в **`AND`**, а не теряется.

## 11. Реестр tag-fallback (read-path, не source of truth)

Места, где тег **не единственный** критерий отбора либо явно дополняется подкатегорией:

| Место | Поведение |
|--------|-----------|
| `buildEventWhere` (`where-builders.ts`) | При заданных `subcategory` и тегах/списках тегов — **OR**: подкатегория или (AND по тегам). |
| `CollectionSelectionService.buildWhere` | OR между блоком тегов и `filterSubcategory` / `additionalFilters.subcategories` (см. §8). |
| `CollectionService.getCollections` / `getBySlug` | Публичные подборки используют тот же `buildWhere` — нет tag-only при наличии subcategory в правилах. |
| `buildLandingEventsWhere` (`landing-event-filter.helper.ts`) | Ветки: тег **или** каждая из `additionalFilters.subcategories` (OR). |
| `CatalogService.getTagBySlug` | **OR**: событие с тегом **или** с эффективной подкатегорией с тем же **slug**, что и тег (`buildEventSubcategoryFilter`). |
| `PromoCollectionResolverService` (rule с `tagSlugs`) | **OR**: теги **или** подкатегории по тем же slug; публичные промо-блоки резолвят коллекции через этот сервис. |
| `PromoBlocksPublicService` | Не строит tag-only where сам; пустота блока = пустой resolver коллекции. |
| `WidgetsApiService` | Выдача по `eventId`/сеансам **без** фильтра каталога по тегам. |

Промо-блоки с ручным выбором (`MANUAL`) не используют tag-only rule — не перечислены.
