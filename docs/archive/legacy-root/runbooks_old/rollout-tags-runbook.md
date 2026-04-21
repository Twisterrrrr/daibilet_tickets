# Runbook: Tags Rollout (Production)

Дата: 2026-03-23

## Цель

Довести систему тегов до полностью валидного состояния на реальной БД:

- данные очищены от legacy несоответствий,
- constraint `tag_kind_group_check` не только создан, но и валидирован,
- сохранён артефакт rollout-аудита.

## Preconditions

- Есть доступ к production/staging БД.
- Backend deploy с последними скриптами:
  - `audit:tags`
  - `migrate:legacy-tags`
  - `verify:tags-post-migration`
- Применены миграции, добавляющие колонки `tagKind`, `structuralGroup`, `code`.

## Команды (по порядку)

```bash
npx pnpm --filter @daibilet/backend db:migrate:prod
npx pnpm --filter @daibilet/backend migrate:legacy-tags
npx pnpm --filter @daibilet/backend audit:tags
npx pnpm --filter @daibilet/backend verify:tags-post-migration
npx pnpm --filter @daibilet/backend audit:tags
```

## Ожидаемые результаты

После финального `audit:tags`:

- `tagKind IS NULL: 0`
- `STRUCTURAL + structuralGroup IS NULL: 0`
- `POPULAR + structuralGroup IS NOT NULL: 0` (проверяется в verify-скрипте)
- `Problematic tags: 0`

После `verify:tags-post-migration`:

- `Constraint tag_kind_group_check validated: true`

## Артефакт rollout

Сохранить вывод команд в файл:

- `docs/rollout-tags-YYYYMMDD.md`

Минимум в артефакте:

- окружение (staging/prod),
- commit hash backend,
- полный вывод `audit:tags` до/после,
- вывод `verify:tags-post-migration`,
- отметка времени.

## Что делать при сбое

### Сценарий A: нет колонок `tagKind/structuralGroup/code`

- Причина: миграции схемы не применены.
- Действие: повторить `db:migrate:prod`, затем запуск runbook с начала.

### Сценарий B: `verify:tags-post-migration` падает на инконсистентности

- Причина: часть legacy данных не классифицировалась автоматически.
- Действие:
  - повторно `audit:tags`,
  - адресно скорректировать проблемные `code`/`tagKind`/`structuralGroup` через админ/SQL,
  - снова `migrate:legacy-tags` и `verify:tags-post-migration`.

### Сценарий C: constraint есть, но не validated

- Причина: остались строки, нарушающие check.
- Действие: устранить нарушения по результату verify/audit, повторить validate.

## Post-check

- Проверить startup логи backend:
  - warning `Legacy tags detected...` должен исчезнуть.
- Проверить smoke:
  - `GET /catalog/tags?kind=STRUCTURAL&activeOnly=true`
  - `GET /catalog/events?...` (без 5xx, корректный response shape).

