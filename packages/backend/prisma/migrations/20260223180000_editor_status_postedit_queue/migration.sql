-- EditorStatus enum + EventOverride queue fields (очередь постредакции для Directus)
-- Без изменения существующих данных: updatedBy делаем nullable для авто-созданных override из sync.

DO $$ BEGIN
  CREATE TYPE "EditorStatus" AS ENUM ('NEEDS_REVIEW', 'IN_PROGRESS', 'PUBLISHED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "event_overrides"
  ADD COLUMN IF NOT EXISTS "editor_status" "EditorStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
  ADD COLUMN IF NOT EXISTS "needs_review_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "last_imported_at" TIMESTAMPTZ;

-- Существующие override считаем уже опубликованными (не скрываем с сайта)
UPDATE "event_overrides" SET "editor_status" = 'PUBLISHED' WHERE "editor_status" = 'NEEDS_REVIEW' AND "updated_by" IS NOT NULL;

ALTER TABLE "event_overrides"
  ALTER COLUMN "updated_by" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "event_overrides_editor_status_needs_review_at_idx"
  ON "event_overrides" ("editor_status", "needs_review_at");
CREATE INDEX IF NOT EXISTS "event_overrides_last_imported_at_idx"
  ON "event_overrides" ("last_imported_at");
