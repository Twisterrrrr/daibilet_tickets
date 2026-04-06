-- SubcategoryLayer + code; уникальность (code, type) для раздельных EVENT_ONLY / VENUE_ONLY строк с одинаковым семантическим кодом.

CREATE TYPE "SubcategoryLayer" AS ENUM ('PRIMARY', 'SECONDARY');

ALTER TABLE "subcategories" ADD COLUMN "layer" "SubcategoryLayer" NOT NULL DEFAULT 'SECONDARY';
ALTER TABLE "subcategories" ADD COLUMN "code" TEXT;

UPDATE "subcategories" SET "code" = UPPER(REPLACE("slug", '-', '_'));

UPDATE "subcategories" SET "code" = 'MUSEUM_CLASSIC' WHERE "slug" = 'museum';
UPDATE "subcategories" SET "code" = 'MUSEUM' WHERE "slug" = 'museum-venue';
UPDATE "subcategories" SET "code" = 'FAMILY' WHERE "slug" = 'family-friendly';
UPDATE "subcategories" SET "code" = 'PALACE' WHERE "slug" = 'palace-estate';
UPDATE "subcategories" SET "code" = 'PARK' WHERE "slug" = 'park-reserve';
UPDATE "subcategories" SET "code" = 'RIVER' WHERE "slug" = 'river-excursion';
UPDATE "subcategories" SET "code" = 'WALKING' WHERE "slug" = 'walking-excursion';
UPDATE "subcategories" SET "code" = 'BUS' WHERE "slug" = 'bus-excursion';
UPDATE "subcategories" SET "code" = 'COMBINED' WHERE "slug" = 'combined-excursion';
UPDATE "subcategories" SET "code" = 'QUEST' WHERE "slug" = 'quest-excursion';
UPDATE "subcategories" SET "code" = 'GASTRO' WHERE "slug" = 'gastro-excursion';
UPDATE "subcategories" SET "code" = 'ROOFTOP' WHERE "slug" = 'rooftop';
UPDATE "subcategories" SET "code" = 'EXTREME' WHERE "slug" = 'extreme';
UPDATE "subcategories" SET "code" = 'EXHIBITION' WHERE "slug" = 'exhibition';
UPDATE "subcategories" SET "code" = 'GALLERY' WHERE "slug" = 'gallery';
UPDATE "subcategories" SET "code" = 'ART_SPACE' WHERE "slug" = 'art-space';
UPDATE "subcategories" SET "code" = 'CONCERT' WHERE "slug" = 'concert';
UPDATE "subcategories" SET "code" = 'SHOW' WHERE "slug" = 'show';
UPDATE "subcategories" SET "code" = 'STANDUP' WHERE "slug" = 'standup';
UPDATE "subcategories" SET "code" = 'THEATER' WHERE "slug" = 'theater';
UPDATE "subcategories" SET "code" = 'SPORT' WHERE "slug" = 'sport';
UPDATE "subcategories" SET "code" = 'FESTIVAL' WHERE "slug" = 'festival';
UPDATE "subcategories" SET "code" = 'MASTERCLASS' WHERE "slug" = 'masterclass';
UPDATE "subcategories" SET "code" = 'PARTY' WHERE "slug" = 'party';
UPDATE "subcategories" SET "code" = 'GALLERY' WHERE "slug" = 'gallery-venue';
UPDATE "subcategories" SET "code" = 'THEATER' WHERE "slug" = 'theater-venue';

ALTER TABLE "subcategories" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX "subcategories_code_type_key" ON "subcategories"("code", "type");
CREATE INDEX "subcategories_type_layer_isActive_idx" ON "subcategories"("type", "layer", "isActive");
