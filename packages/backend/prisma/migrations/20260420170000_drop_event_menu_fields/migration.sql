-- Drop deprecated гастро-поля из событий.
-- `menuKind` / `menuSummary` перенесены в `EventOverride.contentTemplateData.catering`.
-- Таблица: model Event @@map("events").

ALTER TABLE "events" DROP COLUMN IF EXISTS "menuKind";
ALTER TABLE "events" DROP COLUMN IF EXISTS "menuSummary";

