## Prisma / База данных — безопасный workflow

Этот проект уже пережил инцидент с **schema drift** (схема Prisma и состояние БД разъехались из‑за запуска миграций не из той директории). Ниже — жёсткий регламент работы с Prisma.

### 1. Где запускать команды

- **Только из директории** `packages/backend`:
  - `npx prisma migrate dev`
  - `npx prisma migrate reset`
  - `npx prisma generate`
  - `npx prisma studio`
- Из корня монорепы (`package.json` в `/`) команды `db:generate`, `db:migrate`, `db:seed`, `db:studio` намеренно **ломаются** и подсказывают правильную команду:
  - это защита от случайного запуска Prisma с неверным `schema.prisma`.

### 2. Автоматический seed

В `packages/backend/package.json` настроен официальный hook Prisma:

```json
{
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  }
}
```

- Любой запуск:
  - `npx prisma migrate dev`
  - `npx prisma migrate reset`
- автоматически выполнит `prisma/seed.ts`.

**Гарантия**: после `migrate dev` / `migrate reset` база будет **готова к работе** (схема + базовые данные для админки, клиентов и кабинета поставщика).

### 3. Требования к seed

- Главный сидер: `packages/backend/prisma/seed.ts`.
- Он **идемпотентен**:
  - Везде, где возможно, используется `upsert` по уникальным полям (`slug`, `email`, `id` и т.д.).
  - Массовые вставки (`createMany`) используют `skipDuplicates: true`.
- Дополнительные сидеры (`seed-regions.ts`, `seed-seo-templates.ts` и т.п.) также должны:
  - применять `upsert` или `createMany` с `skipDuplicates`;
  - не полагаться на «пустую» БД.

Правило: **seed можно безопасно запускать многократно** — он не должен создавать дубликаты и ломать данные.

### 4. Жёсткие запреты

- **Нельзя**:
  - Редактировать файлы в `packages/backend/prisma/migrations/` руками.
  - Удалять миграции задним числом.
  - Запускать `npx prisma migrate dev` из корня монорепы или любых директорий, кроме `packages/backend`.
- Если нужно откатить/пересоздать миграцию:
  - создаём **новую** миграцию, которая аккуратно меняет схему;
  - либо в dev окружении делаем `npx prisma migrate reset` (из `packages/backend`), но **никогда** не ломаем историю миграций в Git.

### 5. Версии Node / pnpm / Prisma

- В корневом `package.json` зафиксированы минимальные версии:

```json
{
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

- В `packages/backend/package.json` зависимости:
  - `"prisma": "^6.3.0"`
  - `"@prisma/client": "^6.3.0"`
- Все разработчики должны:
  - использовать локальный CLI (`npx prisma`), а не глобально установленный `prisma`;
  - обновлять Prisma **только через** обновление этих зависимостей и отдельную миграцию.

### 6. Рекомендуемые команды для dev

Из `packages/backend`:

- **Применить новые миграции (dev):**

```bash
npx prisma migrate dev
```

- **Полный сброс и пересборка схемы + seed (локально):**

```bash
npx prisma migrate reset
```

- **Открыть Prisma Studio:**

```bash
npx prisma studio
```

Из корня монорепы (через pnpm filters, если нужно из удобства):

- **(Рекомендуется, но сконфигурировано как защита)** — смотреть подсказку ошибок `db:*` и всё равно идти в `packages/backend`.

### 7. Если что‑то пошло не так

1. Убедись, что ты в `packages/backend`.
2. Посмотри список миграций:

```bash
ls prisma/migrations
```

3. В dev‑окружении можно привести БД к чистому состоянию:

```bash
npx prisma migrate reset
```

4. Если drift пойман в прод/стейдже:
   - не правим схему руками;
   - строим **миграцию‑фиксер** (миграция, которая приводит БД к нужной схеме);
   - документируем инцидент в `docs/process/Diary.md`.

