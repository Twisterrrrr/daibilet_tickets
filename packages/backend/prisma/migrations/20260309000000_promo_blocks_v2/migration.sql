-- Promo Blocks v2: PromoCollection, PromoCollectionItem, PromoCollectionRule
-- Мягкая миграция: текущие LINK_ONLY блоки остаются рабочими

-- CreateEnum
CREATE TYPE "PromoContentMode" AS ENUM ('LINK_ONLY', 'COLLECTION');

-- CreateEnum
CREATE TYPE "PromoCollectionContentType" AS ENUM ('EVENTS', 'VENUES');

-- CreateEnum
CREATE TYPE "PromoCollectionItemType" AS ENUM ('EVENT', 'VENUE');

-- AlterTable promo_blocks: add contentMode, collectionId; make href nullable
ALTER TABLE "promo_blocks" ADD COLUMN "contentMode" "PromoContentMode" NOT NULL DEFAULT 'LINK_ONLY';
ALTER TABLE "promo_blocks" ADD COLUMN "collectionId" TEXT;
ALTER TABLE "promo_blocks" ALTER COLUMN "href" DROP NOT NULL;

-- CreateTable
CREATE TABLE "promo_collections" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "selectionMode" "PromoSelectionMode" NOT NULL,
    "contentType" "PromoCollectionContentType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_collection_items" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "itemType" "PromoCollectionItemType" NOT NULL,
    "eventId" UUID,
    "venueId" UUID,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_collection_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_collection_rules" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "citySlug" TEXT,
    "categorySlug" TEXT,
    "tagSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isKids" BOOLEAN,
    "isIndoor" BOOLEAN,
    "sortMode" "PromoSortMode" NOT NULL DEFAULT 'POPULAR',
    "limit" INTEGER NOT NULL DEFAULT 12,
    "onlyActive" BOOLEAN NOT NULL DEFAULT true,
    "onlyBookable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_collection_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promo_collections_slug_key" ON "promo_collections"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "promo_collection_rules_collectionId_key" ON "promo_collection_rules"("collectionId");

-- CreateIndex
CREATE INDEX "promo_collection_items_collectionId_sortOrder_idx" ON "promo_collection_items"("collectionId", "sortOrder");

-- CreateIndex
CREATE INDEX "promo_collection_items_collectionId_itemType_idx" ON "promo_collection_items"("collectionId", "itemType");

-- CreateIndex
CREATE INDEX "promo_blocks_collectionId_idx" ON "promo_blocks"("collectionId");

-- AddForeignKey
ALTER TABLE "promo_blocks" ADD CONSTRAINT "promo_blocks_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "promo_collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_collection_items" ADD CONSTRAINT "promo_collection_items_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "promo_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_collection_items" ADD CONSTRAINT "promo_collection_items_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_collection_items" ADD CONSTRAINT "promo_collection_items_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_collection_rules" ADD CONSTRAINT "promo_collection_rules_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "promo_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
