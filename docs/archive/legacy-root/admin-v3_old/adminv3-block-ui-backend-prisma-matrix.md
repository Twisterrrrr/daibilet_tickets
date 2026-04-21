# Moved

Этот документ объединён в [`Implementation-Guide.md`](Implementation-Guide.md).

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

