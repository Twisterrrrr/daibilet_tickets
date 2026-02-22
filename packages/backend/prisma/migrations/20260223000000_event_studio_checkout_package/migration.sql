-- Event Studio + Checkout Package: EventSchedule, расширение EventSession, CheckoutPackage/Items
-- См. docs/CheckoutSchedulesEventStudio.md

-- 1. Новые enum'ы
DO $$ BEGIN
  CREATE TYPE "ScheduleType" AS ENUM ('ONE_TIME', 'OPEN_DATE', 'RECURRENCE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'SOLD_OUT', 'RESCHEDULED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RescheduleReason" AS ENUM ('WEATHER', 'TECHNICAL', 'PROVIDER_REQUEST', 'LOW_DEMAND', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CheckoutPackageItemType" AS ENUM ('SESSION', 'OPEN_DATE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CheckoutPackageStatus" AS ENUM ('CREATED', 'LOCKED', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Таблица event_schedules
CREATE TABLE IF NOT EXISTS "event_schedules" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "offerId" UUID NOT NULL UNIQUE REFERENCES "event_offers"("id") ON DELETE CASCADE,
  "type" "ScheduleType" NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Europe/Moscow',
  "durationMin" INTEGER,
  "salesFrom" TIMESTAMP(3),
  "salesTo" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "rule" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "event_schedules_offerId_idx" ON "event_schedules"("offerId");
CREATE INDEX IF NOT EXISTS "event_schedules_type_isActive_idx" ON "event_schedules"("type", "isActive");

-- 3. Расширение event_sessions
ALTER TABLE "event_sessions" ADD COLUMN IF NOT EXISTS "scheduleId" UUID REFERENCES "event_schedules"("id") ON DELETE SET NULL;
ALTER TABLE "event_sessions" ADD COLUMN IF NOT EXISTS "dateLocal" DATE;
ALTER TABLE "event_sessions" ADD COLUMN IF NOT EXISTS "status" "SessionStatus" DEFAULT 'ACTIVE';
ALTER TABLE "event_sessions" ADD COLUMN IF NOT EXISTS "capacityTotal" INTEGER;
ALTER TABLE "event_sessions" ADD COLUMN IF NOT EXISTS "capacitySold" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "event_sessions" ADD COLUMN IF NOT EXISTS "rescheduledToId" UUID REFERENCES "event_sessions"("id") ON DELETE SET NULL;
ALTER TABLE "event_sessions" ADD COLUMN IF NOT EXISTS "rescheduleReason" "RescheduleReason";
ALTER TABLE "event_sessions" ADD COLUMN IF NOT EXISTS "rescheduleNote" TEXT;

CREATE INDEX IF NOT EXISTS "event_sessions_scheduleId_idx" ON "event_sessions"("scheduleId");
CREATE INDEX IF NOT EXISTS "event_sessions_status_idx" ON "event_sessions"("status");
CREATE INDEX IF NOT EXISTS "event_sessions_dateLocal_idx" ON "event_sessions"("dateLocal");
CREATE INDEX IF NOT EXISTS "event_sessions_rescheduledToId_idx" ON "event_sessions"("rescheduledToId");

-- 4. checkout_packages
CREATE TABLE IF NOT EXISTS "checkout_packages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "checkoutSessionId" UUID NOT NULL REFERENCES "checkout_sessions"("id") ON DELETE CASCADE,
  "status" "CheckoutPackageStatus" NOT NULL DEFAULT 'CREATED',
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "priceSnapshotJson" JSONB NOT NULL,
  "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paymentProvider" TEXT,
  "paymentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "checkout_packages_checkoutSessionId_idx" ON "checkout_packages"("checkoutSessionId");
CREATE INDEX IF NOT EXISTS "checkout_packages_status_createdAt_idx" ON "checkout_packages"("status", "createdAt");

-- 5. checkout_package_items
CREATE TABLE IF NOT EXISTS "checkout_package_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "packageId" UUID NOT NULL REFERENCES "checkout_packages"("id") ON DELETE CASCADE,
  "type" "CheckoutPackageItemType" NOT NULL,
  "offerId" UUID NOT NULL REFERENCES "event_offers"("id") ON DELETE RESTRICT,
  "sessionId" UUID REFERENCES "event_sessions"("id") ON DELETE RESTRICT,
  "openDate" DATE,
  "qty" INTEGER NOT NULL DEFAULT 1,
  "itemSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "checkout_package_items_session_or_open_chk" CHECK (
    (type = 'SESSION' AND "sessionId" IS NOT NULL AND "openDate" IS NULL)
    OR (type = 'OPEN_DATE' AND "sessionId" IS NULL AND "openDate" IS NOT NULL)
  ),
  CONSTRAINT "checkout_package_items_qty_chk" CHECK ("qty" > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "checkout_package_items_session_uniq"
  ON "checkout_package_items"("packageId", "offerId", "sessionId") WHERE "type" = 'SESSION';
CREATE UNIQUE INDEX IF NOT EXISTS "checkout_package_items_open_date_uniq"
  ON "checkout_package_items"("packageId", "offerId", "openDate") WHERE "type" = 'OPEN_DATE';
CREATE INDEX IF NOT EXISTS "checkout_package_items_packageId_idx" ON "checkout_package_items"("packageId");
CREATE INDEX IF NOT EXISTS "checkout_package_items_offerId_idx" ON "checkout_package_items"("offerId");
CREATE INDEX IF NOT EXISTS "checkout_package_items_sessionId_idx" ON "checkout_package_items"("sessionId");
