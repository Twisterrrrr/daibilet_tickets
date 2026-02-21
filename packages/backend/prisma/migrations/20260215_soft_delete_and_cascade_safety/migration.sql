-- Soft-delete + cascade safety: защита от потери финансовых/пользовательских данных
-- Idempotent: safe when columns already exist (e.g. after db push)

-- 1. Soft-delete для Event
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "events_isDeleted_idx" ON "events"("isDeleted") WHERE "isDeleted" = false;

-- 2. Soft-delete для EventOffer
ALTER TABLE "event_offers" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_offers" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "event_offers_isDeleted_idx" ON "event_offers"("isDeleted") WHERE "isDeleted" = false;

-- 3. Cascade → Restrict: EventSession → Event
ALTER TABLE "event_sessions" DROP CONSTRAINT IF EXISTS "event_sessions_eventId_fkey";
ALTER TABLE "event_sessions"
  ADD CONSTRAINT "event_sessions_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Cascade → Restrict: EventOffer → Event
ALTER TABLE "event_offers" DROP CONSTRAINT IF EXISTS "event_offers_eventId_fkey";
ALTER TABLE "event_offers"
  ADD CONSTRAINT "event_offers_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Cascade → Restrict: EventOverride → Event
ALTER TABLE "event_overrides" DROP CONSTRAINT IF EXISTS "event_overrides_eventId_fkey";
ALTER TABLE "event_overrides"
  ADD CONSTRAINT "event_overrides_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. Cascade → SetNull: Review → Event
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_eventId_fkey";
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. Cascade → SetNull: Review → Venue
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_venueId_fkey";
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 8. Cascade → SetNull: ExternalReview → Event
ALTER TABLE "external_reviews" DROP CONSTRAINT IF EXISTS "external_reviews_eventId_fkey";
ALTER TABLE "external_reviews"
  ADD CONSTRAINT "external_reviews_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
