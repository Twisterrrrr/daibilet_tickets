-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "refreshTokenHash" TEXT,
ADD COLUMN     "role" "AdminRole" NOT NULL DEFAULT 'EDITOR';

-- AlterTable
ALTER TABLE "articles" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "cities" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "combo_pages" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "landing_pages" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tags" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_overrides" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "category" "EventCategory",
    "minAge" INTEGER,
    "manualRating" DECIMAL(2,1),
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "tagsAdd" TEXT[],
    "tagsRemove" TEXT[],
    "updatedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_config" (
    "id" UUID NOT NULL,
    "serviceFeePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "peakMarkupPercent" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "lastMinutePercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "tcCommissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "peakRanges" JSONB NOT NULL DEFAULT '[]',
    "updatedBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upsell_items" (
    "id" UUID NOT NULL,
    "citySlug" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priceKopecks" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upsell_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_status" (
    "id" UUID NOT NULL,
    "lastFullSyncAt" TIMESTAMP(3),
    "lastIncrSyncAt" TIMESTAMP(3),
    "lastRetagAt" TIMESTAMP(3),
    "lastPopulateAt" TIMESTAMP(3),
    "lastCacheFlush" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "event_overrides_eventId_key" ON "event_overrides"("eventId");

-- AddForeignKey
ALTER TABLE "event_overrides" ADD CONSTRAINT "event_overrides_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
