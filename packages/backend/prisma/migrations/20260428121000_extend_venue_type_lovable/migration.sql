-- Extend VenueType enum for Lovable Admin UI alignment (additive, non-destructive)

DO $$
BEGIN
  ALTER TYPE "VenueType" ADD VALUE 'PIER';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "VenueType" ADD VALUE 'CONCERT_HALL';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "VenueType" ADD VALUE 'VIEWPOINT';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "VenueType" ADD VALUE 'HISTORIC_BUILDING';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "VenueType" ADD VALUE 'RESTAURANT_BAR';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "VenueType" ADD VALUE 'SPORTS';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "VenueType" ADD VALUE 'AQUARIUM_ZOO';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "VenueType" ADD VALUE 'ESCAPE_ROOM';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "VenueType" ADD VALUE 'OPEN_AIR';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "VenueType" ADD VALUE 'OTHER';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

