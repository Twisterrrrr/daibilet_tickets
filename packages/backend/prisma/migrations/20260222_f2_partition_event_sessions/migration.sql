-- F2 — Функция создания партиций EventSession по startsAt (месяц)
-- Полная миграция — см. docs/PartitioningPlan.md (создание таблицы, перенос, swap).
-- Эта миграция добавляет только функцию для автоподготовки партиций.

CREATE OR REPLACE FUNCTION create_event_sessions_partition(
  parent_table regclass,
  month_start date
) RETURNS void AS $$
DECLARE
  partition_name text;
  month_end date;
BEGIN
  partition_name := 'event_sessions_' || to_char(month_start, 'YYYY_MM');
  month_end := month_start + interval '1 month';

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF %s
     FOR VALUES FROM (%L) TO (%L)',
    partition_name,
    parent_table,
    month_start,
    month_end
  );
END;
$$ LANGUAGE plpgsql;

-- Пример вызова (раскомментировать при ручной миграции):
-- SELECT create_event_sessions_partition('event_sessions_partitioned'::regclass, date_trunc('month', CURRENT_DATE)::date + (n || ' months')::interval)
-- FROM generate_series(0, 5) n;
