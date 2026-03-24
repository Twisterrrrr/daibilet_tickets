-- Catalog guard: list filters + venue/city joins
CREATE INDEX IF NOT EXISTS "events_isActive_category_idx" ON "events" ("isActive", "category");

CREATE INDEX IF NOT EXISTS "events_venueId_cityId_idx" ON "events" ("venueId", "cityId");
