-- Add Location PDP fields (foundation)
-- Adds nullable fields required by public location PDP contract.

ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "shortName" TEXT;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "metro" TEXT;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "externalUrl" TEXT;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "h1" TEXT;

