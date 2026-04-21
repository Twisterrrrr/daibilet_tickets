# Admin V3 (legacy-root) — единый вход

Этот файл — **одна закладка на всю папку** `admin-v3_old/`: что здесь лежит, в каком порядке читать и где «настоящий» consolidated-док.

**Статус:** archive / reference. Актуальный курс проекта — `docs/DIRECTION.md`, стратегия Admin V3 — `docs/admin-v3/grand-master-plan.md`.

---

## 1) С чего начать (рекомендуемый порядок)

1. **[`Implementation-Guide.md`](Implementation-Guide.md)** — задуман как **consolidated entry**: перечисляет темы и отсылает к исходникам. Текст разделов частично «размазан» по отдельным `.md` (ниже).
2. **[`admin-v3-roadmap.md`](admin-v3-roadmap.md)** — тактический roadmap/фазы (TC + Teplohod, цепочка данных, DoD). Живой по смыслу как история приоритизации.
3. Остальное — по задаче: роутинг, компоненты, UX-аудит, settings, матрица блоков и т.д.

---

## 2) Полный инвентарь файлов в этой папке

| Файл | Назначение |
|------|------------|
| [`README.md`](README.md) | Короткий указатель (можно заменить чтением этого файла). |
| [`Implementation-Guide.md`](Implementation-Guide.md) | Единая точка входа (каркас + ссылки на тематические документы). |
| [`admin-v3-roadmap.md`](admin-v3-roadmap.md) | Roadmap к запуску витрины, фазы, чеклисты. |
| [`admin-v3-plan.md`](admin-v3-plan.md) | План миграции V1→V3, списки экранов, feature flags, принципы. Часть помечена как перенесённая в Implementation Guide. |
| [`admin-v3-routing.md`](admin-v3-routing.md) | Роуты `/admin-v3/*`, guards, feature flags. Часть — stub «Moved». |
| [`admin-v3-components.md`](admin-v3-components.md) | Компонентный каркас списков/деталок, соглашения. Часть — stub «Moved». |
| [`admin-v3-ux.md`](admin-v3-ux.md) | UX-ритм, эталоны V2, паттерны. Часть — stub «Moved». |
| [`admin-v3-ux-audit.md`](admin-v3-ux-audit.md) | UX-аудит V3 (замечания и бэклог). Часть — stub «Moved». |
| [`admin-v3-settings-ux.md`](admin-v3-settings-ux.md) | IA/UX настроек (ops, pricing, users, RBAC). Часть — stub «Moved». |
| [`admin-v3-system-audit-phase0.md`](admin-v3-system-audit-phase0.md) | Системный аудит: матрица готовности блоков + foundation backlog. Часть — stub «Moved». |
| [`adminv3-block-ui-backend-prisma-matrix.md`](adminv3-block-ui-backend-prisma-matrix.md) | Матрица «блок ↔ UI ↔ API ↔ Prisma». Часть — stub «Moved». |
| [`UX-Parity-Backlog.md`](UX-Parity-Backlog.md) | Отдельная программа parity (Lovable contract), scope/DoD — не дублируется в Implementation Guide. |

---

## 3) Почему не один физический «мегафайл» со всем текстом

Технически **можно** склеить все `.md` в один огромный документ, но:

- часть файлов уже **дубликаты/stub** после переноса в `Implementation-Guide`;
- получится **длинная простыня** с повторяющимися заголовками и устаревшими ссылками;
- история в git станет хуже читаться (диффы на сотни строк).

Практичный компромисс: **этот файл + `Implementation-Guide.md` + исходники по темам** — то же «одно место», но без потери истории отдельных файлов.

---

## 4) Если нужен именно один файл для печати/офлайна

Соберите вручную порядок: `Implementation-Guide.md` → `admin-v3-roadmap.md` → выбранные тематические `.md` из таблицы выше (или экспорт через pandoc/script — отдельная задача).
