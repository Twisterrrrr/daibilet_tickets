-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CreatedByType') THEN
    CREATE TYPE "CreatedByType" AS ENUM ('ADMIN','SUPPLIER','IMPORT');
  END IF;
END$$;

-- AlterTable events: add createdByType, createdById
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "createdByType" "CreatedByType";
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "createdById" UUID;

-- Backfill: events from sync -> IMPORT
UPDATE "events" SET "createdByType" = 'IMPORT' WHERE "createdByType" IS NULL;

-- Set default for new rows
ALTER TABLE "events" ALTER COLUMN "createdByType" SET DEFAULT 'IMPORT';

-- AlterTable venues: add createdByType, createdById
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "createdByType" "CreatedByType";
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "createdById" UUID;

-- Backfill: venues -> ADMIN
UPDATE "venues" SET "createdByType" = 'ADMIN' WHERE "createdByType" IS NULL;

-- Set default for new rows
ALTER TABLE "venues" ALTER COLUMN "createdByType" SET DEFAULT 'ADMIN';
