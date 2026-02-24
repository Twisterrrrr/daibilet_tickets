-- Event quality fields + subcategories semantics for overrides
-- Качество события (qualityStatus / qualityIssues / qualityCheckedAt)
-- и явная семантика "clear" для subcategories (subcategories_clear).

ALTER TABLE "event_overrides"
  ADD COLUMN IF NOT EXISTS "qualityStatus" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "qualityIssues" JSONB NULL,
  ADD COLUMN IF NOT EXISTS "qualityCheckedAt" TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS "subcategoriesMode" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "subcategoriesOverride" "EventSubcategory"[] NOT NULL DEFAULT '{}';

