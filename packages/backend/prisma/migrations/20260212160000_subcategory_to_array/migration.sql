-- AlterTable: convert subcategory (single enum) to subcategories (array of enums)
-- with data preservation

-- Step 1: Add new column subcategories as array
ALTER TABLE "events" ADD COLUMN "subcategories" "EventSubcategory"[] DEFAULT ARRAY[]::"EventSubcategory"[];

-- Step 2: Migrate existing data
UPDATE "events" SET "subcategories" = ARRAY["subcategory"]::"EventSubcategory"[] WHERE "subcategory" IS NOT NULL;

-- Step 3: Drop old column
ALTER TABLE "events" DROP COLUMN "subcategory";

-- Same for event_overrides
ALTER TABLE "event_overrides" ADD COLUMN "subcategories" "EventSubcategory"[] DEFAULT ARRAY[]::"EventSubcategory"[];
UPDATE "event_overrides" SET "subcategories" = ARRAY["subcategory"]::"EventSubcategory"[] WHERE "subcategory" IS NOT NULL;
ALTER TABLE "event_overrides" DROP COLUMN "subcategory";
