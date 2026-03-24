-- Unified subcategory core: dictionary + Event/Venue M:N links

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubcategoryType') THEN
    CREATE TYPE "SubcategoryType" AS ENUM ('UNIVERSAL', 'EVENT_ONLY', 'VENUE_ONLY');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "subcategories" (
  "id" UUID NOT NULL,
  "slug" TEXT NOT NULL,
  "nameRu" TEXT NOT NULL,
  "type" "SubcategoryType" NOT NULL DEFAULT 'UNIVERSAL',
  "parentId" UUID,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isLandingEnabled" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "event_subcategory_links" (
  "eventId" UUID NOT NULL,
  "subcategoryId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_subcategory_links_pkey" PRIMARY KEY ("eventId", "subcategoryId")
);

CREATE TABLE IF NOT EXISTS "venue_subcategory_links" (
  "venueId" UUID NOT NULL,
  "subcategoryId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "venue_subcategory_links_pkey" PRIMARY KEY ("venueId", "subcategoryId")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subcategories_slug_key" ON "subcategories"("slug");
CREATE INDEX IF NOT EXISTS "subcategories_type_isActive_idx" ON "subcategories"("type", "isActive");
CREATE INDEX IF NOT EXISTS "subcategories_parentId_idx" ON "subcategories"("parentId");
CREATE INDEX IF NOT EXISTS "subcategories_isLandingEnabled_idx" ON "subcategories"("isLandingEnabled");
CREATE INDEX IF NOT EXISTS "event_subcategory_links_subcategoryId_idx" ON "event_subcategory_links"("subcategoryId");
CREATE INDEX IF NOT EXISTS "venue_subcategory_links_subcategoryId_idx" ON "venue_subcategory_links"("subcategoryId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subcategories_parentId_fkey') THEN
    ALTER TABLE "subcategories"
      ADD CONSTRAINT "subcategories_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "subcategories"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_subcategory_links_eventId_fkey') THEN
    ALTER TABLE "event_subcategory_links"
      ADD CONSTRAINT "event_subcategory_links_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "events"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_subcategory_links_subcategoryId_fkey') THEN
    ALTER TABLE "event_subcategory_links"
      ADD CONSTRAINT "event_subcategory_links_subcategoryId_fkey"
      FOREIGN KEY ("subcategoryId") REFERENCES "subcategories"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'venue_subcategory_links_venueId_fkey') THEN
    ALTER TABLE "venue_subcategory_links"
      ADD CONSTRAINT "venue_subcategory_links_venueId_fkey"
      FOREIGN KEY ("venueId") REFERENCES "venues"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'venue_subcategory_links_subcategoryId_fkey') THEN
    ALTER TABLE "venue_subcategory_links"
      ADD CONSTRAINT "venue_subcategory_links_subcategoryId_fkey"
      FOREIGN KEY ("subcategoryId") REFERENCES "subcategories"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
