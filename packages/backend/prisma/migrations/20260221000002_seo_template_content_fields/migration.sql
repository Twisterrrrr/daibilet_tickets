-- AlterTable SeoTemplate: replace template with titleTpl, h1Tpl, descriptionTpl, bodyTpl, priority
ALTER TABLE "seo_templates" ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "seo_templates" ADD COLUMN IF NOT EXISTS "titleTpl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "seo_templates" ADD COLUMN IF NOT EXISTS "h1Tpl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "seo_templates" ADD COLUMN IF NOT EXISTS "descriptionTpl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "seo_templates" ADD COLUMN IF NOT EXISTS "bodyTpl" TEXT NOT NULL DEFAULT '';

-- Copy template → bodyTpl for existing rows (before dropping)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seo_templates' AND column_name = 'template') THEN
    UPDATE "seo_templates" SET "bodyTpl" = COALESCE("template", '') WHERE "template" IS NOT NULL;
    ALTER TABLE "seo_templates" DROP COLUMN "template";
  END IF;
END $$;

-- AlterTable SeoContent: add noindex, canonicalUrl, relatedLinksJson
ALTER TABLE "seo_contents" ADD COLUMN IF NOT EXISTS "noindex" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "seo_contents" ADD COLUMN IF NOT EXISTS "canonicalUrl" TEXT;
ALTER TABLE "seo_contents" ADD COLUMN IF NOT EXISTS "relatedLinksJson" JSONB;
