-- Доп. JSON для сезонных лендингов (точки обзора, советы) — редактируется из админки
ALTER TABLE "landing_pages" ADD COLUMN IF NOT EXISTS "seasonalPayload" JSONB;
