-- TagKind / StructuralTagGroup foundation (STRUCTURAL + POPULAR tags)
-- This migration is additive and keeps existing TagCategory/tag behavior intact.

-- CreateEnum
CREATE TYPE "TagKind" AS ENUM ('STRUCTURAL', 'POPULAR');

-- CreateEnum
CREATE TYPE "StructuralTagGroup" AS ENUM ('THEME', 'AUDIENCE', 'FORMAT');

-- AlterTable
ALTER TABLE "tags"
ADD COLUMN     "nameEn" TEXT,
ADD COLUMN     "code" TEXT,
ADD COLUMN     "tagKind" "TagKind",
ADD COLUMN     "structuralGroup" "StructuralTagGroup",
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "tags_code_key" ON "tags"("code");

-- CreateIndex
CREATE INDEX "tags_tagKind_idx" ON "tags"("tagKind");

-- CreateIndex
CREATE INDEX "tags_structuralGroup_idx" ON "tags"("structuralGroup");

-- AlterTable
ALTER TABLE "event_tags"
ADD COLUMN     "assignedBy" UUID,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

