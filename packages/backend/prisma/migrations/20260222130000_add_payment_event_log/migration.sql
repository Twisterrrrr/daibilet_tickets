-- PaymentEventLog: raw webhook log (accept & log, idempotent)
CREATE TABLE IF NOT EXISTS "payment_event_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "provider" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_event_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_event_logs_provider_eventType_paymentId_key"
  ON "payment_event_logs"("provider", "eventType", "paymentId");

CREATE INDEX IF NOT EXISTS "payment_event_logs_provider_eventType_idx"
  ON "payment_event_logs"("provider", "eventType");
