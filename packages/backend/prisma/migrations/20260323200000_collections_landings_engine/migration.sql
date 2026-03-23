-- Collections / Landings engine foundation

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CollectionSourceType') THEN
    CREATE TYPE "CollectionSourceType" AS ENUM ('MANUAL', 'SUGGESTED', 'HYBRID', 'ACTIVE', 'REJECTED', 'ARCHIVED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CollectionStatus') THEN
    CREATE TYPE "CollectionStatus" AS ENUM ('DRAFT', 'SUGGESTED', 'ACTIVE', 'REJECTED', 'ARCHIVED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CollectionSelectionBasis') THEN
    CREATE TYPE "CollectionSelectionBasis" AS ENUM ('MANUAL', 'POPULAR', 'STRUCTURAL', 'COMBINATION');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LandingStatus') THEN
    CREATE TYPE "LandingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LandingTemplateType') THEN
    CREATE TYPE "LandingTemplateType" AS ENUM ('GENERIC_CARDS', 'COMPARISON_TABLE', 'HYBRID', 'SEASONAL_EVENT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LandingSelectionMode') THEN
    CREATE TYPE "LandingSelectionMode" AS ENUM ('COLLECTION', 'CUSTOM');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CollectionSourceType') THEN
    BEGIN
      ALTER TYPE "CollectionSourceType" ADD VALUE IF NOT EXISTS 'ACTIVE';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE "CollectionSourceType" ADD VALUE IF NOT EXISTS 'REJECTED';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE "CollectionSourceType" ADD VALUE IF NOT EXISTS 'ARCHIVED';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

ALTER TABLE "collections"
  ADD COLUMN IF NOT EXISTS "rankingJson" JSONB,
  ADD COLUMN IF NOT EXISTS "semanticKey" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceType" "CollectionSourceType" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "selectionBasis" "CollectionSelectionBasis" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "status" "CollectionStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "eventCountCached" INTEGER,
  ADD COLUMN IF NOT EXISTS "previewGeneratedAt" TIMESTAMP(3);

ALTER TABLE "landing_pages"
  ADD COLUMN IF NOT EXISTS "collectionId" UUID,
  ADD COLUMN IF NOT EXISTS "selectionMode" "LandingSelectionMode" NOT NULL DEFAULT 'CUSTOM',
  ADD COLUMN IF NOT EXISTS "rankingJson" JSONB,
  ADD COLUMN IF NOT EXISTS "templateType" "LandingTemplateType" NOT NULL DEFAULT 'GENERIC_CARDS',
  ADD COLUMN IF NOT EXISTS "status" "LandingStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "showInCollections" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isIndexable" BOOLEAN NOT NULL DEFAULT true;

UPDATE "collections"
SET "status" = CASE WHEN "isActive" = true THEN 'ACTIVE'::"CollectionStatus" ELSE 'DRAFT'::"CollectionStatus" END
WHERE "status" = 'DRAFT';

UPDATE "landing_pages"
SET "status" = CASE WHEN "isActive" = true THEN 'ACTIVE'::"LandingStatus" ELSE 'DRAFT'::"LandingStatus" END
WHERE "status" = 'DRAFT';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'landing_pages_collectionId_fkey') THEN
    ALTER TABLE "landing_pages"
      ADD CONSTRAINT "landing_pages_collectionId_fkey"
      FOREIGN KEY ("collectionId") REFERENCES "collections"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "collections_status_sourceType_idx" ON "collections"("status", "sourceType");
CREATE INDEX IF NOT EXISTS "landing_pages_status_showInCollections_idx" ON "landing_pages"("status", "showInCollections");
CREATE INDEX IF NOT EXISTS "landing_pages_collectionId_idx" ON "landing_pages"("collectionId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'collections_cityId_slug_key') THEN
    CREATE UNIQUE INDEX "collections_cityId_slug_key" ON "collections"("cityId", "slug");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'landing_pages_cityId_slug_key') THEN
    CREATE UNIQUE INDEX "landing_pages_cityId_slug_key" ON "landing_pages"("cityId", "slug");
  END IF;
END $$;
