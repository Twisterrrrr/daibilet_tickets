-- CreateTable: seo_templates
CREATE TABLE IF NOT EXISTS "seo_templates" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "template" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "seo_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "seo_templates_type_level_key" ON "seo_templates"("type", "level");

-- CreateTable: seo_contents
CREATE TABLE IF NOT EXISTS "seo_contents" (
    "id" TEXT NOT NULL,
    "cityId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "filtersKey" TEXT,
    "title" TEXT NOT NULL,
    "h1" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_contents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "seo_contents_cityId_type_filtersKey_key" ON "seo_contents"("cityId", "type", "filtersKey");
CREATE INDEX IF NOT EXISTS "seo_contents_cityId_idx" ON "seo_contents"("cityId");

ALTER TABLE "seo_contents" ADD CONSTRAINT "seo_contents_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
