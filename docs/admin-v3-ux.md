# Admin V3 — UX паттерны (референс из V2)

Цель: взять из V2 **мягкость интерфейса, визуальный ритм, чистые фильтры и аккуратную иерархию**, но **не переносить V2 механически**. Ниже — набор договорённостей V3 с привязкой к эталонным местам в `packages/frontend-admin-v2`.

## 1) Ритм страницы и контейнер

**Договорённость V3**
- Вертикальный ритм: **между крупными секциями страницы** — шаг 8, **внутри секции** — шаг 4.
- Контент ограничиваем по ширине (desktop-first), чтобы таблицы/карточки не “разъезжались”.

**Эталон в V2**
- `packages/frontend-admin-v2/src/shared/ui/page-container.tsx`
- `packages/frontend-admin-v2/src/shared/layout/list-page-layout.tsx`

## 2) PageHeader: заголовок, подзаголовок, мета и действия

**Договорённость V3**
- Заголовок читается за 1 секунду: `title` (h1) + `subtitle` (2 строки максимум по ширине) + опциональное `meta`.
- Действия отделены, не ломают строку, имеют понятную иерархию (primary/secondary/ghost).
- Опциональный **glyph** слева как визуальный якорь раздела (но без декоративного шума).

**Эталон в V2**
- `packages/frontend-admin-v2/src/shared/layout/page-header.tsx`
- `packages/frontend-admin-v2/src/shared/ui/page-glyph.tsx`

## 3) Фильтры: плита + выравнивание по низу + размер полей

**Договорённость V3**
- Фильтры — отдельная “плита” (border + bg + padding), а не россыпь контролов.
- На desktop: `items-end`, чтобы лейблы и контролы визуально выровнялись.
- Поля фильтров не растягиваем бесконечно: min-width + ограничение max-width, чтобы строка оставалась плотной.

**Эталон в V2**
- `packages/frontend-admin-v2/src/shared/layout/filter-bar.tsx`

## 4) List shell: один список — один паттерн

**Договорённость V3**
- Страница списка собирается одинаково:
  1) `PageHeader`
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

