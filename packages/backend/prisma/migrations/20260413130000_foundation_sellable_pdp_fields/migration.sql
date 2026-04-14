-- Foundation sellable PDP fields (Event/Admission/Offer/Session)
-- Adds nullable fields required by public PDP read contracts.

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "shortTitle" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "externalUrl" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "ageMin" INTEGER;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "h1" TEXT;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='admission_products') THEN
    ALTER TABLE "admission_products" ADD COLUMN IF NOT EXISTS "shortTitle" TEXT;
    ALTER TABLE "admission_products" ADD COLUMN IF NOT EXISTS "externalUrl" TEXT;
    ALTER TABLE "admission_products" ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER;
    ALTER TABLE "admission_products" ADD COLUMN IF NOT EXISTS "ageMin" INTEGER;
    ALTER TABLE "admission_products" ADD COLUMN IF NOT EXISTS "h1" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='catalog_sessions') THEN
    ALTER TABLE "catalog_sessions" ADD COLUMN IF NOT EXISTS "doorsOpenAt" TIMESTAMP(3);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='catalog_offers') THEN
    ALTER TABLE "catalog_offers" ADD COLUMN IF NOT EXISTS "code" TEXT;
  END IF;
END $$;

