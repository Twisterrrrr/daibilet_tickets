-- ==============================================
-- Migration: EventAudience (replace KIDS category with audience attribute)
-- ==============================================

-- Step 1: Create EventAudience enum
DO $$ BEGIN
  CREATE TYPE "EventAudience" AS ENUM ('ALL', 'KIDS', 'FAMILY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Add audience column to events (default ALL)
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "audience" "EventAudience" NOT NULL DEFAULT 'ALL';

-- Step 3: Add audience column to event_overrides (nullable)
ALTER TABLE "event_overrides" ADD COLUMN IF NOT EXISTS "audience" "EventAudience";

-- Step 4-6: Migrate KIDS events → real categories + audience=KIDS
-- Wrapped in DO block: only run if 'KIDS' exists in EventCategory enum
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = '"EventCategory"'::regtype AND enumlabel = 'KIDS'
  ) THEN
    -- 4a: KIDS + KIDS_SHOW → EVENT + [SHOW] + KIDS
    UPDATE "events"
    SET category = 'EVENT',
        subcategories = ARRAY['SHOW']::"EventSubcategory"[],
        audience = 'KIDS'
    WHERE category = 'KIDS' AND 'KIDS_SHOW' = ANY(subcategories);

    -- 4b: KIDS + KIDS_EXCURSION → EXCURSION + [] + KIDS
    UPDATE "events"
    SET category = 'EXCURSION',
        subcategories = '{}'::"EventSubcategory"[],
        audience = 'KIDS'
    WHERE category = 'KIDS' AND 'KIDS_EXCURSION' = ANY(subcategories)
      AND audience != 'KIDS';

    -- 4c: KIDS + KIDS_MASTER → EVENT + [MASTERCLASS] + KIDS
    UPDATE "events"
    SET category = 'EVENT',
        subcategories = ARRAY['MASTERCLASS']::"EventSubcategory"[],
        audience = 'KIDS'
    WHERE category = 'KIDS' AND 'KIDS_MASTER' = ANY(subcategories)
      AND audience != 'KIDS';

    -- 4d: KIDS + KIDS_MUSEUM → MUSEUM + [MUSEUM_CLASSIC] + KIDS
    UPDATE "events"
    SET category = 'MUSEUM',
        subcategories = ARRAY['MUSEUM_CLASSIC']::"EventSubcategory"[],
        audience = 'KIDS'
    WHERE category = 'KIDS' AND 'KIDS_MUSEUM' = ANY(subcategories)
      AND audience != 'KIDS';

    -- 4e: KIDS + KIDS_QUEST → EXCURSION + [QUEST] + KIDS
    UPDATE "events"
    SET category = 'EXCURSION',
        subcategories = ARRAY['QUEST']::"EventSubcategory"[],
        audience = 'KIDS'
    WHERE category = 'KIDS' AND 'KIDS_QUEST' = ANY(subcategories)
      AND audience != 'KIDS';

    -- 4f: KIDS + KIDS_AMUSEMENT → EVENT + [SHOW] + KIDS
    UPDATE "events"
    SET category = 'EVENT',
        subcategories = ARRAY['SHOW']::"EventSubcategory"[],
        audience = 'KIDS'
    WHERE category = 'KIDS' AND 'KIDS_AMUSEMENT' = ANY(subcategories)
      AND audience != 'KIDS';

    -- 4g: Remaining KIDS without matching subcategories → EVENT + [] + KIDS
    UPDATE "events"
    SET category = 'EVENT',
        subcategories = '{}'::"EventSubcategory"[],
        audience = 'KIDS'
    WHERE category = 'KIDS';

    -- Step 5: Migrate event_overrides with KIDS category
    UPDATE "event_overrides"
    SET category = 'EVENT',
        audience = 'KIDS'
    WHERE category = 'KIDS';
  END IF;
END $$;

