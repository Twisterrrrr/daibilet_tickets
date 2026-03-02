-- Add normalizedTitle and groupingKey to events for multi-city grouping

ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "normalizedTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "groupingKey" TEXT;

CREATE INDEX IF NOT EXISTS "events_groupingKey_idx" ON "events"("groupingKey");

