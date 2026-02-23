-- AlterTable events: add updatedById (аудит кто последний обновил)
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "updatedById" UUID;
