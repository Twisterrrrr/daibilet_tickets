-- Analytics: pre-aggregation + list filters
CREATE TABLE "daily_event_stats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "statDate" DATE NOT NULL,
    "eventId" UUID NOT NULL,
    "soldCount" INTEGER NOT NULL,
    "revenue" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_event_stats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "daily_event_stats_statDate_eventId_key" ON "daily_event_stats"("statDate", "eventId");

CREATE INDEX "daily_event_stats_eventId_statDate_idx" ON "daily_event_stats"("eventId", "statDate");

ALTER TABLE "daily_event_stats" ADD CONSTRAINT "daily_event_stats_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "packages_createdAt_idx" ON "packages"("createdAt");

CREATE INDEX IF NOT EXISTS "package_items_eventId_status_idx" ON "package_items"("eventId", "status");
