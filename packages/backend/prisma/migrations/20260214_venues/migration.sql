-- ==========================================
-- Музеи и Арт: Venue model + DateMode + подкатегории
-- Идемпотентная миграция
-- ==========================================

-- 1. Новые enum: VenueType
DO $$ BEGIN
  CREATE TYPE "VenueType" AS ENUM ('MUSEUM', 'GALLERY', 'ART_SPACE', 'EXHIBITION_HALL', 'THEATER', 'PALACE', 'PARK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Новый enum: DateMode
DO $$ BEGIN
  CREATE TYPE "DateMode" AS ENUM ('SCHEDULED', 'OPEN_DATE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Новые подкатегории в EventSubcategory
DO $$
DECLARE
  current_values TEXT[];
BEGIN
  SELECT enum_range(NULL::"EventSubcategory")::TEXT[] INTO current_values;
  IF NOT 'ART_SPACE' = ANY(current_values) THEN
    ALTER TYPE "EventSubcategory" ADD VALUE IF NOT EXISTS 'ART_SPACE';
  END IF;
  IF NOT 'SCULPTURE' = ANY(current_values) THEN
    ALTER TYPE "EventSubcategory" ADD VALUE IF NOT EXISTS 'SCULPTURE';
  END IF;
  IF NOT 'CONTEMPORARY' = ANY(current_values) THEN
    ALTER TYPE "EventSubcategory" ADD VALUE IF NOT EXISTS 'CONTEMPORARY';
  END IF;
END $$;

-- 4. Создание таблицы venues
CREATE TABLE IF NOT EXISTS "venues" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "cityId"           UUID NOT NULL REFERENCES "cities"("id"),
  "slug"             TEXT NOT NULL UNIQUE,
  "title"            TEXT NOT NULL,
  "shortTitle"       TEXT,
  "venueType"        "VenueType" NOT NULL,
  "description"      TEXT,
  "shortDescription" TEXT,
  "imageUrl"         TEXT,
  "galleryUrls"      TEXT[] NOT NULL DEFAULT '{}',
  "address"          TEXT,
  "lat"              DOUBLE PRECISION,
  "lng"              DOUBLE PRECISION,
  "metro"            TEXT,
  "district"         TEXT,
  "phone"            TEXT,
  "email"            TEXT,
  "website"          TEXT,
  "openingHours"     JSONB,
  "priceFrom"        INTEGER,
  "rating"           DECIMAL(2,1) NOT NULL DEFAULT 0,
  "reviewCount"      INTEGER NOT NULL DEFAULT 0,
  "externalRating"   DECIMAL(2,1),
  "externalSource"   TEXT,
  "operatorId"       UUID REFERENCES "operators"("id"),
  "isActive"         BOOLEAN NOT NULL DEFAULT true,
  "isFeatured"       BOOLEAN NOT NULL DEFAULT false,
  "isDeleted"        BOOLEAN NOT NULL DEFAULT false,
  "deletedAt"        TIMESTAMPTZ,
  "metaTitle"        TEXT,
  "metaDescription"  TEXT,
  "version"          INTEGER NOT NULL DEFAULT 0,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "venues_cityId_idx" ON "venues" ("cityId");
CREATE INDEX IF NOT EXISTS "venues_venueType_idx" ON "venues" ("venueType");
CREATE INDEX IF NOT EXISTS "venues_slug_idx" ON "venues" ("slug");

-- 5. Расширение events: venueId, dateMode, isPermanent, endDate
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "venueId" UUID REFERENCES "venues"("id");
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "dateMode" "DateMode" NOT NULL DEFAULT 'SCHEDULED';
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "isPermanent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "events_venueId_idx" ON "events" ("venueId");
CREATE INDEX IF NOT EXISTS "events_dateMode_idx" ON "events" ("dateMode");

-- 6. Расширение event_offers: venueId
ALTER TABLE "event_offers" ADD COLUMN IF NOT EXISTS "venueId" UUID REFERENCES "venues"("id");
CREATE INDEX IF NOT EXISTS "event_offers_venueId_idx" ON "event_offers" ("venueId");

-- ==========================================
-- Verify
-- ==========================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venues') THEN
    RAISE EXCEPTION 'Таблица venues не создана';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'venueId') THEN
    RAISE EXCEPTION 'Колонка events.venueId не создана';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'dateMode') THEN
    RAISE EXCEPTION 'Колонка events.dateMode не создана';
  END IF;
END $$;

-- ==========================================
-- Venue: conversion page fields (из venue_conversion)
-- highlights (JSON), faq (JSON), features (text[]), commissionRate (decimal)
-- ==========================================

DO $$ BEGIN
  ALTER TABLE venues ADD COLUMN highlights JSONB;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE venues ADD COLUMN faq JSONB;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE venues ADD COLUMN features TEXT[] DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE venues ADD COLUMN commissionRate DECIMAL(4,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
