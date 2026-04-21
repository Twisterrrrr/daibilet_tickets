# Docs archive rebuild — план пересборки (2026‑04‑21)

Цель: превратить `docs/archive/**` из “склада” в **чистый legacy‑референс**, а актуальные документы — в однозначный набор источников истины для стратегии **Admin V3 first** (см. `docs/DIRECTION.md`).

---

## 1) Promote (поднять из archive в активные разделы)

### Ops / Gates

- `docs/archive/Gate0-Gate1.md`\n+  **Причина**: сейчас упоминается из `docs/runbooks/infra.md` как операторский чеклист.\n+  **Действие**: уже агрегировано в `docs/runbooks/infra.md`; дальше либо удалить ссылку на archive, либо переместить чеклист в `docs/runbooks/` как “legacy gate checklist”.

### Security / RBAC

- `docs/archive/security/legacy-folders-security/RBAC-Matrix.md`  
  **Действие**: оставить в archive как reference, но в активных доках держать только краткий контракт (уже в `docs/runbooks/infra.md`).  
  **Когда promote**: если начнём расширять роли/пермишены beyond ADMIN/EDITOR/VIEWER.

### Checkout PR-C series

- `docs/archive/PR-C*.md` и `docs/archive/PR-C0-C7-Final.md`\n+  **Действие**: оставить в archive как историю; в активных доках держать краткую “Checkout invariants” сводку, если понадобится для Admin V3 (orders/refunds).

---

## 2) Keep as legacy reference (не трогать сейчас)

- `docs/archive/specs/SupplierTrustSpec.md` — хорошая спека, но **не текущий фокус** (supplier deferred).
- `docs/archive/legacy-root/admin-v3_old/*` — исторические заметки; каноника сейчас в `docs/admin-v3/grand-master-plan.md`.
- `docs/archive/product/landings/legacy-folders-landings/*` — legacy parity/reference, каноника в `docs/product/landings.md`.
- `docs/archive/process/legacy-folders-process/Diary.md` — legacy дневник (актуальный: `docs/Diary.md`).
---

## 3) Fix links (текущие entrypoints)

- `docs/Project.md`: ссылки на buyer account / chat support / roadmap должны указывать в archive или быть переписаны в новые актуальные docs.\n+  Статус: **исправлено** (на archive paths) + добавлен `docs/DIRECTION.md`.
- `docs/admin-v3/grand-master-plan.md`: ссылки на отсутствующие тактические файлы заменены на актуальные entrypoints.\n+
---

## 4) Next steps (когда будем “пересобирать глубже”)

1. Собрать таблицу по `docs/archive/**` (top‑30 по важности) в формате: **File → Domain → Status (Promote/Legacy/DeleteCandidate) → Replacement**.\n+2. Для каждого “Promote”: короткая сводка в активном doc (1–2 экрана текста), без копипасты всей истории.\n+3. Оставить в archive только то, что действительно нужно как “история решений”.

