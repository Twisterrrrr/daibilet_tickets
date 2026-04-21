# Архив документации

Устаревшие спецификации и исторические документы. **Не источник актуальной архитектуры.**

## Правило архива (важно)

- **Archive ≠ source of truth**. Если документ в `docs/archive/**`, он не должен определять текущую архитектуру/контракты.
- **Исключение**: если на него **ссылаются** активные документы (`docs/*` вне `archive`) как на обязательный чеклист/контракт — его нужно либо:
  1) **Promote** (перенести/суммировать в активный раздел), либо
  2) оставить в archive, но добавить явную метку “legacy, но всё ещё используется”, указав причину.
- **Приоритет (активный контур)**: `docs/PROJECT-FOUNDATION.md` → канон из раздела Source of Truth в нём (`SYSTEM`, `PRODUCT`, `ARCHITECTURE`, …) → `docs/runbooks/*` → доменные `docs/core|product|admin-v3/*`. `docs/DIRECTION.md` — deprecated. Старый монолит: `docs/archive/deprecated-active-merged/Project.md.full-backup-2026-04-22.md`.

## Структура архива (по принадлежности)

Архив разложен по “полкам” (зеркалит активные разделы). Внутри некоторых полок есть `merged/` — удобные “сборники” ссылок, чтобы не читать десятки файлов.

| Раздел | Назначение | Примеры / сборники |
|-------|------------|--------------------|
| `core/` | Доменные контракты и инварианты (история) | `core/merged/Checkout-History.md`, `core/tags/merged/Tags-Rollout-History.md` |
| `runbooks/` | Ops / deploy / SSL / foundation (история) | `runbooks/merged/SSL-and-HTTPS-Runbooks.md` |
| `security/` | RBAC матрицы, security-checklists (история) | `security/legacy-folders-security/` |
| `integrations/` | Провайдеры/импорт/матрицы возможностей (история) | `integrations/legacy-folders-integrations/` |
| `product/` | Продуктовые спеки (история) | `product/landings/merged/Landings-Legacy-Reference.md` |
| `admin-v3/` | История Admin V3 / admin intelligence | `admin-v3/merged/Task10-Admin-Intelligence.md` |
| `process/` | Процесс/дневники/QA (история) | `process/legacy-folders-process/` |
| `reports/` | Разовые отчёты/аудиты/артефакты | `reports/ui-audit/` |
| `specs/`, `old-specs/`, `pr-specs/`, `legacy-root/` | Большие спеки и капсула времени | держим как reference; не канон |

Актуальная документация: [../README.md](../README.md)
