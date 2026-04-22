-- Orphan supplier refs would reject FK
UPDATE "events" e
SET "supplierId" = NULL
WHERE e."supplierId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "operators" o WHERE o.id = e."supplierId");

UPDATE "payment_intents" p
SET "supplierId" = NULL
WHERE p."supplierId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "operators" o WHERE o.id = p."supplierId");

-- FK: Event.supplierId -> operators (dual-write with legacy column; on delete clear link)
ALTER TABLE "events"
  ADD CONSTRAINT "events_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "operators"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- FK: PaymentIntent.supplierId -> operators (split payments)
ALTER TABLE "payment_intents"
  ADD CONSTRAINT "payment_intents_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "operators"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- UserFavorite: optional FK to Event (dual-write with eventSlug)
ALTER TABLE "user_favorites" ADD COLUMN "eventId" UUID;

UPDATE "user_favorites" uf
SET "eventId" = e.id
FROM "events" e
WHERE uf."eventSlug" = e.slug AND uf."eventId" IS NULL;

CREATE INDEX IF NOT EXISTS "user_favorites_eventId_idx" ON "user_favorites"("eventId");

ALTER TABLE "user_favorites"
  ADD CONSTRAINT "user_favorites_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "events"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- OrderRequest.sessionId: drop orphan refs, then FK to event_sessions
UPDATE "order_requests" o
SET "sessionId" = NULL
WHERE o."sessionId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "event_sessions" s WHERE s.id = o."sessionId");

CREATE INDEX IF NOT EXISTS "order_requests_sessionId_idx" ON "order_requests"("sessionId");

ALTER TABLE "order_requests"
  ADD CONSTRAINT "order_requests_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "event_sessions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
