-- Гастро-фасеты для событий (ужин на теплоходе / таблица сравнения)
-- Таблица: @@map("events") у model Event — не "Event".
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "vesselName" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "menuKind" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "menuSummary" VARCHAR(500);
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "experienceFormat" TEXT;
