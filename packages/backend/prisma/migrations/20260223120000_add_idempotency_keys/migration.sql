-- Ops Foundation Batch 1: Generic IdempotencyKey primitive
-- Идемпотентная миграция: проверяем существование перед созданием

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IdempotencyScope') THEN
    CREATE TYPE "IdempotencyScope" AS ENUM ('YOOKASSA_WEBHOOK', 'CHECKOUT_CREATE', 'EMAIL_SEND', 'EXTERNAL_CALLBACK');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "idempotency_keys" (
    "id" TEXT NOT NULL,
    "scope" "IdempotencyScope" NOT NULL,
    "key" TEXT NOT NULL,
    "entityId" UUID,
    "status" TEXT NOT NULL,
    "response" JSONB,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_keys_scope_key_key" ON "idempotency_keys"("scope", "key");
CREATE INDEX IF NOT EXISTS "idempotency_keys_expiresAt_idx" ON "idempotency_keys"("expiresAt");
CREATE INDEX IF NOT EXISTS "idempotency_keys_entityId_idx" ON "idempotency_keys"("entityId");
CREATE INDEX IF NOT EXISTS "idempotency_keys_status_idx" ON "idempotency_keys"("status");
