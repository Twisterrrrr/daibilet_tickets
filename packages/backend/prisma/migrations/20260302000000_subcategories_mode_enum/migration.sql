-- SubcategoriesMode enum for EventOverride.subcategoriesMode
-- Конвертация TEXT -> ENUM с дефолтом INHERIT и NOT NULL.

DO $$ BEGIN
  CREATE TYPE "SubcategoriesMode" AS ENUM ('INHERIT', 'OVERRIDE', 'CLEAR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "event_overrides"
  ALTER COLUMN "subcategoriesMode"
  TYPE "SubcategoriesMode"
  USING (
    CASE
      WHEN "subcategoriesMode" IS NULL THEN 'INHERIT'::"SubcategoriesMode"
      WHEN "subcategoriesMode" IN ('INHERIT', 'OVERRIDE', 'CLEAR')
        THEN "subcategoriesMode"::"SubcategoriesMode"
      ELSE 'INHERIT'::"SubcategoriesMode"
    END
  );

ALTER TABLE "event_overrides"
  ALTER COLUMN "subcategoriesMode" SET DEFAULT 'INHERIT',
  ALTER COLUMN "subcategoriesMode" SET NOT NULL;

