-- ==========================================
-- PaymentIntent: stub-слой для будущей YooKassa
-- Идемпотентная миграция
-- ==========================================

-- Enum PaymentStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');
  END IF;
END $$;

-- Таблица payment_intents
CREATE TABLE IF NOT EXISTS "payment_intents" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "checkoutSessionId"   UUID NOT NULL REFERENCES "checkout_sessions"("id"),
  "idempotencyKey"      TEXT NOT NULL UNIQUE,
  "amount"              INTEGER NOT NULL,
  "currency"            TEXT NOT NULL DEFAULT 'RUB',
  "status"              "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "provider"            TEXT NOT NULL DEFAULT 'STUB',
  "providerPaymentId"   TEXT,
  "providerData"        JSONB,
  "paymentUrl"          TEXT,
  "paidAt"              TIMESTAMPTZ,
  "failedAt"            TIMESTAMPTZ,
  "failReason"          TEXT,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS "payment_intents_checkoutSessionId_idx"
  ON "payment_intents" ("checkoutSessionId");
CREATE INDEX IF NOT EXISTS "payment_intents_status_idx"
  ON "payment_intents" ("status");
CREATE INDEX IF NOT EXISTS "payment_intents_provider_providerPaymentId_idx"
  ON "payment_intents" ("provider", "providerPaymentId");
