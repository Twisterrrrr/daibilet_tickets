-- ==========================================
-- Partner B2B API: ApiKey + webhook поля
-- Идемпотентная миграция
-- ==========================================

-- Webhook поля на operators
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "webhookUrl" TEXT;
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "webhookSecret" TEXT;

-- API Keys
CREATE TABLE IF NOT EXISTS "api_keys" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "operatorId"  UUID NOT NULL REFERENCES "operators"("id"),
  "keyHash"     TEXT NOT NULL UNIQUE,
  "prefix"      TEXT NOT NULL,
  "name"        TEXT NOT NULL DEFAULT 'default',
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "expiresAt"   TIMESTAMPTZ,
  "lastUsedAt"  TIMESTAMPTZ,
  "rateLimit"   INTEGER NOT NULL DEFAULT 100,
  "ipWhitelist" TEXT[] NOT NULL DEFAULT '{}',
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "api_keys_operatorId_idx" ON "api_keys" ("operatorId");
