-- Event-owned Route MVP: Route.eventId, RoutePoint.targetType, constraints

-- CreateEnum
CREATE TYPE "RoutePointTargetType" AS ENUM ('VENUE', 'EVENT');

-- AlterTable routes
ALTER TABLE "routes" ADD COLUMN "eventId" UUID;
ALTER TABLE "routes" ADD COLUMN "title" TEXT;
ALTER TABLE "routes" ADD COLUMN "summary" TEXT;
ALTER TABLE "routes" ADD COLUMN "is_published" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "routes" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX "routes_eventId_key" ON "routes"("eventId");

ALTER TABLE "routes" ADD CONSTRAINT "routes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "routes_eventId_idx" ON "routes"("eventId");

-- Backfill: один маршрут — одно событие по legacy events.routeId (первое совпадение)
UPDATE "routes" r
SET "eventId" = e.id
FROM "events" e
WHERE e."routeId" = r.id
  AND r."eventId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "routes" r2 WHERE r2."eventId" = e.id);

-- AlterTable route_points: targetType
ALTER TABLE "route_points" ADD COLUMN "targetType" "RoutePointTargetType";

UPDATE "route_points" SET "targetType" = 'VENUE' WHERE "venueId" IS NOT NULL;
UPDATE "route_points" SET "targetType" = 'EVENT' WHERE "eventId" IS NOT NULL AND "venueId" IS NULL;

DELETE FROM "route_points" WHERE "venueId" IS NULL AND "eventId" IS NULL;
UPDATE "route_points" SET "targetType" = 'VENUE' WHERE "targetType" IS NULL;

ALTER TABLE "route_points" ALTER COLUMN "targetType" SET NOT NULL;

CREATE INDEX "route_points_routeId_order_idx" ON "route_points"("routeId", "order");

ALTER TABLE "route_points" ADD CONSTRAINT "route_points_target_xor_check" CHECK (
  ("targetType" = 'VENUE' AND "venueId" IS NOT NULL AND "eventId" IS NULL) OR
  ("targetType" = 'EVENT' AND "eventId" IS NOT NULL AND "venueId" IS NULL)
);
