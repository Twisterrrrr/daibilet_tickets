# Controlled Re-entry на foundation schema (Prisma)

Статус: **in progress**  
Дата: **2026-04-13**

## Цель (финальное состояние)

1. `packages/backend/prisma/schema.prisma` — **единственный** рабочий source of truth.
2. Prisma Client генерируется **только** из `schema.prisma`.
3. Скрипты `db:generate`, `db:migrate*`, `db:seed` используют **только** `schema.prisma`.
4. `.pre-catalog-foundation-bak` остаётся **только reference/backup**, не участвует в runtime/CI.
5. `@daibilet/backend` проходит `tsc --noEmit` на одной схеме.
6. Foundation-подход (catalog/classification/Admin V3) развивается **уже на одной схеме**, без двух параллельных truth-models.

## Этап A — аудит расхождений (без догадок)

### A1. Текущее “рабочее” состояние (как есть сейчас)

- **Скрипты Prisma** в `packages/backend/package.json` переведены на `prisma/schema.prisma`:
  - `db:generate`: `--schema prisma/schema.prisma`
  - `db:migrate*`: `--schema prisma/schema.prisma`
  - `db:seed`: предварительный `generate` тоже на `schema.prisma`

Это возвращает `schema.prisma` в роль единственного источника для Prisma Client / миграций / сидинга.

### A2. Сравнение `schema.prisma` vs `.pre-catalog-foundation-bak`

Автоматическая проверка набора `model`/`enum` показала:

- **Модели:**
  - в `schema.prisma`: 100
  - в `.bak`: 101
  - **missing в `schema.prisma`**: `ChatTelegramOperatorState`
- **Enum’ы:** совпадают (93/93), missing/extra не обнаружено.

**Вывод:** расхождение между схемами минимальное (1 модель), но сейчас критичен сам факт “двух источников” из‑за скриптов.

Фактическое исправление:

- `ChatTelegramOperatorState` добавлен в `schema.prisma` вместе с обратной связью в `ChatConversation`.

### A3. Module graph mismatch (foundation code path)

- В репозитории есть модуль `src/catalog-foundation-read/*`, но он **не подключён** в `AppModule` (импорт отсутствует).
- Ранее для прохождения `tsc --noEmit` использовалась временная изоляция `src/catalog-foundation-read/**` через `packages/backend/tsconfig.json` (`exclude`).
- Модуль `catalog-foundation-read` использует типы/enum’ы (`OfferOwnerKind`, `PublishStatus`, `SessionOwnerKind`, `ProviderEntityKind`, `AdmissionProduct*`), которых **нет** в текущем `schema.prisma`.

**Вывод:** `catalog-foundation-read` сейчас представляет собой отдельную ветку “ожидаемой” схемы и не может быть включён “просто так” без расширения `schema.prisma`.

## Этап B — доведение `schema.prisma` до “рабочей полноты”

### B1. Минимально необходимые изменения (для single source of truth)

- Добавить в `schema.prisma` отсутствующую модель **`ChatTelegramOperatorState`** (она уже есть в `.bak` и соответствует миграции `20260406140000_chat_telegram_operator_states`).

### B2. Принцип

- Не копировать `.bak` “целиком” (не требуется).
- Внести **только** недостающую часть для совпадения схем и предотвращения дрейфа.

## Этап C — переключение Prisma на одну схему

### C1. Скрипты

Изменить `packages/backend/package.json`:

- `db:generate` → `prisma generate --schema prisma/schema.prisma` (или без `--schema`, но явно лучше фиксировать путь)
- `db:migrate` / `db:migrate:prod` → использовать `prisma/schema.prisma`
- `db:seed` → предварительный generate тоже на `schema.prisma`

### C2. Убрать использование `.bak` из runtime цепочки

- `.pre-catalog-foundation-bak` оставить в репозитории как **reference only**.
- Добавить явную пометку в `.bak`: “DO NOT USE AS PRIMARY SCHEMA”.

### C3. Prisma Client

Проверка:

- `pnpm --filter @daibilet/backend db:generate` (на `schema.prisma`) — **PASS**

## Этап D — compile recovery (tsc) на одной схеме

Цель: `pnpm --filter @daibilet/backend exec tsc --noEmit` — **PASS**.

Текущее состояние:

- `tsc --noEmit` проходит при исключении `src/catalog-foundation-read/**` из `tsconfig.json`.

План:

- **D1 (active path):** admin events / classification / archive / import / venues/cities — держим зелёным.
- **D2 (foundation read module):** не включать “вслепую”; см. этап E.

## Этап E — вернуть foundation module graph (осмысленно)

Варианты (выбрать один, после стабилизации single-schema):

1. **Поднять `catalog-foundation-read`**: добавить в `schema.prisma` недостающие enum’ы/модели (Offer/Session/AdmissionProduct/PublishStatus/LocationKind…) + миграции + адаптировать код.
2. **Интегрировать foundation read подход в основной каталог**: перенести полезные read‑контракты в `CatalogModule` и удалить/архивировать `catalog-foundation-read` как отдельный модуль.

На текущем этапе (re-entry) `catalog-foundation-read` считается **temporary disabled** и должен быть либо восстановлен, либо официально заменён.

## Этап F — guardrails

- В скриптах/CI не должно остаться ссылок на `.pre-catalog-foundation-bak`.
- В документации зафиксировать:
  - `schema.prisma` — единственный source of truth
  - `.bak` — reference only
  - статус решения по `catalog-foundation-read` (E‑вариант 1 или 2)

## Чеклист приёмки re-entry (после этапа C/D)

### Prisma / backend
- [ ] `db:generate` на `schema.prisma`
- [ ] `db:migrate` / `db:seed` на `schema.prisma`
- [ ] `tsc --noEmit` зелёный

### Active business path
- [ ] Admin V3 events list/detail
- [ ] `sectionsDerived` / `subcategoriesCanonical`
- [ ] archive + batch archive dry-run
- [ ] subcategory selection (max 1–3, legacy/inactive preserve)

