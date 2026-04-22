-- Article lifecycle + связи с лендингами/подборками (вместо isPublished/isDeleted)

CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

ALTER TABLE "articles" ADD COLUMN "status" "ArticleStatus";

UPDATE "articles"
SET "status" = CASE
  WHEN "isDeleted" = true THEN 'ARCHIVED'::"ArticleStatus"
  WHEN "isPublished" = true THEN 'PUBLISHED'::"ArticleStatus"
  ELSE 'DRAFT'::"ArticleStatus"
END;

ALTER TABLE "articles" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "articles" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"ArticleStatus";

ALTER TABLE "articles" ADD COLUMN "relatedLandingIds" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];
ALTER TABLE "articles" ADD COLUMN "relatedCollectionIds" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];

ALTER TABLE "articles" DROP COLUMN "isPublished";
ALTER TABLE "articles" DROP COLUMN "isDeleted";
ALTER TABLE "articles" DROP COLUMN "deletedAt";

CREATE INDEX "articles_status_idx" ON "articles"("status");
