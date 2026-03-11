# Ops Roadmap — Daibilet

> Трекинг операционных и инфраструктурных улучшений, **не обязательных для MVP**, но целесообразных по мере роста системы.
> Цель — не потерять архитектурные идеи, сохраняя текущую реализацию минимальной.

---

## Текущий ops baseline (MVP)

Следующие возможности уже реализованы.

### Cache operations

- **Namespace flush** — `POST /admin/settings/ops/cache/flush?namespace=`
- Namespace: `full`, `cities`, `events`, `catalog`, `tags`, `regions`, `landings`, `combos`, `search`
- **Cache stats**: hits, misses, hitRate — через `GET /admin/ops/metrics` (поле `cache`)

### Resync operations

- `POST /admin/settings/ops/sync/full`, `POST /admin/settings/ops/sync/incremental` — запуск job в BullMQ
- `GET /admin/settings/ops/sync/progress?jobId=` — state, finishedOn, failedReason
- Jobs: `singleton_sync_full`, `singleton_sync_incremental`

### Partitioning scaffold

- Миграция: `20260312120000_event_sessions_partitioned_scaffold`
- Скрипт: `scripts/ensure-event-sessions-partitions.ts` (ensure-partitions)
- План: `docs/PartitioningPlan.md`
- **Rollout не выполнен** — только подготовка

---

## Будущие улучшения

Эти пункты отложены до появления реальной нагрузки.

---

### Catalog observability

**Сейчас:** cache hits/misses/hitRate.

**Дальше:**
- Latency для `CatalogService.fetchEvents`: total, DB query, cache read, cache write
- p50/p95, slow path, cache vs DB вклад
- Result count, namespace/route метки

---

### Admin ops audit trail

**Сейчас:** flush и resync без истории.

**Дальше:**
- Cache flush history: namespace, who, when, duration, result
- Sync job history: jobId, type, startedAt, finishedAt, duration, result, failedReason
- Простой UI для просмотра последних запусков

---

### Partitioning rollout

**План (по мере роста объёма):**

1. Проверка схемы и индексов
2. Backfill скрипт (по месяцам)
3. Validation (счётчики, integrity)
4. Read switch → write switch → cleanup legacy

См. `docs/PartitioningPlan.md`.

---

### Maintenance jobs

- `ensure-event-sessions-partitions` — создание будущих партиций (cron 1-го числа)
- Возможные: cache warmup, integrity checks

---

## Когда возвращаться к roadmap

- Catalog latency выходит за допустимые пределы
- Количество сессий растёт заметно
- Resync становится частой рутиной
- Снижается cache hit rate
- Partition size становится проблемой

---

## Принцип

> Для MVP и раннего этапа — простые ops-инструменты и документация важнее сложной инфраструктуры.

Улучшения из этого документа внедрять **только при реальной производственной необходимости**.
