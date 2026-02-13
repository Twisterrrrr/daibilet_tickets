-- CreateEnum
CREATE TYPE "OfferSource" AS ENUM ('TC', 'TEPLOHOD', 'RADARIO', 'TIMEPAD', 'MANUAL');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('ACTIVE', 'HIDDEN', 'DISABLED');

-- CreateEnum
CREATE TYPE "PurchaseType" AS ENUM ('TC_WIDGET', 'REDIRECT', 'API_CHECKOUT');

-- AlterTable
ALTER TABLE "event_sessions" ADD COLUMN     "offerId" UUID;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "canonicalOfId" UUID;

-- CreateTable
CREATE TABLE "event_offers" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "source" "OfferSource" NOT NULL,
    "purchaseType" "PurchaseType" NOT NULL,
    "externalEventId" TEXT,
    "metaEventId" TEXT,
    "deeplink" TEXT,
    "priceFrom" INTEGER,
    "commissionPercent" DOUBLE PRECISION,
    "status" "OfferStatus" NOT NULL DEFAULT 'ACTIVE',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "externalData" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_offers_eventId_idx" ON "event_offers"("eventId");

-- CreateIndex
CREATE INDEX "event_offers_status_idx" ON "event_offers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "event_offers_source_externalEventId_key" ON "event_offers"("source", "externalEventId");

-- CreateIndex
CREATE INDEX "event_sessions_offerId_idx" ON "event_sessions"("offerId");

-- CreateIndex
CREATE INDEX "events_canonicalOfId_idx" ON "events"("canonicalOfId");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_canonicalOfId_fkey" FOREIGN KEY ("canonicalOfId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_sessions" ADD CONSTRAINT "event_sessions_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "event_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_offers" ADD CONSTRAINT "event_offers_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
