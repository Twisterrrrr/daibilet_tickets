-- Venue geo + routes evolution (non-destructive, dual-read ready)

-- 1) Extend VenueType enum (safe, idempotent-ish via exception guard)
DO $$
BEGIN
  ALTER TYPE "VenueType" ADD VALUE 'RESTAURANT';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "VenueType" ADD VALUE 'CAFE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "VenueType" ADD VALUE 'BAR';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "VenueType" ADD VALUE 'FASTFOOD';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Geo dictionaries
CREATE TABLE "districts" (
  "id" UUID NOT NULL,
  "cityId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "districts_cityId_idx" ON "districts"("cityId");
CREATE INDEX "districts_slug_idx" ON "districts"("slug");
CREATE UNIQUE INDEX "districts_cityId_slug_key" ON "districts"("cityId", "slug");

ALTER TABLE "districts"
  ADD CONSTRAINT "districts_cityId_fkey"
  FOREIGN KEY ("cityId") REFERENCES "cities"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "metro_stations" (
  "id" UUID NOT NULL,
  "cityId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "lineName" TEXT,
  "lineColor" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "metro_stations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "metro_stations_cityId_idx" ON "metro_stations"("cityId");
CREATE INDEX "metro_stations_slug_idx" ON "metro_stations"("slug");
CREATE UNIQUE INDEX "metro_stations_cityId_slug_key" ON "metro_stations"("cityId", "slug");

ALTER TABLE "metro_stations"
  ADD CONSTRAINT "metro_stations_cityId_fkey"
  FOREIGN KEY ("cityId") REFERENCES "cities"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 3) Venue: add non-breaking columns for normalized geo + hidden gem
ALTER TABLE "venues"
  ADD COLUMN "district_id" UUID,
  ADD COLUMN "metro_station_id" UUID,
  ADD COLUMN "is_hidden_gem" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "venues_district_id_idx" ON "venues"("district_id");
CREATE INDEX "venues_metro_station_id_idx" ON "venues"("metro_station_id");

ALTER TABLE "venues"
  ADD CONSTRAINT "venues_district_id_fkey"
  FOREIGN KEY ("district_id") REFERENCES "districts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "venues"
  ADD CONSTRAINT "venues_metro_station_id_fkey"
  FOREIGN KEY ("metro_station_id") REFERENCES "metro_stations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 4) RoutePoint: ordered points for Route
CREATE TABLE "route_points" (
  "id" UUID NOT NULL,
  "routeId" UUID NOT NULL,
  "order" INTEGER NOT NULL,
  "venueId" UUID,
  "eventId" UUID,
  "durationMinutes" INTEGER,
  "description" TEXT,
  "titleOverride" TEXT,
  "isOptional" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "route_points_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "route_points_routeId_order_key" ON "route_points"("routeId", "order");
CREATE INDEX "route_points_routeId_idx" ON "route_points"("routeId");
CREATE INDEX "route_points_venueId_idx" ON "route_points"("venueId");
CREATE INDEX "route_points_eventId_idx" ON "route_points"("eventId");

ALTER TABLE "route_points"
  ADD CONSTRAINT "route_points_routeId_fkey"
  FOREIGN KEY ("routeId") REFERENCES "routes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "route_points"
  ADD CONSTRAINT "route_points_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "venues"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "route_points"
  ADD CONSTRAINT "route_points_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "events"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

