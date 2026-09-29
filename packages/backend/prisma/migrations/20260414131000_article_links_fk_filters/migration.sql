-- Safe additive migration for link tables / FK filters.
-- Intentionally avoids destructive changes and legacy field removals.
-- NOTE: this migration duplicated `20260414130331_article_links_fk_filters` in history.
-- Keep it idempotent so fresh local databases can replay the full migration chain.

-- 1) LandingPage.filterTagId (FK to tags)
ALTER TABLE "landing_pages"
ADD COLUMN IF NOT EXISTS "filterTagId" UUID;

CREATE INDEX IF NOT EXISTS "landing_pages_filterTagId_idx" ON "landing_pages"("filterTagId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'landing_pages_filterTagId_fkey') THEN
    ALTER TABLE "landing_pages"
    ADD CONSTRAINT "landing_pages_filterTagId_fkey"
    FOREIGN KEY ("filterTagId") REFERENCES "tags"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 2) Article ↔ LandingPage links with position/priority
CREATE TABLE IF NOT EXISTS "article_landing_links" (
  "articleId" UUID NOT NULL,
  "landingId" UUID NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "article_landing_links_pkey" PRIMARY KEY ("articleId","landingId")
);

CREATE INDEX IF NOT EXISTS "article_landing_links_landingId_idx" ON "article_landing_links"("landingId");
CREATE INDEX IF NOT EXISTS "article_landing_links_articleId_position_idx" ON "article_landing_links"("articleId","position");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'article_landing_links_articleId_fkey') THEN
    ALTER TABLE "article_landing_links"
    ADD CONSTRAINT "article_landing_links_articleId_fkey"
    FOREIGN KEY ("articleId") REFERENCES "articles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'article_landing_links_landingId_fkey') THEN
    ALTER TABLE "article_landing_links"
    ADD CONSTRAINT "article_landing_links_landingId_fkey"
    FOREIGN KEY ("landingId") REFERENCES "landing_pages"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 3) Article ↔ Collection links with position/priority
CREATE TABLE IF NOT EXISTS "article_collection_links" (
  "articleId" UUID NOT NULL,
  "collectionId" UUID NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "article_collection_links_pkey" PRIMARY KEY ("articleId","collectionId")
);

CREATE INDEX IF NOT EXISTS "article_collection_links_collectionId_idx" ON "article_collection_links"("collectionId");
CREATE INDEX IF NOT EXISTS "article_collection_links_articleId_position_idx" ON "article_collection_links"("articleId","position");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'article_collection_links_articleId_fkey') THEN
    ALTER TABLE "article_collection_links"
    ADD CONSTRAINT "article_collection_links_articleId_fkey"
    FOREIGN KEY ("articleId") REFERENCES "articles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'article_collection_links_collectionId_fkey') THEN
    ALTER TABLE "article_collection_links"
    ADD CONSTRAINT "article_collection_links_collectionId_fkey"
    FOREIGN KEY ("collectionId") REFERENCES "collections"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 4) Collection ↔ Tag filters with position/priority
CREATE TABLE IF NOT EXISTS "collection_tag_filters" (
  "collectionId" UUID NOT NULL,
  "tagId" UUID NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "collection_tag_filters_pkey" PRIMARY KEY ("collectionId","tagId")
);

CREATE INDEX IF NOT EXISTS "collection_tag_filters_tagId_idx" ON "collection_tag_filters"("tagId");
CREATE INDEX IF NOT EXISTS "collection_tag_filters_collectionId_position_idx" ON "collection_tag_filters"("collectionId","position");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'collection_tag_filters_collectionId_fkey') THEN
    ALTER TABLE "collection_tag_filters"
    ADD CONSTRAINT "collection_tag_filters_collectionId_fkey"
    FOREIGN KEY ("collectionId") REFERENCES "collections"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'collection_tag_filters_tagId_fkey') THEN
    ALTER TABLE "collection_tag_filters"
    ADD CONSTRAINT "collection_tag_filters_tagId_fkey"
    FOREIGN KEY ("tagId") REFERENCES "tags"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
