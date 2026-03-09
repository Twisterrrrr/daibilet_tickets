/*
  Warnings:

  - The primary key for the `event_session_stats` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `session_id` on the `event_session_stats` table. All the data in the column will be lost.
  - You are about to drop the column `sold_last24h` on the `event_session_stats` table. All the data in the column will be lost.
  - You are about to drop the column `total_paid` on the `event_session_stats` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `event_session_stats` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `last_customer_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `commissionrate` on the `venues` table. All the data in the column will be lost.
  - You are about to drop the `seo_contents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `seo_meta` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `seo_templates` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[source,tcEventId]` on the table `events` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sessionId` to the `event_session_stats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `event_session_stats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `last_customer_snapshots` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_operatorId_fkey";

-- DropForeignKey
ALTER TABLE "event_offers" DROP CONSTRAINT "event_offers_venueId_fkey";

-- DropForeignKey
ALTER TABLE "event_session_stats" DROP CONSTRAINT "event_session_stats_session_id_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_venueId_fkey";

-- DropForeignKey
ALTER TABLE "payment_intents" DROP CONSTRAINT "payment_intents_checkoutSessionId_fkey";

-- DropForeignKey
ALTER TABLE "seo_contents" DROP CONSTRAINT "seo_contents_cityId_fkey";

-- DropForeignKey
ALTER TABLE "supplier_users" DROP CONSTRAINT "supplier_users_operatorId_fkey";

-- DropForeignKey
ALTER TABLE "venues" DROP CONSTRAINT "venues_cityId_fkey";

-- DropForeignKey
ALTER TABLE "venues" DROP CONSTRAINT "venues_operatorId_fkey";

-- DropIndex
DROP INDEX "events_admin_list_idx";

-- DropIndex
DROP INDEX "events_audience_idx";

-- DropIndex
DROP INDEX "events_dateMode_idx";

-- DropIndex
DROP INDEX "events_moderationStatus_idx";

-- DropIndex
DROP INDEX "events_tcEventId_key";

-- DropIndex
DROP INDEX "package_items_sessionId_status_idx";

-- DropIndex
DROP INDEX "processed_webhook_events_processed_at_idx";

-- AlterTable
ALTER TABLE "api_keys" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "lastUsedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "ipWhitelist" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "checkout_sessions" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "completedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "event_offers" ALTER COLUMN "validUntil" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "event_overrides" ALTER COLUMN "needs_review_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "last_imported_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "qualityCheckedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "subcategoriesOverride" DROP DEFAULT;

-- AlterTable
ALTER TABLE "event_session_stats" DROP CONSTRAINT "event_session_stats_pkey",
DROP COLUMN "session_id",
DROP COLUMN "sold_last24h",
DROP COLUMN "total_paid",
DROP COLUMN "updated_at",
ADD COLUMN     "sessionId" UUID NOT NULL,
ADD COLUMN     "soldLast24h" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalPaid" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "event_session_stats_pkey" PRIMARY KEY ("sessionId");

-- AlterTable
ALTER TABLE "events" ALTER COLUMN "tcEventId" DROP NOT NULL,
ALTER COLUMN "moderatedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "endDate" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "external_reviews" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "feature_flags" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "fulfillment_items" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "last_customer_snapshots" DROP COLUMN "updated_at",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "operators" ALTER COLUMN "promoUntil" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "verifiedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "order_requests" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payment_event_logs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payment_intents" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "paidAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "failedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "processed_webhook_events" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "regions" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "review_photos" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "review_requests" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "review_votes" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "supplier_users" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "lastLoginAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "support_tickets" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ticket_responses" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "venues" DROP COLUMN "commissionrate",
ADD COLUMN     "commissionRate" DECIMAL(4,2),
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- DropTable
DROP TABLE "seo_contents";

-- DropTable
DROP TABLE "seo_meta";

-- DropTable
DROP TABLE "seo_templates";

-- DropEnum
DROP TYPE "SeoEntityType";

-- CreateTable
CREATE TABLE "collections" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "cityId" UUID,
    "filterTags" TEXT[],
    "filterCategory" TEXT,
    "filterSubcategory" TEXT,
    "filterAudience" TEXT,
    "additionalFilters" JSONB,
    "pinnedEventIds" UUID[],
    "excludedEventIds" UUID[],
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "heroImage" TEXT,
    "description" TEXT,
    "infoBlocks" JSONB,
    "faq" JSONB,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "collections_slug_key" ON "collections"("slug");

-- CreateIndex
CREATE INDEX "collections_cityId_idx" ON "collections"("cityId");

-- CreateIndex
CREATE INDEX "collections_isActive_isDeleted_idx" ON "collections"("isActive", "isDeleted");

-- CreateIndex
CREATE INDEX "article_events_eventId_idx" ON "article_events"("eventId");

-- CreateIndex
CREATE INDEX "article_tags_tagId_idx" ON "article_tags"("tagId");

-- CreateIndex
CREATE INDEX "articles_cityId_idx" ON "articles"("cityId");

-- CreateIndex
CREATE INDEX "checkout_sessions_status_expiresAt_idx" ON "checkout_sessions"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "event_sessions_eventId_canceledAt_idx" ON "event_sessions"("eventId", "canceledAt");

-- CreateIndex
CREATE INDEX "event_sessions_offerId_startsAt_idx" ON "event_sessions"("offerId", "startsAt");

-- CreateIndex
CREATE INDEX "event_tags_tagId_idx" ON "event_tags"("tagId");

-- CreateIndex
CREATE INDEX "events_source_tcEventId_idx" ON "events"("source", "tcEventId");

-- CreateIndex
CREATE INDEX "events_startLocationId_idx" ON "events"("startLocationId");

-- CreateIndex
CREATE INDEX "events_endLocationId_idx" ON "events"("endLocationId");

-- CreateIndex
CREATE INDEX "events_routeId_idx" ON "events"("routeId");

-- CreateIndex
CREATE UNIQUE INDEX "events_source_tcEventId_key" ON "events"("source", "tcEventId");

-- CreateIndex
CREATE INDEX "fulfillment_items_offerId_idx" ON "fulfillment_items"("offerId");

-- CreateIndex
CREATE INDEX "order_requests_eventOfferId_idx" ON "order_requests"("eventOfferId");

-- CreateIndex
CREATE INDEX "package_items_eventId_idx" ON "package_items"("eventId");

-- CreateIndex
CREATE INDEX "region_cities_cityId_idx" ON "region_cities"("cityId");

-- CreateIndex
CREATE INDEX "regions_hubCityId_idx" ON "regions"("hubCityId");

-- CreateIndex
CREATE INDEX "review_requests_eventId_idx" ON "review_requests"("eventId");

-- CreateIndex
CREATE INDEX "venues_operatorId_idx" ON "venues"("operatorId");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_session_stats" ADD CONSTRAINT "event_session_stats_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "event_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_offers" ADD CONSTRAINT "event_offers_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venues" ADD CONSTRAINT "venues_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venues" ADD CONSTRAINT "venues_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_users" ADD CONSTRAINT "supplier_users_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_eventOfferId_fkey" FOREIGN KEY ("eventOfferId") REFERENCES "event_offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_checkoutSessionId_fkey" FOREIGN KEY ("checkoutSessionId") REFERENCES "checkout_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
