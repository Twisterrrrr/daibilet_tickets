-- Landing composition: themes, content blocks, LandingPage extensions, LandingType without HUB (HUB -> MULTI_CITY).

-- CreateEnum
CREATE TYPE "LandingBlockType" AS ENUM (
  'HERO',
  'TRUST_BADGES',
  'VALUE_PROPS',
  'QUICK_FILTERS',
  'FEATURED_VARIANTS',
  'SCHEDULE_PREVIEW',
  'CITY_GRID',
  'CATEGORY_CHIPS',
  'INFO_ICONS',
  'STORY',
  'HIGHLIGHTS',
  'ITINERARY',
  'PRICING',
  'FAQ',
  'REVIEWS',
  'GALLERY',
  'COMPARISON',
  'RELATED_LANDINGS',
  'RELATED_COLLECTIONS',
  'RELATED_ARTICLES',
  'CTA_BANNER',
  'SEO_TEXT',
  'RAW_RICH_TEXT'
);

CREATE TYPE "LandingCanonicalMode" AS ENUM ('SELF', 'ALTERNATE', 'PASS_THROUGH');

-- LandingType: remove HUB (data -> MULTI_CITY)
ALTER TYPE "LandingType" RENAME TO "LandingType_old";

CREATE TYPE "LandingType" AS ENUM ('CITY', 'MULTI_CITY');

ALTER TABLE "landing_pages" ALTER COLUMN "landingType" DROP DEFAULT;

ALTER TABLE "landing_pages"
  ALTER COLUMN "landingType" TYPE "LandingType"
  USING (
    CASE
      WHEN "landingType"::text = 'HUB' THEN 'MULTI_CITY'::"LandingType"
      WHEN "landingType"::text = 'CITY' THEN 'CITY'::"LandingType"
      WHEN "landingType"::text = 'MULTI_CITY' THEN 'MULTI_CITY'::"LandingType"
      ELSE 'MULTI_CITY'::"LandingType"
    END
  );

DROP TYPE "LandingType_old";

ALTER TABLE "landing_pages" ALTER COLUMN "landingType" SET DEFAULT 'CITY'::"LandingType";

-- CreateTable landing_themes
CREATE TABLE "landing_themes" (
  "id" UUID NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "title" TEXT,
  "subtitle" TEXT,
  "defaultHeroTitle" TEXT,
  "defaultHeroBody" TEXT,
  "defaultSeoTitle" TEXT,
  "defaultSeoDesc" TEXT,
  "coverImageUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "landing_themes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "landing_themes_slug_key" ON "landing_themes"("slug");

-- CreateTable landing_content_blocks
CREATE TABLE "landing_content_blocks" (
  "id" UUID NOT NULL,
  "landingPageId" UUID NOT NULL,
  "type" "LandingBlockType" NOT NULL,
  "variant" TEXT,
  "title" TEXT,
  "subtitle" TEXT,
  "eyebrow" TEXT,
  "body" TEXT,
  "richTextJson" JSONB,
  "payload" JSONB,
  "assetUrl" TEXT,
  "mobileAssetUrl" TEXT,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "visibilityRules" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "landing_content_blocks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "landing_content_blocks_landingPageId_sortOrder_idx" ON "landing_content_blocks"("landingPageId", "sortOrder");

-- AlterTable landing_pages
ALTER TABLE "landing_pages" ADD COLUMN "themeId" UUID;
ALTER TABLE "landing_pages" ADD COLUMN "heroTitle" TEXT;
ALTER TABLE "landing_pages" ADD COLUMN "heroSubtitle" TEXT;
ALTER TABLE "landing_pages" ADD COLUMN "heroBadge" TEXT;
ALTER TABLE "landing_pages" ADD COLUMN "heroImageUrl" TEXT;
ALTER TABLE "landing_pages" ADD COLUMN "heroMobileImageUrl" TEXT;
ALTER TABLE "landing_pages" ADD COLUMN "layoutVariant" TEXT;
ALTER TABLE "landing_pages" ADD COLUMN "surfaceVariant" TEXT;
ALTER TABLE "landing_pages" ADD COLUMN "seoH1" TEXT;
ALTER TABLE "landing_pages" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "landing_pages" ADD COLUMN "seoDescription" TEXT;
ALTER TABLE "landing_pages" ADD COLUMN "ogImageUrl" TEXT;
ALTER TABLE "landing_pages" ADD COLUMN "canonicalMode" "LandingCanonicalMode" NOT NULL DEFAULT 'SELF';
ALTER TABLE "landing_pages" ADD COLUMN "canonicalLandingId" UUID;
ALTER TABLE "landing_pages" ADD COLUMN "publishedAt" TIMESTAMP(3);

-- Backfill SEO from legacy meta where useful
UPDATE "landing_pages"
SET
  "seoTitle" = "metaTitle",
  "seoDescription" = "metaDescription"
WHERE "seoTitle" IS NULL AND "metaTitle" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "landing_pages"
  ADD CONSTRAINT "landing_pages_themeId_fkey"
  FOREIGN KEY ("themeId") REFERENCES "landing_themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "landing_pages"
  ADD CONSTRAINT "landing_pages_canonicalLandingId_fkey"
  FOREIGN KEY ("canonicalLandingId") REFERENCES "landing_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "landing_content_blocks"
  ADD CONSTRAINT "landing_content_blocks_landingPageId_fkey"
  FOREIGN KEY ("landingPageId") REFERENCES "landing_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "landing_pages_themeId_idx" ON "landing_pages"("themeId");
CREATE INDEX "landing_pages_canonicalLandingId_idx" ON "landing_pages"("canonicalLandingId");

-- Optional: one MULTI_CITY row per slug (city_id IS NULL)
CREATE UNIQUE INDEX "landing_pages_multicity_slug_unique"
  ON "landing_pages" ("slug")
  WHERE "cityId" IS NULL AND "isDeleted" = false;
