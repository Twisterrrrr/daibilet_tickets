# UX Parity Backlog (Lovable UI Contract)

Дата обновления: 2026-03-23  
Статус программы: IN_PROGRESS

## 1) Scope Inventory (admin + supplier)

Всего экранов в scope: **24** (admin: 18, supplier: 6)

- Admin: `dashboard`, `events(list/edit)`, `venues(list/edit)`, `suppliers(list/detail)`, `orders`, `moderation`, `reviews`, `articles(list/edit)`, `collections(list/edit)`, `tags(list/edit)`, `seo`, `settings`.
- Supplier: `dashboard`, `events(list/edit)`, `reports`, `notifications`, `settings`.

## 2) Definition of Done

### CRITICAL — DoD

- Все страницы из scope используют системный page shell (`PageHeader`; ручных page-level `h1` нет).
- Sidebar contract совпадает по структуре и состояниям (matrix секций/порядка/active/hover/badge).
- На list/detail есть shared states (`LoadingState`/`EmptyState`/`ErrorState`) без локальных fallback-паттернов.
- Для list loading запрещен spinner-only; используется skeleton/shared loading pattern.
- Нет страниц вне list/page system для критичных сценариев.

### HIGH — DoD

- Все таблицы в list scope идут через shared table/DataTable систему.
- Нет coexistence старых и новых table-layout на одной функциональной зоне.
- Все статусы: shared `StatusBadge`.
- Все теги: shared `TagChip`.
- Все счетчики/индикаторы: shared `CountBadge` (или утвержденный shared equivalent).
- Toolbar/filter/action блоки используют единый шаблон.

### MEDIUM — DoD

- Визуальный ритм (typography/spacing) консистентен между страницами.
- Hover/focus/selected состояния унифицированы.
- Toolbar alignment одинаков на всех list pages в scope.

## 3) Anti-Regression Rules

- Запрещено добавлять новые list pages без `ListPageLayout` (или утвержденного shared эквивалента).
- Запрещено использовать raw `<table>` вне shared table/DataTable.
- Запрещено создавать кастомные локальные badges/chips.
- Все новые страницы обязаны использовать `PageHeader`/`PageShell`.
- Local loading/empty/error fallback запрещены при наличии shared state-компонентов.
- Любые отклонения — только через расширение shared components, не локально.

## 4) Execution Plan (strict order)

### Phase 1 — CRITICAL
1. Sidebar matrix finalize.
2. PageShell rollout (remove manual H1).
3. State UX rollout.
4. List system enforcement.

### Phase 2 — HIGH
5. DataTable rollout (все списки).
6. StatusBadge + TagChip + CountBadge rollout.
7. Detail/Form sections alignment.

### Phase 3 — MEDIUM
8. Typography harmonization.
9. Hover/focus polish.
10. Toolbar alignment.

## 5) Current Backlog

| ID | Severity | Task | Pages/Area | Expected behavior | Status |
|---|---|---|---|---|---|
| CR-01 | CRITICAL | Sidebar matrix finalize | Supplier sidebar | Section/group/order parity + formalized nav matrix | DONE |
| CR-02 | CRITICAL | PageShell hard enforcement | Admin edit/detail (`events`, `venues`, `articles`, `collections`, `tags`) | Remove manual `h1`/containers, use `PageHeader` | DONE |
| CR-03 | CRITICAL | State UX rollout | Remaining critical pages | Shared `LoadingState`/`EmptyState`/`ErrorState` everywhere | DONE |
| CR-04 | CRITICAL | List system enforcement | Supplier `reports`, residual list pages | Unified list layout + shared table/DataTable + toolbar | DONE |
| HI-01 | HIGH | DataTable rollout | Remaining list pages | No legacy/new table coexistence | IN_PROGRESS |
| HI-02A | HIGH | StatusBadge rollout | `admin/dashboard`, other status lists | All status badges via shared component | TODO |
| HI-02B | HIGH | TagChip rollout | `admin/articles`, `admin/collections`, `supplier/notifications` | Tag chips via shared component | TODO |
| HI-02C | HIGH | CountBadge rollout | Lists with counters/indicators | Unified counter badges | TODO |
| HI-03 | HIGH | Detail/Form sections alignment | Admin edit/detail + supplier settings surfaces | Shared section rhythm and actions alignment | TODO |
| MD-01 | MEDIUM | Typography harmonization | Scope-wide | Unified headings/secondary text rhythm | TODO |
| MD-02 | MEDIUM | Hover/Focus/Selected polish | Tables/chips/controls | Uniform interactive feedback | IN_PROGRESS |
| MD-03 | MEDIUM | Toolbar alignment consistency | List pages in scope | Single pattern for filters/search/actions | TODO |

## 6) Applied Safe Fixes (today)

- `packages/frontend-admin/src/pages/Dashboard.tsx`
  - Manual header replaced with shared `PageHeader`.
- `packages/frontend-admin/src/pages/articles/ArticlesList.tsx`
  - Manual header replaced with `PageHeader`.
  - Local error block replaced with `ErrorState`.
  - Empty row fallback replaced with `EmptyState`.
- `packages/frontend-admin/src/pages/collections/CollectionsList.tsx`
  - Manual header replaced with `PageHeader`.
  - Local error block replaced with `ErrorState`.
- `packages/frontend-supplier/src/pages/Notifications.tsx`
  - Added page-level `ErrorState` for failed load.

## 7) Open Gaps Snapshot

- CRITICAL:
  - Admin edit/detail still with manual shell: `EventEdit`, `VenueEdit`, `ArticleEdit`, `CollectionEdit`, `TagEdit`.
  - Supplier `Reports` still raw table + local toolbar/layout.
  - Supplier sidebar contract still partial.
- HIGH:
  - Ad-hoc badges/chips remain in `Dashboard`, `ArticlesList`, `CollectionsList`, `Reports`, `Notifications`.
  - Toolbar/filter pattern not yet fully unified.
- MEDIUM:
  - Remaining typography/spacing drift.
  - Remaining hover/focus inconsistencies.
