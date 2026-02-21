-- Add templateData to event_overrides for category-specific fields (excursions: route, menu, shipName; events: program, cast, hall)
ALTER TABLE "event_overrides" ADD COLUMN IF NOT EXISTS "templateData" JSONB;
