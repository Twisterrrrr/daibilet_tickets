# Tags Rollout Artifact — 2026-03-23

Окружение: local PostgreSQL (`localhost:5433`, DB `daibilet`, schema `public`)  
Контур: Sprint A / хвост 1 (rollout + verify + артефакт)

## 1) Применение миграций

Команда:

```bash
npx pnpm --filter @daibilet/backend db:migrate:prod
```

Результат:

- Применены миграции:
  - `20260323123000_tag_kind_structural_popular`
  - `20260323170000_add_tag_kind_group_check`
  - `20260323173000_validate_tag_kind_group_check`
- Статус: `All migrations have been successfully applied.`

## 2) Cleanup legacy tags

Команда:

```bash
npx pnpm --filter @daibilet/backend migrate:legacy-tags
```

Результат:

```text
=== migrateLegacyTags ===
Legacy candidates: 56
Updated tags: 56
Deactivated tags: 56
```

## 3) Audit после cleanup

Команда:

```bash
npx pnpm --filter @daibilet/backend audit:tags
```

Результат:

```text
=== TAG AUDIT ===
Total tags: 56
tagKind IS NULL: 0
STRUCTURAL + structuralGroup IS NULL: 0
Problematic tags: 0
```

## 4) Verify + validate constraint

Команда:

```bash
npx pnpm --filter @daibilet/backend verify:tags-post-migration
```

Результат:

```text
=== postMigrationVerifyTags ===
tagKind IS NULL: 0
STRUCTURAL + structuralGroup IS NULL: 0
POPULAR + structuralGroup IS NOT NULL: 0
Constraint tag_kind_group_check validated: true
```

## 5) Финальный audit

Команда:

```bash
npx pnpm --filter @daibilet/backend audit:tags
```

Результат:

```text
=== TAG AUDIT ===
Total tags: 56
tagKind IS NULL: 0
STRUCTURAL + structuralGroup IS NULL: 0
Problematic tags: 0
```

## 6) Итог Sprint A

- Data cleanup: завершён.
- DB constraint: `tag_kind_group_check` валидирован (`convalidated=true`).
- Legacy inconsistency по критериям rollout: отсутствует.
- Артефакт rollout: сохранён в этом документе.

## 7) Примечание

В выводе `npx` присутствовали предупреждения npm по env-конфигам (`Unknown env config ...`), на результат миграций/скриптов не повлияли.

