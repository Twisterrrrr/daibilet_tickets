-- ==========================================
-- Supplier Portal: маркетплейс-модель
-- Идемпотентная миграция
-- ==========================================

-- Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupplierRole') THEN
    CREATE TYPE "SupplierRole" AS ENUM ('OWNER', 'MANAGER');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ModerationStatus') THEN
    CREATE TYPE "ModerationStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'AUTO_APPROVED');
  END IF;
END $$;

-- ==========================================
-- Operator → Supplier расширение
-- ==========================================
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "isSupplier" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "trustLevel" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "commissionRate" DECIMAL(5,4) NOT NULL DEFAULT 0.2500;
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "promoRate" DECIMAL(5,4);
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "promoUntil" TIMESTAMPTZ;
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "yookassaAccountId" TEXT;
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "companyName" TEXT;
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "inn" TEXT;
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMPTZ;
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "successfulSales" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "refundRate" DECIMAL(5,4) NOT NULL DEFAULT 0.0000;

-- ==========================================
-- SupplierUser
-- ==========================================
CREATE TABLE IF NOT EXISTS "supplier_users" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "operatorId"       UUID NOT NULL REFERENCES "operators"("id"),
  "email"            TEXT NOT NULL UNIQUE,
  "passwordHash"     TEXT NOT NULL,
  "name"             TEXT NOT NULL,
  "role"             "SupplierRole" NOT NULL DEFAULT 'MANAGER',
  "isActive"         BOOLEAN NOT NULL DEFAULT true,
  "refreshTokenHash" TEXT,
  "lastLoginAt"      TIMESTAMPTZ,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "supplier_users_operatorId_idx" ON "supplier_users" ("operatorId");

-- ==========================================
-- Event: moderation поля
-- ==========================================
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "supplierId" UUID;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "moderationNote" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "moderatedAt" TIMESTAMPTZ;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "moderatedBy" UUID;

CREATE INDEX IF NOT EXISTS "events_supplierId_idx" ON "events" ("supplierId");
CREATE INDEX IF NOT EXISTS "events_moderationStatus_idx" ON "events" ("moderationStatus");

-- ==========================================
-- PaymentIntent: split-поля
-- ==========================================
ALTER TABLE "payment_intents" ADD COLUMN IF NOT EXISTS "supplierId" UUID;
ALTER TABLE "payment_intents" ADD COLUMN IF NOT EXISTS "grossAmount" INTEGER;
ALTER TABLE "payment_intents" ADD COLUMN IF NOT EXISTS "platformFee" INTEGER;
ALTER TABLE "payment_intents" ADD COLUMN IF NOT EXISTS "supplierAmount" INTEGER;
ALTER TABLE "payment_intents" ADD COLUMN IF NOT EXISTS "commissionRate" DECIMAL(5,4);
ALTER TABLE "payment_intents" ADD COLUMN IF NOT EXISTS "splitPaymentId" TEXT;

CREATE INDEX IF NOT EXISTS "payment_intents_supplierId_idx" ON "payment_intents" ("supplierId");
