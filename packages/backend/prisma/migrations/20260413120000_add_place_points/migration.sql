-- Add PlacePoint (foundation)
-- Safe for existing foundation DB (creates new enum/table/indexes).

CREATE TYPE "PlacePointKind" AS ENUM ('START_POINT', 'END_POINT', 'BOARDING_POINT', 'DISEMBARK_POINT', 'OTHER');

CREATE TABLE "place_points" (
  "id" UUID NOT NULL,
  "locationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "PlacePointKind" NOT NULL DEFAULT 'OTHER',
  "address" TEXT,
  "latitude" DECIMAL(9,6),
  "longitude" DECIMAL(9,6),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "place_points_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "place_points_locationId_kind_idx" ON "place_points"("locationId", "kind");
CREATE INDEX "place_points_locationId_idx" ON "place_points"("locationId");

ALTER TABLE "place_points"
  ADD CONSTRAINT "place_points_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

