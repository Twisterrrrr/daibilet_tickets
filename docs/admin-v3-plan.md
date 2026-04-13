# Admin V3 — план миграции (Shell + UI-kit + phased migration)

Цель: сделать **новый облегчённый Admin V3** поверх текущего проекта **без переписывания backend**, с поэтапной миграцией экранов из **V1**. V1 не удаляем, держим как fallback.

## 0) Что уже есть в репозитории

### Legacy Admin (V1): `packages/frontend-admin`

- **Shell / Layout**:
  - `packages/frontend-admin/src/components/layout/Layout.tsx` — topbar + sidebar provider + outlet, общий контейнер.
  - `packages/frontend-admin/src/components/layout/AdminSidebar.tsx` — меню, роли, бейджи (например чат).
  - `packages/frontend-admin/src/components/layout/CommandPalette.tsx` — Ctrl/Cmd+K по `ALL_NAV_ITEMS`.
- **Routing**:
  - `packages/frontend-admin/src/App.tsx` — `BrowserRouter`, nested layout route, `ProtectedRoute`, `DisabledRoute`, lazy для части страниц.
- **Navigation config**:
  - `packages/frontend-admin/src/config/nav.ts` — `NAV_SECTIONS`, `ALL_NAV_ITEMS`.
- **Feature flags (env → flags)**:
  - `packages/frontend-admin/src/config/flags.ts` — `VITE_LEGACY_SHOW_*` (`showCatalog/showContent/showEvents/showOrders/showOps`).
  - Применение:
    - sidebar visibility: `config/nav.ts` фильтрует items
    - route gating: `App.tsx` подменяет page на `DisabledRoute` (redirect на `/`)
- **Таблицы/списки**:
  - `packages/frontend-admin/src/components/ui/DataTable.tsx` — TanStack Table, но типизация местами слабая (`any` в `SortableHeader`)
  - На части страниц есть **снежинки**: кастомные таблицы/фильтры/состояния, особенно в доменных разделах.

**Важно (техдолг V1, который нельзя тащить в V3):**
- **Несогласованность**: nav скрывает раздел, но глубинные роуты местами остаются объявленными без gating.
- **Разнородность list-паттернов**: TanStack DataTable vs hand-rolled таблицы/фильтры.
- **Смешанная ответственность**: логика списков/фильтров/колонок часто живёт в страницах, а не в конфиге/хуках.

### Admin V2 (UX-референс): `packages/frontend-admin-v2`

V2 используем **как ориентир UX и “мягкости”**, но не копируем буквально.

Ключевые эталонные файлы:
- **Ритм и контейнер**: `packages/frontend-admin-v2/src/shared/ui/page-container.tsx` (max-width + отступы `px-6/8`, `pt-8/10`, `pb-16/20`).
- **Page header**: `packages/frontend-admin-v2/src/shared/layout/page-header.tsx` (title/subtitle/meta/actions + опциональный glyph).
- **List layout**: `packages/frontend-admin-v2/src/shared/layout/list-page-layout.tsx` (`space-y-8` секции, внутри `space-y-4`).
- **Detail layout**: `packages/frontend-admin-v2/src/shared/layout/detail-page-layout.tsx`, `.../detail-tabs.tsx` (табы, overflow-x).
- **FilterBar**: `packages/frontend-admin-v2/src/shared/layout/filter-bar.tsx` (card-like плита фильтров, `items-end`, размеры полей).
- **StatusBadge**: `packages/frontend-admin-v2/src/shared/ui/status-badge.tsx` (единая точка маппинга статусов).

Из V2 переносим как договорённости:
- **двухуровневый ритм вертикали**: между секциями страницы — 8, внутри секции — 4
- фильтры как отдельная “плита” (border + rounded + bg), выравнивание контролов по нижнему краю
- detail через табы + карточные секции (`Surface`-подобные)
- статусы/лейблы централизованно (маппинг в одном месте)

