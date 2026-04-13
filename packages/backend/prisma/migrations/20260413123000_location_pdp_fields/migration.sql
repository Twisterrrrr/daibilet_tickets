-- Add Location PDP fields (foundation)
-- Adds nullable fields required by public location PDP contract.

ALTER TABLE "locations" ADD COLUMN "shortName" TEXT;
ALTER TABLE "locations" ADD COLUMN "metro" TEXT;
ALTER TABLE "locations" ADD COLUMN "externalUrl" TEXT;
ALTER TABLE "locations" ADD COLUMN "h1" TEXT;

