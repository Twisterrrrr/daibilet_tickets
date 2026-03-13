# DevOps — инфраструктура и операционные улучшения

> Объединённый документ: roadmap, partitioning. Инструкции деплоя — см. [Deploy.md](Deploy.md).

---

## 1. Infrastructure Overview

- **Staging / Production** на VPS; см. [Deploy.md](Deploy.md).
- **Cache:** Redis; namespace flush через POST /admin/settings/ops/cache/flush.
- **Sync:** BullMQ; full/incremental jobs; progress через GET /admin/settings/ops/sync/progress.

---

## 2. Ops Roadmap

Улучшения, **не обязательные для MVP**, но целесообразные по мере роста.

### Текущий baseline

- Namespace flush, cache stats.
- Resync full/incremental с progress.
- Partitioning scaffold (подготовка; rollout не выполнен).

### Будущие улучшения

- **Catalog observability:** latency p50/p95, cache vs DB.
- **Admin ops audit:** история flush и sync jobs.
- **Partitioning rollout:** см. §3.
- **Maintenance jobs:** ensure-partitions (cron 1-го числа).

### Когда возвращаться

- Catalog latency растёт.
- Количество сессий заметно растёт.
- Cache hit rate падает.

---

## 3. Database Partitioning

### Цель

RANGE-партиционирование `event_sessions` по `startsAt` (месяц).

### Структура

| Таблица | Описание |
|---------|----------|
| event_sessions | Текущая (используется приложением) |
| event_sessions_partitioned | Новая партиционированная (scaffolding) |
| event_sessions_YYYY_MM | Партиции по месяцам |

### Этапы

1. **Scaffolding (сделано):** миграция `20260312120000_event_sessions_partitioned_scaffold`; скрипт `ensure-event-sessions-partitions`.
2. **Перенос данных:** INSERT batches по месяцам.
3. **Swap:** RENAME legacy → partitioned.
4. **Удаление legacy.**

Функция `create_event_sessions_partition(table, date)` — создание партиции.

### Ссылки

- План: `archive/old-specs/PartitioningPlan.md`
- Ops roadmap: `archive/old-specs/OpsRoadmap.md`

---

## 4. Prisma / миграции — правила безопасности

> Цель: не допустить «дрифта» между схемой БД и миграциями и никогда больше не требовать `migrate reset` на живых данных.

### 4.1. Папка `prisma/migrations` — только append

- **Никогда не редактировать** файлы уже применённых миграций.
- Если нужно исправить колонку/индекс:
  - меняем `schema.prisma`,
  - генерируем **новую** миграцию (`npx prisma migrate dev`),
  - не трогаем старые SQL‑файлы.
- Причина: Prisma хранит checksum миграций в `_prisma_migrations`; любое редактирование прошедшего файла ломает историю.

### 4.2. Структуру БД меняем только через `schema.prisma`

- Запрещено:
  - добавлять/удалять/менять колонки напрямую через DBeaver/DataGrip/psql;
  - править индексы руками в прод/стейджинг без соответствующей миграции.
- Разрешено:
  - менять структуру **только** в `schema.prisma` и фиксировать через `migrate dev` (dev) или `migrate deploy` (staging/prod).
- Иначе Prisma видит расхождение между ожидаемой схемой и реальной БД и требует `migrate reset`.

### 4.3. Команды по окружениям

- **Dev (локально):**
  - `npx prisma migrate dev` — создавать новые миграции и обновлять dev‑БД.
  - `npx prisma db push` — только для экспериментальных веток без коммита миграций (предпочтительно избегать в основном потоке).
- **Staging / Production:**
  - Только `npx prisma migrate deploy` — применяет уже закоммиченные миграции, **никогда** не предлагает reset.

### 4.4. Перед git push

- Убедиться, что:
  - `npx prisma validate` проходит без ошибок.
  - `npx prisma migrate dev` на чистой dev‑БД не просит `reset`.
  - Все новые миграции закоммичены вместе с изменениями `schema.prisma`.

### 4.5. Экстренный режим (если дрейф уже произошёл)

> Использовать только осознанно.

- Если БД менялась руками и reset нежелателен:
  - `npx prisma db pull` — подтянуть реальную схему БД в `schema.prisma`.
  - `npx prisma migrate resolve --applied <migration_name>` — пометить миграцию как применённую вручную (требует понимания последствий).
- Базовый принцип: к миграциям относимся как к истории транзакций банка — их **нельзя переписывать или удалять**, только дополнять.
