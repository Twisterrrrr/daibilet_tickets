-- AlterTable
ALTER TABLE "event_overrides" ADD COLUMN "showInVenueProgram" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "event_overrides" ADD COLUMN "isFeaturedInVenue" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_overrides" ADD COLUMN "venueProgramSortOrder" INTEGER;
