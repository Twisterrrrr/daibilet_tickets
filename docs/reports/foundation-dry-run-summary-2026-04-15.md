# Foundation dry-run summary (fixtures) — 2026-04-15

Контекст: прогон backfill-скриптов Phase C (C1/C2/C4) на **осмысленном fixture seed-графе**, чтобы проверить:
- resolver logic (legacy → normalized)
- структуру отчётности (JSON reports)
- ожидаемые unresolved tails (не “искусственно зелёно”)

## Что прогнано

Всего скриптов: **4** (все в режиме **dry-run**, без записей).

- C1: `scripts/backfill-article-related-links.ts`
- C2: `scripts/backfill-landing-filter-tag-id.ts`
- C2: `scripts/backfill-collection-tag-filters.ts`
- C4: `scripts/backfill-user-favorites-event-id.ts`

## Итоги (по скриптам)

- **C1 Articles**
  - **unresolvedCount**: 2
  - **types**:
    - `target_deleted` (collection `isDeleted=true`)
    - `legacy_id_not_found` (landing UUID-заглушка `00000000-0000-0000-0000-000000000001`)

- **C2 Landings**
  - **unresolvedCount**: 1
  - **types**:
    - `slug_not_found` (legacy `filterTag=missing-legacy-tag`)

- **C2 Collections**
  - **unresolvedCount**: 1
  - **types**:
    - `slug_not_found` (legacy `filterTags` содержит `missing-legacy-tag`)

- **C4 Favorites**
  - **unresolvedCount**: 1
  - **types**:
    - `orphan_favorite` (legacy `eventSlug=missing-event-slug`)

JSON-репорты: см. `docs/reports/*backfill-*-dry-run.json` (таймстампованные файлы).

## Policy по unresolved (для --apply)

Инвариант: **`--apply` пишет только resolvable записи. Unresolved — осознанно сохраняются и репортятся.**

- `target_deleted` → **skip + report**
- `legacy_id_not_found` → **skip + report**
- `slug_not_found` → **skip + report**
- `orphan_favorite` → **skip + report**

## Готовность к apply

Состояние dry-run выглядит здоровым:
- unresolved хвосты **маленькие, понятные, ожидаемые**
- `errorCount = 0` по всем 4 скриптам

Следующий шаг: выполнить `--apply` (в том же порядке), затем **повторный dry-run** для проверки идемпотентности.

