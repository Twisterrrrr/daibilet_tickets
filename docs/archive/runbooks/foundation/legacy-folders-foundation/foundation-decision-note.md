# Decision Note: Controlled Re-entry to Foundation Schema

Документ: `docs/foundation-decision-note.md`  
Статус: **Approved**  
Дата: **2026-04-13**

## 1. Контекст

В ходе внедрения catalog foundation backend был временно стабилизирован через использование резервной схемы:

- `prisma/schema.prisma.pre-catalog-foundation-bak` использовалась как основной source для генерации Prisma Client и миграций/сидинга.
- `schema.prisma` не являлась фактическим источником истины.
- Часть foundation-логики уже развилась дальше (classification/sections, subcategories links-first, Admin V3), но поверх временной стабилизации.

Это создало двойную модель:

- legacy/backup schema (фактически рабочая)
- foundation schema (целевая, но не runtime)

## 2. Проблема

### 2.1 Два source of truth

- Prisma Client генерируется не из основной схемы.
- `schema.prisma` не отражает реальную модель данных, используемую кодом.

### 2.2 Блокировка развития

Нельзя безопасно развивать:

- classification / derived sections
- Admin V3
- импорт и маппинги

не устранив двойную схему.

### 2.3 Риск техдолга

Временное решение становится нормой: дрейф между схемами растёт, onboarding и CI/CD усложняются.

## 3. Решение

Принято решение выполнить **controlled re-entry** на foundation schema.

Ключевой принцип:

> `packages/backend/prisma/schema.prisma` становится **единственным** source of truth для backend.

Это означает:

- Prisma Client генерируется только из `schema.prisma`.
- `.pre-catalog-foundation-bak` — только reference/backup, не используется в scripts/CI/runtime.
- backend компилируется на одной схеме.

## 4. Подход (не “переключить и надеяться”)

Переход выполняется как выравнивание:

1. Аудит расхождений `schema.prisma` vs `.bak` и зависимостей кода
2. Доведение `schema.prisma` до рабочей полноты для текущего backend
3. Переключение scripts обратно на `schema.prisma`
4. Prisma generate
5. Восстановление `tsc --noEmit`
6. Осмысленное решение по foundation module graph (включить/интегрировать/заменить)
7. Guardrails (скрипты/доки)

Детальный план: `docs/foundation-reentry-plan.md`.

## 5. Guardrails

- В scripts/CI нет ссылок на `.pre-catalog-foundation-bak`.
- `.bak` помечена как backup-only.
- Все новые изменения идут через `schema.prisma` как единственную схему.

