## Admin V3: Landing.filterTag и Collection.filterTags — normalized editors (2026-04-15)

### Что было (аудит)
- **Landing detail** (`packages/frontend-admin-v3/src/modules/landings/pages/LandingDetailPage.tsx`): `filterTag` редактировался как сырой slug (legacy модель).
- **Collection detail** (`packages/frontend-admin-v3/src/modules/collections/pages/CollectionDetailPage.tsx`): не было нормального editor’а для tag filters (normalized), `filterTags/tagFilters` в UI не управлялись как сущности.
- **Backend**:
  - `GET /admin/tags` уже поддерживает `search` и `limit`, отдаёт `id/name/slug/isActive/isDeleted` (достаточно для lookup).
  - Для `Collections` в контроллере был dual-read bridge, но detail-ответ был с `any`-мутированием и write-path не принимал `tagFilters` как canonical payload.

### Что изменено на backend (contract cleanup без ломки legacy)
- **Canonical write для Collection**:
  - `CreateCollectionDto` / `UpdateCollectionDto`: добавлено поле `tagFilters?: Array<{ tagId; position? }>` как canonical admin payload.
  - `AdminContentWriteValidationService`: добавлена валидация `validateCollectionTagFilterIds()` (existence + active + not deleted + no duplicates) с доменными кодами.
  - `POST/PATCH /admin/collections`:
    - если пришёл `tagFilters` → **это primary source**: перезаписываем `CollectionTagFilter`, зеркалим `filterTags` (legacy slug[]) из выбранных tag’ов;
    - если `tagFilters` не пришёл, но пришёл legacy `filterTags` → сохраняем как раньше (compatibility).
  - `GET /admin/collections/:id`: dual-read bridge теперь без `any` и возвращает `filterTags` из `tagFilters` (если есть).

### Что изменено во фронте (Admin V3)
- **Landing detail**:
  - добавлен selector-based editor (single tag) для `filterTagId` с поиском через `/admin/tags?search=...&limit=20`;
  - `filterTagId` сохраняется как canonical, `filterTag` (slug) остаётся как compatibility mirror.
- **Collection detail**:
  - добавлен multi-tag editor (add/remove/reorder up/down) для normalized `tagFilters`;
  - сохранение отправляет `tagFilters: [{ tagId, position }]` как canonical + зеркалит `filterTags: slug[]` для compatibility.

### Изменённые файлы
- `packages/backend/src/admin/admin-content-write-validation.service.ts`
- `packages/backend/src/admin/admin-collections.controller.ts`
- `packages/backend/src/admin/dto/admin-collection.dto.ts`
- `packages/frontend-admin-v3/src/modules/landings/api/landings.ts`
- `packages/frontend-admin-v3/src/modules/landings/pages/LandingDetailPage.tsx`
- `packages/frontend-admin-v3/src/modules/collections/api/collections.ts`
- `packages/frontend-admin-v3/src/modules/collections/pages/CollectionDetailPage.tsx`

### Manual smoke checklist
- **Landing**
  - открыть landing с `filterTagId` → увидеть выбранный tag
  - заменить tag через поиск → сохранить → перезагрузить → убедиться, что `filterTagId` сохранился
  - очистить tag → сохранить → перезагрузить → tag пуст
- **Collection**
  - открыть collection с `tagFilters` → увидеть список
  - добавить tag → удалить tag → поменять порядок (↑/↓) → сохранить → перезагрузить → порядок/состав совпадает
- **Transitional**
  - открыть legacy-only landing/collection (если встретится) → UI не падает; после выбора/сохранения сущность уходит в normalized mode

