-- Pre-YooKassa Safety Gates: domain model hardening
-- FulfillmentItem, ProcessedWebhookEvent, FeatureFlag

-- Enums
CREATE TYPE "PurchaseFlow" AS ENUM ('PLATFORM', 'EXTERNAL');
CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'RESERVING', 'RESERVED', 'CONFIRMED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- FulfillmentItem: per-line-item execution tracking
CREATE TABLE "fulfillment_items" (
  "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
  "checkoutSessionId"   UUID NOT NULL,
  "lineItemIndex"       INTEGER NOT NULL,
  "offerId"             UUID NOT NULL,
  "purchaseFlow"        "PurchaseFlow" NOT NULL,
  "provider"            TEXT NOT NULL DEFAULT 'INTERNAL',
  "status"              "FulfillmentStatus" NOT NULL DEFAULT 'PENDING',
  "externalOrderId"     TEXT,
  "externalPaymentUrl"  TEXT,
  "providerData"        JSONB,
  "amount"              INTEGER NOT NULL,
  "refundedAmount"      INTEGER NOT NULL DEFAULT 0,
  "refundId"            TEXT,
  "attemptCount"        INTEGER NOT NULL DEFAULT 0,
  "nextRetryAt"         TIMESTAMP(3),
  "lastError"           TEXT,
  "escalatedAt"         TIMESTAMP(3),
  "resolvedBy"          UUID,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL,

  CONSTRAINT "fulfillment_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "fulfillment_items"
  ADD CONSTRAINT "fulfillment_items_checkoutSessionId_fkey"
  FOREIGN KEY ("checkoutSessionId") REFERENCES "checkout_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "fulfillment_items_checkoutSessionId_idx" ON "fulfillment_items"("checkoutSessionId");
CREATE INDEX "fulfillment_items_status_idx" ON "fulfillment_items"("status");
CREATE INDEX "fulfillment_items_status_nextRetryAt_idx" ON "fulfillment_items"("status", "nextRetryAt");
CREATE INDEX "fulfillment_items_status_escalatedAt_idx" ON "fulfillment_items"("status", "escalatedAt");

-- ProcessedWebhookEvent: idempotency for incoming webhooks
CREATE TABLE "processed_webhook_events" (
  "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
  "providerEventId" TEXT NOT NULL,
  "provider"        TEXT NOT NULL,
  "eventType"       TEXT NOT NULL,
  "payload"         JSONB NOT NULL,
  "result"          TEXT,
  "processedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "processed_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "processed_webhook_events_providerEventId_key" ON "processed_webhook_events"("providerEventId");
CREATE INDEX "processed_webhook_events_provider_eventType_idx" ON "processed_webhook_events"("provider", "eventType");

-- FeatureFlag: per-city/category feature toggles
CREATE TABLE "feature_flags" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "key"         TEXT NOT NULL,
  "scope"       TEXT NOT NULL DEFAULT 'global',
  "scopeValue"  TEXT,
  "enabled"     BOOLEAN NOT NULL DEFAULT false,
  "metadata"    JSONB,
  "description" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "feature_flags_key_scope_scopeValue_key" ON "feature_flags"("key", "scope", "scopeValue");
CREATE INDEX "feature_flags_key_scope_idx" ON "feature_flags"("key", "scope");
