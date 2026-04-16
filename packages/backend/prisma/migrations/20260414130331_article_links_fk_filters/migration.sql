-- Safe additive migration for link tables / FK filters.
-- Intentionally avoids destructive changes and legacy field removals.

-- 1) LandingPage.filterTagId (FK to tags)
ALTER TABLE "landing_pages"
ADD COLUMN "filterTagId" UUID;

CREATE INDEX "landing_pages_filterTagId_idx" ON "landing_pages"("filterTagId");

ALTER TABLE "landing_pages"
ADD CONSTRAINT "landing_pages_filterTagId_fkey"
FOREIGN KEY ("filterTagId") REFERENCES "tags"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- 2) Article ↔ LandingPage links with position/priority
CREATE TABLE "article_landing_links" (
  "articleId" UUID NOT NULL,
  "landingId" UUID NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "article_landing_links_pkey" PRIMARY KEY ("articleId","landingId")
);

CREATE INDEX "article_landing_links_landingId_idx" ON "article_landing_links"("landingId");
CREATE INDEX "article_landing_links_articleId_position_idx" ON "article_landing_links"("articleId","position");

ALTER TABLE "article_landing_links"
ADD CONSTRAINT "article_landing_links_articleId_fkey"
FOREIGN KEY ("articleId") REFERENCES "articles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "article_landing_links"
ADD CONSTRAINT "article_landing_links_landingId_fkey"
FOREIGN KEY ("landingId") REFERENCES "landing_pages"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- 3) Article ↔ Collection links with position/priority
CREATE TABLE "article_collection_links" (
  "articleId" UUID NOT NULL,
  "collectionId" UUID NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "article_collection_links_pkey" PRIMARY KEY ("articleId","collectionId")
);

CREATE INDEX "article_collection_links_collectionId_idx" ON "article_collection_links"("collectionId");
CREATE INDEX "article_collection_links_articleId_position_idx" ON "article_collection_links"("articleId","position");

ALTER TABLE "article_collection_links"
ADD CONSTRAINT "article_collection_links_articleId_fkey"
FOREIGN KEY ("articleId") REFERENCES "articles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "article_collection_links"
ADD CONSTRAINT "article_collection_links_collectionId_fkey"
FOREIGN KEY ("collectionId") REFERENCES "collections"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- 4) Collection ↔ Tag filters with position/priority
CREATE TABLE "collection_tag_filters" (
  "collectionId" UUID NOT NULL,
  "tagId" UUID NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "collection_tag_filters_pkey" PRIMARY KEY ("collectionId","tagId")
);

CREATE INDEX "collection_tag_filters_tagId_idx" ON "collection_tag_filters"("tagId");
CREATE INDEX "collection_tag_filters_collectionId_position_idx" ON "collection_tag_filters"("collectionId","position");

ALTER TABLE "collection_tag_filters"
ADD CONSTRAINT "collection_tag_filters_collectionId_fkey"
FOREIGN KEY ("collectionId") REFERENCES "collections"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "collection_tag_filters"
ADD CONSTRAINT "collection_tag_filters_tagId_fkey"
FOREIGN KEY ("tagId") REFERENCES "tags"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

