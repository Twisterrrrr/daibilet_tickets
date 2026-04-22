# Article relation editor (Admin V3) — implementation note (2026-04-15)

## Что было (audit)

- **UI**: `packages/frontend-admin-v3/src/modules/articles/pages/ArticleEditPage.tsx`
  - редактирование `relatedLandingIds` / `relatedCollectionIds` было через textarea с UUID через запятую (legacy primary editing mechanism)
  - payload на сохранение отправлял только legacy arrays
- **API types**: `packages/frontend-admin-v3/src/modules/articles/api/articles.ts`
  - `AdminArticleDetail` не содержал `landingLinks` / `collectionLinks`
- **Backend**: `packages/backend/src/admin/admin-articles.controller.ts`
  - GET detail уже включал `landingLinks` / `collectionLinks` и new-first заполнял legacy arrays из link-таблиц
  - POST/PATCH уже умели принимать `landingLinks`/`collectionLinks`, но legacy поля не гарантированно зеркалились при new-only payload

## Что изменено на backend (contract cleanup без ломки DTO)

- **GET `/admin/articles/:id`**
  - расширены `include` для `landingLinks.landing` и `collectionLinks.collection`: добавлены `isActive`, `status`, `isDeleted`, `city{ id,slug,name }`
  - сортировка links остаётся `position ASC`, затем `createdAt ASC`
  - legacy arrays продолжают возвращаться (и при наличии links — зеркалятся из links как source-of-truth)

- **POST/PATCH `/admin/articles` / `/admin/articles/:id`**
  - если пришли `landingLinks`/`collectionLinks` (canonical) — они становятся источником истины
  - legacy arrays **зеркалятся** из canonical links для backward compatibility
  - old payload через legacy arrays остаётся поддержан
  - при одновременной передаче new+legacy — **new имеет приоритет**

DTO не ломались: `CreateArticleDto` уже содержал `landingLinks`/`collectionLinks` как optional.

## Что изменено на frontend-admin-v3 (relation editor)

- `packages/frontend-admin-v3/src/modules/articles/api/articles.ts`
  - расширен тип `AdminArticleDetail`: добавлены `landingLinks?` и `collectionLinks?` (минимально нужный shape для UI)

- `packages/frontend-admin-v3/src/modules/articles/pages/ArticleEditPage.tsx`
  - textarea UUID-редакторы убраны из primary flow
  - добавлены две секции:
    - **Related Landings**
    - **Related Collections**
  - поддержаны операции:
    - поиск (через существующие endpoints `GET /admin/landings?search=...`, `GET /admin/collections?search=...`)
    - add (без дублей)
    - remove
    - reorder (up/down)
  - save отправляет canonical payload:
    - `landingLinks: [{ landingId, position }]`
    - `collectionLinks: [{ collectionId, position }]`
    - + legacy mirror `relatedLandingIds` / `relatedCollectionIds` (из canonical порядка)
  - legacy arrays спрятаны под **Advanced (legacy)** как совместимый mirror (не primary editing model)

## Мини-чеклист ручной проверки

1) Открыть статью, у которой есть `landingLinks`/`collectionLinks` (из backfill/apply)
2) Добавить landing/collection через поиск (минимум 2 символа)
3) Поменять порядок ↑/↓
4) Удалить один элемент
5) Нажать “Сохранить”
6) Перезагрузить страницу и убедиться:
   - порядок сохранился
   - список восстановился из `landingLinks`/`collectionLinks` (normalized-first)
7) Открыть “legacy-only” статью: UI должен показать связи (fallback из legacy ids) и после сохранения перейти на canonical links

