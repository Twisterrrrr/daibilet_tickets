-- Foundation sellable PDP fields (Event/Admission/Offer/Session)
-- Adds nullable fields required by public PDP read contracts.

ALTER TABLE "events" ADD COLUMN "shortTitle" TEXT;
ALTER TABLE "events" ADD COLUMN "externalUrl" TEXT;
ALTER TABLE "events" ADD COLUMN "ageMin" INTEGER;
ALTER TABLE "events" ADD COLUMN "h1" TEXT;

ALTER TABLE "admission_products" ADD COLUMN "shortTitle" TEXT;
ALTER TABLE "admission_products" ADD COLUMN "externalUrl" TEXT;
ALTER TABLE "admission_products" ADD COLUMN "durationMinutes" INTEGER;
ALTER TABLE "admission_products" ADD COLUMN "ageMin" INTEGER;
ALTER TABLE "admission_products" ADD COLUMN "h1" TEXT;

ALTER TABLE "catalog_sessions" ADD COLUMN "doorsOpenAt" TIMESTAMP(3);

ALTER TABLE "catalog_offers" ADD COLUMN "code" TEXT;

