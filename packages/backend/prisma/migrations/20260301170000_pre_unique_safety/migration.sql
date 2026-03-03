-- Pre-unique safety: индексы для soldCount + backfill tcSessionId + детектор дублей
-- Выполнить ДО миграции admin_schedule_capacity (20260301180000), которая добавляет UNIQUE(eventId, startsAt).
-- docs/AdminScheduleSpec.md §5.6
--
-- Важно: CREATE INDEX CONCURRENTLY нельзя внутри транзакции. Prisma оборачивает миграции в транзакцию,
-- поэтому используем обычный CREATE INDEX (кратковременный lock). Для production вручную — можно
-- вынести индексы в отдельный скрипт с CONCURRENTLY.

-- A) package_items: индексы для агрегации soldCount (JOIN + фильтр по status)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'package_items' AND indexname = 'package_items_sessionId_idx'
  ) THEN
    CREATE INDEX "package_items_sessionId_idx" ON "package_items" ("sessionId");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'package_items' AND indexname = 'package_items_sessionId_status_idx'
  ) THEN
    CREATE INDEX "package_items_sessionId_status_idx" ON "package_items" ("sessionId", "status");
  END IF;
END$$;

-- B) Backfill пустых tcSessionId (требуется для UNIQUE на tcSessionId)
UPDATE "event_sessions"
SET "tcSessionId" = CONCAT('import-', id)
WHERE "tcSessionId" IS NULL OR btrim("tcSessionId") = '';

-- C) Детектор дублей — не падает миграцию, только NOTICE
DO $$
DECLARE
  dup_count integer;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT "eventId", "startsAt"
    FROM "event_sessions"
    GROUP BY "eventId", "startsAt"
    HAVING COUNT(*) > 1
  ) d;

  IF dup_count > 0 THEN
    RAISE NOTICE 'Found % duplicate (eventId, startsAt) groups in event_sessions. Resolve before adding UNIQUE constraint.', dup_count;
  ELSE
    RAISE NOTICE 'No duplicates (eventId, startsAt) detected in event_sessions.';
  END IF;
END$$;
