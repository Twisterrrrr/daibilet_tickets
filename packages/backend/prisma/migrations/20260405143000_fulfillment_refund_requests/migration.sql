-- MVP: item-level refund requests, REFUND_PENDING, isRedeemed

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'FulfillmentStatus' AND e.enumlabel = 'REFUND_PENDING'
  ) THEN
    ALTER TYPE "FulfillmentStatus" ADD VALUE 'REFUND_PENDING';
  END IF;
END $$;

CREATE TYPE "RefundRequestStatus" AS ENUM ('CREATED', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TYPE "RefundRequestReason" AS ENUM ('USER_REQUEST', 'EVENT_CANCELLED', 'SUPPORT', 'OTHER');

CREATE TYPE "RefundCreatedByType" AS ENUM ('ADMIN', 'USER', 'SYSTEM');

ALTER TABLE "fulfillment_items" ADD COLUMN IF NOT EXISTS "isRedeemed" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "refund_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fulfillmentItemId" UUID NOT NULL,
    "paymentIntentId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "reason" "RefundRequestReason" NOT NULL DEFAULT 'OTHER',
    "reasonNote" TEXT,
    "status" "RefundRequestStatus" NOT NULL DEFAULT 'CREATED',
    "createdByType" "RefundCreatedByType" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_fulfillmentItemId_fkey" FOREIGN KEY ("fulfillmentItemId") REFERENCES "fulfillment_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "payment_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "refund_requests_fulfillmentItemId_idx" ON "refund_requests"("fulfillmentItemId");

CREATE INDEX "refund_requests_paymentIntentId_idx" ON "refund_requests"("paymentIntentId");

CREATE INDEX "refund_requests_status_idx" ON "refund_requests"("status");
