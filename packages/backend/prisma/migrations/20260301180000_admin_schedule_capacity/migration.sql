-- Admin schedule (Teplohod-style): Event.defaultCapacityTotal, EventSession.capacityTotal, unique(eventId,startsAt)
-- docs/AdminScheduleSpec.md §5

BEGIN;

-- Event: default capacity for MANUAL sessions
ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "defaultCapacityTotal" integer;

-- EventSession: per-slot capacity, cancel fields
ALTER TABLE "event_sessions"
  ADD COLUMN IF NOT EXISTS "capacityTotal" integer,
  ADD COLUMN IF NOT EXISTS "canceledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;

-- Unique (eventId, startsAt) — может упасть при дубликатах; перед применением проверить:
-- SELECT "eventId", "startsAt", COUNT(*) FROM event_sessions GROUP BY 1,2 HAVING COUNT(*) > 1;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_sessions_eventId_startsAt_key'
  ) THEN
    ALTER TABLE "event_sessions"
      ADD CONSTRAINT "event_sessions_eventId_startsAt_key" UNIQUE ("eventId", "startsAt");
  END IF;
END$$;

COMMIT;
