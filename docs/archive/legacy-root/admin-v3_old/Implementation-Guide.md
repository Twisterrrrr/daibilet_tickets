# Admin V3 — Implementation Guide (consolidated)

Этот документ — единая точка входа для реализации Admin V3 поверх текущего backend, без переписывания домена.

Связанные документы:

- стратегия по фазам: [`../admin-v3-grand-master-plan.md`](../admin-v3-grand-master-plan.md)
- тактический план работ: [`admin-v3-roadmap.md`](admin-v3-roadmap.md)

Источники, объединённые сюда (исторические файлы оставлены как короткие “moved”):

- `admin-v3-plan.md`
- `admin-v3-routing.md`
- `admin-v3-components.md`
- `admin-v3-ux.md`
- `admin-v3-ux-audit.md`
- `admin-v3-settings-ux.md`
- `admin-v3-system-audit-phase0.md`
- `adminv3-block-ui-backend-prisma-matrix.md`

---

## 1) План миграции (phased migration)

См. объединённый источник: `admin-v3-plan.md`.

Ключевой принцип: V3 — **новый чистый UI‑слой**, V1 остаётся fallback. Миграция поштучно.

---

## 2) Роутинг и feature flags

См. объединённый источник: `admin-v3-routing.md`.

Базовые инварианты:

- пакет: `packages/frontend-admin-v3`
- mount point: `/admin-v3/*`
- принцип flags: **не рендерить / не пускать / не запрашивать**

---

## 3) Компоненты и UX‑паттерны

См. объединённый источник: `admin-v3-components.md` и `admin-v3-ux.md`.

Цель: фиксировать повторяемые паттерны (PageHeader, FilterBar, list/detail layouts, states), чтобы не плодить “снежинки”.

---

## 4) UX audit и настройки

См. объединённые источники:

- `admin-v3-ux-audit.md`
- `admin-v3-settings-ux.md`

---

## 5) System audit phase 0

См. объединённый источник: `admin-v3-system-audit-phase0.md`.

---

## 6) Матрица блоков (Prisma ↔ backend ↔ UI)

См. объединённый источник: `adminv3-block-ui-backend-prisma-matrix.md`.

