ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "defaultCapacityTotal" integer;

ALTER TABLE "event_sessions"
  ADD COLUMN IF NOT EXISTS "capacityTotal" integer;

ALTER TABLE "event_sessions"
  ADD COLUMN IF NOT EXISTS "canceledAt" TIMESTAMP(3);

ALTER TABLE "event_sessions"
  ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;

