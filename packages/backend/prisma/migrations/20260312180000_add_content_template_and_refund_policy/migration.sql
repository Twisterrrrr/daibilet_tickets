-- CreateEnum
CREATE TYPE "VenueRefundPolicyMode" AS ENUM ('INHERIT_SUPPLIER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "EventRefundPolicyMode" AS ENUM ('INHERIT_SUPPLIER', 'INHERIT_VENUE', 'CUSTOM');

-- AlterTable: events
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "meetingPoint" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "boardingPierId" UUID;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "disembarkPierId" UUID;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "routeSummary" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "refundPolicyMode" "EventRefundPolicyMode" DEFAULT 'INHERIT_SUPPLIER';
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "refundPolicyText" TEXT;

-- AlterTable: event_overrides
ALTER TABLE "event_overrides" ADD COLUMN IF NOT EXISTS "contentTemplateData" JSONB;
ALTER TABLE "event_overrides" ADD COLUMN IF NOT EXISTS "meetingPoint" TEXT;
ALTER TABLE "event_overrides" ADD COLUMN IF NOT EXISTS "routeSummary" TEXT;
ALTER TABLE "event_overrides" ADD COLUMN IF NOT EXISTS "refundPolicyMode" "EventRefundPolicyMode";
ALTER TABLE "event_overrides" ADD COLUMN IF NOT EXISTS "refundPolicyText" TEXT;

-- AlterTable: venues
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "refundPolicyMode" "VenueRefundPolicyMode" DEFAULT 'INHERIT_SUPPLIER';
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "refundPolicyText" TEXT;
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "venueTemplateData" JSONB;

-- AlterTable: operators (Supplier = Operator)
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "defaultRefundPolicyText" TEXT;
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "defaultRefundPolicyUpdatedAt" TIMESTAMP(3);
