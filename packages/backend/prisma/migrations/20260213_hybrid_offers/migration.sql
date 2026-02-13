-- Add REQUEST_ONLY to PurchaseType enum
ALTER TYPE "PurchaseType" ADD VALUE IF NOT EXISTS 'REQUEST_ONLY';

-- Add MANUAL to EventSource enum
ALTER TYPE "EventSource" ADD VALUE IF NOT EXISTS 'MANUAL';

-- Add new columns to event_offers
ALTER TABLE "event_offers" ADD COLUMN IF NOT EXISTS "availabilityMode" TEXT;
ALTER TABLE "event_offers" ADD COLUMN IF NOT EXISTS "badge" TEXT;
ALTER TABLE "event_offers" ADD COLUMN IF NOT EXISTS "operatorId" UUID;

-- Add foreign key for operatorId on event_offers
ALTER TABLE "event_offers" ADD CONSTRAINT "event_offers_operatorId_fkey"
  FOREIGN KEY ("operatorId") REFERENCES "operators"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Index on operatorId
CREATE INDEX IF NOT EXISTS "event_offers_operatorId_idx" ON "event_offers"("operatorId");

-- ==========================================
-- CheckoutStatus enum
-- ==========================================
DO $$ BEGIN
  CREATE TYPE "CheckoutStatus" AS ENUM (
    'STARTED',
    'VALIDATED',
    'REDIRECTED',
    'PENDING_CONFIRMATION',
    'CONFIRMED',
    'AWAITING_PAYMENT',
    'COMPLETED',
    'EXPIRED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================
-- CheckoutSession table
-- ==========================================
CREATE TABLE IF NOT EXISTS "checkout_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "shortCode" TEXT NOT NULL,
  "cartSnapshot" JSONB NOT NULL,
  "validatedSnapshot" JSONB,
  "customerName" TEXT,
  "customerEmail" TEXT,
  "customerPhone" TEXT,
  "status" "CheckoutStatus" NOT NULL DEFAULT 'STARTED',
  "totalPrice" INTEGER,
  "expiresAt" TIMESTAMP(3),
  "utmSource" TEXT,
  "utmMedium" TEXT,
  "utmCampaign" TEXT,
  "referrer" TEXT,
  "userAgent" TEXT,
  "ip" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "checkout_sessions_shortCode_key" ON "checkout_sessions"("shortCode");
CREATE INDEX IF NOT EXISTS "checkout_sessions_status_idx" ON "checkout_sessions"("status");
CREATE INDEX IF NOT EXISTS "checkout_sessions_customerEmail_idx" ON "checkout_sessions"("customerEmail");

-- ==========================================
-- OrderRequest table
-- ==========================================
CREATE TABLE IF NOT EXISTS "order_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "checkoutSessionId" UUID,
  "eventOfferId" UUID NOT NULL,
  "eventId" UUID NOT NULL,
  "sessionId" UUID,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "priceSnapshot" INTEGER NOT NULL,
  "customerName" TEXT,
  "customerEmail" TEXT,
  "customerPhone" TEXT,
  "customerComment" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "adminNote" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "order_requests_pkey" PRIMARY KEY ("id")
);

-- Foreign key to checkout_sessions
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_checkoutSessionId_fkey"
  FOREIGN KEY ("checkoutSessionId") REFERENCES "checkout_sessions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "order_requests_checkoutSessionId_idx" ON "order_requests"("checkoutSessionId");
CREATE INDEX IF NOT EXISTS "order_requests_status_idx" ON "order_requests"("status");
CREATE INDEX IF NOT EXISTS "order_requests_eventId_idx" ON "order_requests"("eventId");
