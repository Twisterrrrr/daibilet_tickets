-- OperatorStatus enum
DO $$ BEGIN
  CREATE TYPE "OperatorStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'SUSPENDED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Operator: status, archivedAt, archiveReason
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "status" "OperatorStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "archiveReason" TEXT;

-- SupplierRole: add CONTENT, ACCOUNTANT
DO $$ BEGIN
  ALTER TYPE "SupplierRole" ADD VALUE 'CONTENT';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "SupplierRole" ADD VALUE 'ACCOUNTANT';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- User (site accounts)
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "refreshTokenHash" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- UserFavorite
CREATE TABLE IF NOT EXISTS "user_favorites" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "eventSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_favorites_userId_eventSlug_key" ON "user_favorites"("userId", "eventSlug");
CREATE INDEX IF NOT EXISTS "user_favorites_userId_idx" ON "user_favorites"("userId");
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
