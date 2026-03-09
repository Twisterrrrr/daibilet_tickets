-- Add targetCitySlugs to promo_blocks for city targeting
ALTER TABLE "promo_blocks" ADD COLUMN IF NOT EXISTS "targetCitySlugs" TEXT[] NOT NULL DEFAULT '{}';
