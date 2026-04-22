# Moved

Этот документ объединён в [`Implementation-Guide.md`](Implementation-Guide.md).
  2) `SummaryStrip` (опционально)
  3) `QuickFilters`
  4) `FilterBar`
  5) `DataTableShell`
  6) pagination/footer
- Никаких “авторских” разметок на уровне страниц.

**Эталон в V2**
- `packages/frontend-admin-v2/src/shared/layout/list-page-layout.tsx`
- `packages/frontend-admin-v2/src/widgets/data-table-shell/data-table-shell.tsx`
- `packages/frontend-admin-v2/src/shared/layout/mock-list-screen.tsx`

## 5) Таблицы: плотность без шума

**Договорённость V3**
- Таблица — рабочий инструмент: минимум визуального декора, максимум полезных колонок.
- Hover у строк мягкий, сортировка очевидная (active state + иконка).
- Горизонтальный скролл — на обёртке, а не на `window`.

**Эталон в V2**
- `packages/frontend-admin-v2/src/shared/ui/table.tsx`
- `packages/frontend-admin-v2/src/shared/ui/sortable-table-head.tsx`

## 6) Статусы и проблемы: единая семантика цвета

**Договорённость V3**
- Статусы/проблемы должны читаться мгновенно: badge/pill, без “текстовых простыней”.
- Маппинг статус → {label, variant/tone} живёт в одном месте (не размазываем по страницам).

**Эталон в V2**
- `packages/frontend-admin-v2/src/shared/ui/status-badge.tsx`

## 7) Detail: единый каркас + табы + карточные секции

**Договорённость V3**
- Деталь = header/meta/actions + summary strip + tabs.
- Табы должны уметь overflow-x (длинные наборы вкладок) и быть визуально спокойными.
- Тяжёлые вкладки грузим лениво.

**Эталон в V2**
- `packages/frontend-admin-v2/src/shared/layout/detail-page-layout.tsx`
- `packages/frontend-admin-v2/src/shared/layout/detail-tabs.tsx`
- Пример детали: `packages/frontend-admin-v2/src/features/event-detail/event-detail-view.tsx`

## 8) Размещение действий

**Договорённость V3**
- Primary action в шапке (или в StickySaveBar на edit-экранах).
- Secondary actions в actions slot, не смешиваем с фильтрами.
- Quick actions в таблице — компактные и предсказуемые.

