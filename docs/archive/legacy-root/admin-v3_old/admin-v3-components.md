# Moved

Этот документ объединён в [`Implementation-Guide.md`](Implementation-Guide.md).
  - `components/shared/states/LoadingState.tsx`
  - `components/shared/states/EmptyState.tsx`
  - `components/shared/states/ErrorState.tsx`
- Detail:
  - `components/shared/detail/DetailTabs.tsx` — табы (overflow-x, спокойный стиль).
  - `components/shared/detail/SummaryStrip.tsx` — компактная сводка метрик.
  - `components/shared/detail/KeyValueList.tsx` — `dl` для метаданных.
  - `components/shared/detail/StickySaveBar.tsx` — sticky панель сохранения (для edit-экранов).
- Статусы:
  - `components/shared/status-pill/StatusPill.tsx` — единый pill для статусов.

## 2) Договорённости сборки страниц

### List page (единый каркас)
1. `PageHeader`
2. `SummaryStrip` (опционально)
3. `QuickFilters`
4. `FilterBar`
5. `DataTableShell`
6. pagination/footer

### Detail page (единый каркас)
- `PageHeader` (title/status/actions)
- `SummaryStrip`
- `DetailTabs` (lazy для тяжёлых вкладок)
- `StickySaveBar` на edit-экранах

## 3) Статусы (единая семантика)

Единая модель статусов живёт в:
- `packages/frontend-admin-v3/src/config/statuses.ts`
- `packages/frontend-admin-v3/src/lib/mappings/status-mapping.ts`

Принцип: **маппинг статус → label/tone** централизован, а страницы используют только `StatusPill`.

## 4) Важные ограничения

- Не делать “универсальные комбайны” экранов. Списки и детали должны быть лёгкими и специализированными.
- Для больших датасетов: только server-side pagination/filter/sort, без client-side фильтрации.
- Скрытые модули (feature flags) не должны рендериться и не должны инициировать запросы.

