# F1 — План миграции партиционирования EventSession

## Цель

Партиционировать `event_sessions` по `startsAt` (месяц) для ускорения запросов и ограничения роста.

## Шаги (без простоя)

### 1. Подготовка

- Создать родительскую таблицу `event_sessions_new` (PARTITION BY RANGE (startsAt)).
- Создать партиции на N месяцев вперёд.
- Скрипт создания партиций: `infra/migrations/create_event_sessions_partitions.sql`.

### 2. Миграция данных

- `INSERT INTO event_sessions_new SELECT * FROM event_sessions` (batch по 10k).
- Проверить `COUNT(*)` совпадает.

### 3. Переключение

- `BEGIN;`
- `ALTER TABLE event_sessions RENAME TO event_sessions_old;`
- `ALTER TABLE event_sessions_new RENAME TO event_sessions;`
- `COMMIT;`
- Обновить FK-constraints если нужно (Prisma использует имя таблицы через @@map).

### 4. Cron для будущих партиций

- Раз в месяц создавать партиции на следующие 3 месяца.

## Rollback

- `ALTER TABLE event_sessions RENAME TO event_sessions_new;`
- `ALTER TABLE event_sessions_old RENAME TO event_sessions;`
- Приложение перезапустить.

## Verification

```sql
-- Размер партиций
SELECT inhrelid::regclass, pg_size_pretty(pg_total_relation_size(inhrelid))
FROM pg_inherits
WHERE inhparent = 'event_sessions'::regclass
ORDER BY inhrelid;

-- Pruning
EXPLAIN (ANALYZE) SELECT * FROM event_sessions WHERE startsAt >= '2026-03-01' AND startsAt < '2026-04-01';
```
