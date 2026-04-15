-- Hub intent: city catalog hub + venue page mode (no separate Hub table).

CREATE TYPE "CityCatalogHubStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DISABLED');

CREATE TYPE "VenuePageMode" AS ENUM ('NONE', 'BASIC', 'HUB');

ALTER TABLE "cities" ADD COLUMN "isCatalogHub" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "cities" ADD COLUMN "catalogHubStatus" "CityCatalogHubStatus" NOT NULL DEFAULT 'DISABLED';

ALTER TABLE "venues" ADD COLUMN "venue_page_mode" "VenuePageMode" NOT NULL DEFAULT 'NONE';