-- Step 6: Remove KIDS_* from subcategories arrays (safe: array_remove on non-existing is no-op)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'EventSubcategory' AND e.enumlabel = 'KIDS_SHOW'
  ) THEN
    UPDATE "events"
    SET subcategories = array_remove(
          array_remove(
            array_remove(
              array_remove(
                array_remove(
                  array_remove(subcategories, 'KIDS_SHOW'),
                'KIDS_EXCURSION'),
              'KIDS_MASTER'),
            'KIDS_MUSEUM'),
          'KIDS_QUEST'),
        'KIDS_AMUSEMENT')
    WHERE subcategories && ARRAY['KIDS_SHOW','KIDS_EXCURSION','KIDS_MASTER','KIDS_MUSEUM','KIDS_QUEST','KIDS_AMUSEMENT']::"EventSubcategory"[];

    UPDATE "event_overrides"
    SET subcategories = array_remove(
          array_remove(
            array_remove(
              array_remove(
                array_remove(
                  array_remove(subcategories, 'KIDS_SHOW'),
                'KIDS_EXCURSION'),
              'KIDS_MASTER'),
            'KIDS_MUSEUM'),
          'KIDS_QUEST'),
        'KIDS_AMUSEMENT')
    WHERE subcategories && ARRAY['KIDS_SHOW','KIDS_EXCURSION','KIDS_MASTER','KIDS_MUSEUM','KIDS_QUEST','KIDS_AMUSEMENT']::"EventSubcategory"[];
  END IF;
END $$;

-- Step 7: Remove old enum values (only if they still exist)
-- 7a: Drop default constraints before altering types
ALTER TABLE "events" ALTER COLUMN "subcategories" DROP DEFAULT;
ALTER TABLE "event_overrides" ALTER COLUMN "subcategories" DROP DEFAULT;

-- 7b: Remove KIDS from EventCategory (only if KIDS still present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = '"EventCategory"'::regtype AND enumlabel = 'KIDS'
  ) THEN
    ALTER TYPE "EventCategory" RENAME TO "EventCategory_old";
    CREATE TYPE "EventCategory" AS ENUM ('EXCURSION', 'MUSEUM', 'EVENT');
    ALTER TABLE "events" ALTER COLUMN "category" TYPE "EventCategory" USING "category"::text::"EventCategory";
    ALTER TABLE "event_overrides" ALTER COLUMN "category" TYPE "EventCategory" USING "category"::text::"EventCategory";
    DROP TYPE "EventCategory_old";
  END IF;
END $$;

-- 7c: Remove KIDS_* from EventSubcategory (only if they still present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'EventSubcategory' AND e.enumlabel = 'KIDS_SHOW'
  ) THEN
    ALTER TYPE "EventSubcategory" RENAME TO "EventSubcategory_old";
    CREATE TYPE "EventSubcategory" AS ENUM (
      'RIVER', 'WALKING', 'BUS', 'COMBINED', 'QUEST', 'GASTRO', 'ROOFTOP',
      'MUSEUM_CLASSIC', 'EXHIBITION', 'GALLERY', 'PALACE', 'PARK',
      'CONCERT', 'SHOW', 'STANDUP', 'THEATER', 'SPORT', 'FESTIVAL', 'MASTERCLASS', 'PARTY'
    );
    ALTER TABLE "events" ALTER COLUMN "subcategories" TYPE "EventSubcategory"[]
      USING "subcategories"::text[]::"EventSubcategory"[];
    ALTER TABLE "event_overrides" ALTER COLUMN "subcategories" TYPE "EventSubcategory"[]
      USING "subcategories"::text[]::"EventSubcategory"[];
    DROP TYPE "EventSubcategory_old";
  END IF;
END $$;

-- 7d: Restore defaults
ALTER TABLE "events" ALTER COLUMN "subcategories" SET DEFAULT '{}'::"EventSubcategory"[];
ALTER TABLE "event_overrides" ALTER COLUMN "subcategories" SET DEFAULT '{}'::"EventSubcategory"[];

-- Step 8: Add index on audience for filtering
CREATE INDEX IF NOT EXISTS "events_audience_idx" ON "events" ("audience");
