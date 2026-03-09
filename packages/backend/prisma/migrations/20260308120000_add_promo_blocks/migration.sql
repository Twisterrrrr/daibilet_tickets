-- CreateEnum
CREATE TYPE "PromoSelectionMode" AS ENUM ('MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "PromoContentType" AS ENUM ('EVENTS', 'VENUES', 'LINK_ONLY');

-- CreateEnum
CREATE TYPE "PromoIconSource" AS ENUM ('LIBRARY', 'SVG');

-- CreateEnum
CREATE TYPE "PromoBgMode" AS ENUM ('SOLID', 'GRADIENT');

-- CreateEnum
CREATE TYPE "PromoSortMode" AS ENUM ('POPULAR', 'RATING', 'SOONEST', 'RANDOM');

-- CreateTable
CREATE TABLE "promo_blocks" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "selectionMode" "PromoSelectionMode" NOT NULL DEFAULT 'MANUAL',
    "contentType" "PromoContentType" NOT NULL DEFAULT 'LINK_ONLY',
    "citySlug" TEXT,
    "categorySlug" TEXT,
    "tagSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isKids" BOOLEAN,
    "isIndoor" BOOLEAN,
    "autoSort" "PromoSortMode",
    "autoLimit" INTEGER,
    "iconSource" "PromoIconSource" NOT NULL DEFAULT 'LIBRARY',
    "iconKey" TEXT,
    "iconSvg" TEXT,
    "bgMode" "PromoBgMode" NOT NULL DEFAULT 'GRADIENT',
    "bgColor" TEXT,
    "gradientFrom" TEXT,
    "gradientTo" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_block_events" (
    "id" TEXT NOT NULL,
    "promoBlockId" TEXT NOT NULL,
    "eventId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "promo_block_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_block_venues" (
    "id" TEXT NOT NULL,
    "promoBlockId" TEXT NOT NULL,
    "venueId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "promo_block_venues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promo_blocks_slug_key" ON "promo_blocks"("slug");

-- CreateIndex
CREATE INDEX "promo_blocks_isActive_sortOrder_idx" ON "promo_blocks"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "promo_block_events_promoBlockId_eventId_key" ON "promo_block_events"("promoBlockId", "eventId");

-- CreateIndex
CREATE INDEX "promo_block_events_promoBlockId_sortOrder_idx" ON "promo_block_events"("promoBlockId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "promo_block_venues_promoBlockId_venueId_key" ON "promo_block_venues"("promoBlockId", "venueId");

-- CreateIndex
CREATE INDEX "promo_block_venues_promoBlockId_sortOrder_idx" ON "promo_block_venues"("promoBlockId", "sortOrder");

-- AddForeignKey
ALTER TABLE "promo_block_events" ADD CONSTRAINT "promo_block_events_promoBlockId_fkey" FOREIGN KEY ("promoBlockId") REFERENCES "promo_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_block_events" ADD CONSTRAINT "promo_block_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_block_venues" ADD CONSTRAINT "promo_block_venues_promoBlockId_fkey" FOREIGN KEY ("promoBlockId") REFERENCES "promo_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_block_venues" ADD CONSTRAINT "promo_block_venues_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
