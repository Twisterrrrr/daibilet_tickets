-- ProcessedWebhookEvent: дедупликация по составному ключу eventType:object.id (не только payment.id)

ALTER TABLE "processed_webhook_events" ADD COLUMN "dedupeKey" TEXT;

UPDATE "processed_webhook_events"
SET "dedupeKey" = "eventType" || ':' || "providerEventId"
WHERE "dedupeKey" IS NULL;

ALTER TABLE "processed_webhook_events" ALTER COLUMN "dedupeKey" SET NOT NULL;

DROP INDEX IF EXISTS "processed_webhook_events_providerEventId_key";

CREATE UNIQUE INDEX "processed_webhook_events_dedupeKey_key" ON "processed_webhook_events"("dedupeKey");

CREATE INDEX "processed_webhook_events_providerEventId_idx" ON "processed_webhook_events"("providerEventId");
