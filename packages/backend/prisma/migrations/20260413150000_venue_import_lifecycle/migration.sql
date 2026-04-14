-- Venue import lifecycle: DRAFT / ACTIVE / MERGED / REJECTED, публикация страницы отдельно

CREATE TYPE "VenueLifecycleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'MERGED', 'REJECTED');
CREATE TYPE "VenueSourceType" AS ENUM ('IMPORTED', 'MANUAL');
CREATE TYPE "VenueImportSource" AS ENUM ('TICKETSCLOUD', 'TEPLOHOD');

ALTER TABLE "venues" ADD COLUMN "lifecycle_status" "VenueLifecycleStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "venues" ADD COLUMN "is_published" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "venues" ADD COLUMN "source_type" "VenueSourceType" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "venues" ADD COLUMN "import_source" "VenueImportSource";
ALTER TABLE "venues" ADD COLUMN "external_venue_id" TEXT;
ALTER TABLE "venues" ADD COLUMN "raw_name" TEXT;
ALTER TABLE "venues" ADD COLUMN "raw_address" TEXT;
ALTER TABLE "venues" ADD COLUMN "normalized_name" TEXT;
ALTER TABLE "venues" ADD COLUMN "normalized_address" TEXT;
ALTER TABLE "venues" ADD COLUMN "merge_target_id" UUID;
ALTER TABLE "venues" ADD COLUMN "confidence_score" DOUBLE PRECISION;
ALTER TABLE "venues" ADD COLUMN "needs_review" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "venues" ADD COLUMN "is_venue_page_whitelisted" BOOLEAN NOT NULL DEFAULT false;

UPDATE "venues"
SET "normalized_name" = lower(trim(regexp_replace(coalesce("title", ''), '\s+', ' ', 'g')))
WHERE "normalized_name" IS NULL;

ALTER TABLE "venues" ALTER COLUMN "normalized_name" SET NOT NULL;

ALTER TABLE "venues" ADD CONSTRAINT "venues_merge_target_id_fkey" FOREIGN KEY ("merge_target_id") REFERENCES "venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "venues_lifecycle_status_idx" ON "venues"("lifecycle_status");
CREATE INDEX "venues_cityId_lifecycle_status_idx" ON "venues"("cityId", "lifecycle_status");
CREATE INDEX "venues_import_source_external_venue_id_idx" ON "venues"("import_source", "external_venue_id");

CREATE UNIQUE INDEX "venues_cityId_import_source_external_venue_id_key" ON "venues"("cityId", "import_source", "external_venue_id");
