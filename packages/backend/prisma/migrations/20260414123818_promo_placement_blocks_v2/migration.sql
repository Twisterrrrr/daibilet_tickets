-- Promo Blocks v2: placement-based distribution layer

-- CreateEnum
CREATE TYPE "PromoBlockStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PromoTargetType" AS ENUM ('EVENT', 'COLLECTION', 'LANDING', 'ARTICLE');

-- CreateEnum
CREATE TYPE "PromoPlacementZone" AS ENUM ('HOME_HERO', 'HOME_FEATURED', 'CITY_HERO', 'CITY_BELOW_HERO', 'LANDING_HERO', 'LANDING_INLINE', 'ARTICLE_INLINE', 'COLLECTION_INLINE', 'CATALOG_INLINE');

-- CreateEnum
CREATE TYPE "PromoPageScopeType" AS ENUM ('GLOBAL', 'CITY', 'LANDING', 'COLLECTION', 'ARTICLE');

-- CreateTable
CREATE TABLE "promo_placement_blocks" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "status" "PromoBlockStatus" NOT NULL DEFAULT 'DRAFT',
    "placementZone" "PromoPlacementZone" NOT NULL,
    "pageScopeType" "PromoPageScopeType" NOT NULL DEFAULT 'GLOBAL',
    "cityId" UUID,
    "landingId" UUID,
    "collectionId" UUID,
    "articleId" UUID,
    "targetType" "PromoTargetType" NOT NULL,
    "targetEventId" UUID,
    "targetCollectionId" UUID,
    "targetLandingId" UUID,
    "targetArticleId" UUID,
    "customTitle" TEXT,
    "customSubtitle" TEXT,
    "customImageUrl" TEXT,
    "ctaLabel" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isIndexableHint" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "promo_placement_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promo_placement_blocks_status_placementZone_pageScopeType_idx" ON "promo_placement_blocks"("status", "placementZone", "pageScopeType");

-- CreateIndex
CREATE INDEX "promo_placement_blocks_cityId_idx" ON "promo_placement_blocks"("cityId");

-- CreateIndex
CREATE INDEX "promo_placement_blocks_landingId_idx" ON "promo_placement_blocks"("landingId");

-- CreateIndex
CREATE INDEX "promo_placement_blocks_collectionId_idx" ON "promo_placement_blocks"("collectionId");

-- CreateIndex
CREATE INDEX "promo_placement_blocks_articleId_idx" ON "promo_placement_blocks"("articleId");

-- CreateIndex
CREATE INDEX "promo_placement_blocks_targetType_idx" ON "promo_placement_blocks"("targetType");

-- CreateIndex
CREATE INDEX "promo_placement_blocks_targetEventId_idx" ON "promo_placement_blocks"("targetEventId");

-- CreateIndex
CREATE INDEX "promo_placement_blocks_targetCollectionId_idx" ON "promo_placement_blocks"("targetCollectionId");

-- CreateIndex
CREATE INDEX "promo_placement_blocks_targetLandingId_idx" ON "promo_placement_blocks"("targetLandingId");

-- CreateIndex
CREATE INDEX "promo_placement_blocks_targetArticleId_idx" ON "promo_placement_blocks"("targetArticleId");

-- CreateIndex
CREATE INDEX "promo_placement_blocks_startsAt_endsAt_idx" ON "promo_placement_blocks"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "promo_placement_blocks_priority_sortOrder_updatedAt_idx" ON "promo_placement_blocks"("priority", "sortOrder", "updatedAt");

-- AddForeignKey
ALTER TABLE "promo_placement_blocks" ADD CONSTRAINT "promo_placement_blocks_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_placement_blocks" ADD CONSTRAINT "promo_placement_blocks_landingId_fkey" FOREIGN KEY ("landingId") REFERENCES "landing_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_placement_blocks" ADD CONSTRAINT "promo_placement_blocks_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_placement_blocks" ADD CONSTRAINT "promo_placement_blocks_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_placement_blocks" ADD CONSTRAINT "promo_placement_blocks_targetEventId_fkey" FOREIGN KEY ("targetEventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_placement_blocks" ADD CONSTRAINT "promo_placement_blocks_targetCollectionId_fkey" FOREIGN KEY ("targetCollectionId") REFERENCES "collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_placement_blocks" ADD CONSTRAINT "promo_placement_blocks_targetLandingId_fkey" FOREIGN KEY ("targetLandingId") REFERENCES "landing_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_placement_blocks" ADD CONSTRAINT "promo_placement_blocks_targetArticleId_fkey" FOREIGN KEY ("targetArticleId") REFERENCES "articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
