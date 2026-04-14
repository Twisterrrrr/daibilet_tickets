-- CollectionItem + queryConfig + publishedAt; enum AUTO

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CollectionSourceType') THEN
    BEGIN
      ALTER TYPE "CollectionSourceType" ADD VALUE IF NOT EXISTS 'AUTO' AFTER 'MANUAL';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

ALTER TABLE "collections"
  ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "queryConfig" JSONB;

CREATE TABLE IF NOT EXISTS "collection_items" (
    "id" UUID NOT NULL,
    "collectionId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isExcluded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "collection_items_collectionId_eventId_key" ON "collection_items"("collectionId", "eventId");
CREATE INDEX IF NOT EXISTS "collection_items_collectionId_sortOrder_idx" ON "collection_items"("collectionId", "sortOrder");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'collection_items_collectionId_fkey'
  ) THEN
    ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collectionId_fkey"
      FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'collection_items_eventId_fkey'
  ) THEN
    ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Однократный backfill из legacy pinnedEventIds (порядок = sortOrder)
INSERT INTO "collection_items" ("id", "collectionId", "eventId", "sortOrder", "isPinned", "isExcluded", "createdAt")
SELECT gen_random_uuid(), c."id", x.eid::uuid, (x.ord - 1)::int, true, false, CURRENT_TIMESTAMP
FROM "collections" c
CROSS JOIN LATERAL unnest(c."pinnedEventIds") WITH ORDINALITY AS x(eid, ord)
WHERE COALESCE(array_length(c."pinnedEventIds", 1), 0) > 0
  AND NOT EXISTS (
    SELECT 1 FROM "collection_items" ci
    WHERE ci."collectionId" = c."id" AND ci."eventId" = x.eid::uuid
  );