## 1) Список legacy экранов (V1)

Ниже — практический список по роутам из `packages/frontend-admin/src/App.tsx` и пунктам меню из `packages/frontend-admin/src/config/nav.ts`.

### Основные (часть из них — кандидат на V3 MVP)
- Dashboard: `/` → `pages/Dashboard.tsx` (есть в роутере, но **отсутствует** в sidebar config V1)
- Events: `/events`, `/events/new`, `/events/:id`, `/events/sessions`, `/events/merge`
- Venues: `/venues`, `/venues/new`, `/venues/:id`
- Cities: `/cities`, `/cities/new`, `/cities/:id`
- Tags: `/tags`, `/tags/new`, `/tags/:id`
- Landings: `/landings`, `/landings/new`, `/landings/:id`
- Collections: `/collections`, `/collections/new`, `/collections/:id`
- SEO Audit: `/seo-audit`
- Suppliers: `/suppliers`, `/suppliers/:id`
- Chat: `/chat`, `/chat/:id`
- Reviews: `/reviews` (+ `/external-reviews`)

### Прочие legacy (не в V3 MVP на старте)
- Orders / checkout-like: `/orders`, `/orders/:id`, `/checkout`
- Finance-ish: `/payouts`, `/finance-documents`, `/reconciliation`
- Ops: `/jobs/failed`, `/audit`
- Content add-ons: `/articles*`, `/combos*`
- Promotions: `/promo-blocks*`, `/promo-codes*`, `/promo-collections*`, `/upsells*`
- Support: `/support*`
- Moderation: `/moderation`
- Integrations-ish: `/widgets*`
- Catalog consistency: `/catalog-consistency`, `/source-categories`
- Users: `/users` (stub)
- Settings: `/settings`

## 2) Список экранов V3 MVP

Целевые разделы V3 (как в постановке):
- Dashboard
- Events
- Venues
- Cities
- Suppliers
- Collections
- Landings
- Tags
- SEO Audit
- Chat
- Reviews

## 3) Разделы, которые скрываем feature-flag’ами (V3)

Скрытые модули (не удаляем, не грузим данные):
- Sales (в V1 ближе всего `/orders`, `/checkout`)
- Finance (в V1 ближе всего `/payouts`, `/finance-documents`, `/reconciliation`)
- Reports (прямого `/reports` в V1 нет — “репортность” частично в dashboard/finance)
- Users (`/users` stub)
- Internal supplier office / supplier LK (в монорепе это отдельные пакеты `packages/frontend-supplier*`, не V1 admin)
- White-label two-way integration sections (в V1 ближе всего `/widgets*`)

## 4) Reusable vs non-reusable (что берём в V3)

### Reusable (как источники, не как копипаст)
- **UX ритм и layout-паттерны**: V2 `PageContainer`, `PageHeader`, `ListPageLayout`, `FilterBar`, detail tabs.
- **Часть shadcn/Radix примитивов**: уже используются в V1, можно переиспользовать подход и стилизацию.
- **Концепция central config**: навигация как данные (V1/V2), статусы как маппинг (V2).

### Non-reusable (не переносим в V3)
- Снежинки V1 списков/таблиц/фильтров и большие “универсальные” страницы.
- Несогласованность gating: где меню скрыто, но deep routes живые.
- Случайные секции sidebar (“Позже”) без продуктовой иерархии.

## 5) Договорённости для V3 (первые технические принципы)

- V3 живёт в **новом пакете** `packages/frontend-admin-v3`.
- V3 монтируем отдельным base path: **`/admin-v3/*`**.
- Feature flags V3 должны гарантировать:
  - скрытые модули **не показываются в sidebar**
  - их роуты **недоступны**
  - **никаких запросов** и side-effects для скрытых модулей
- Все списки V3: **server-side pagination/filter/sort**, без client-side фильтрации на больших датасетах.

