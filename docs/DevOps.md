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
