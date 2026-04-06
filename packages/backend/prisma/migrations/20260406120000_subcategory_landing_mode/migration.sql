-- SubcategoryLandingMode + landingTopicKey: whitelist генератора и привязка TOPIC_HUB (RIVER → river-cruises)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubcategoryLandingMode') THEN
    CREATE TYPE "SubcategoryLandingMode" AS ENUM ('DISABLED', 'AUTO', 'TOPIC_HUB');
  END IF;
END $$;

ALTER TABLE "subcategories" ADD COLUMN IF NOT EXISTS "landingMode" "SubcategoryLandingMode" NOT NULL DEFAULT 'DISABLED';
ALTER TABLE "subcategories" ADD COLUMN IF NOT EXISTS "landingTopicKey" TEXT;

UPDATE "subcategories" SET "landingMode" = 'AUTO' WHERE "isLandingEnabled" = true;
UPDATE "subcategories" SET "landingMode" = 'DISABLED' WHERE "isLandingEnabled" = false;

UPDATE "subcategories"
SET "landingMode" = 'TOPIC_HUB', "landingTopicKey" = 'river-cruises'
WHERE "code" = 'RIVER' AND "type" = 'EVENT_ONLY';

CREATE INDEX IF NOT EXISTS "subcategories_isLandingEnabled_landingMode_idx" ON "subcategories" ("isLandingEnabled", "landingMode");
