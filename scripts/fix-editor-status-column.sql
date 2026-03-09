-- Fix: event_overrides camelCase columns -> snake_case for Prisma @map
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='event_overrides' AND column_name='editorStatus')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='event_overrides' AND column_name='editor_status')
  THEN
    ALTER TABLE event_overrides RENAME COLUMN "editorStatus" TO "editor_status";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='event_overrides' AND column_name='needsReviewAt')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='event_overrides' AND column_name='needs_review_at')
  THEN
    ALTER TABLE event_overrides RENAME COLUMN "needsReviewAt" TO "needs_review_at";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='event_overrides' AND column_name='lastImportedAt')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='event_overrides' AND column_name='last_imported_at')
  THEN
    ALTER TABLE event_overrides RENAME COLUMN "lastImportedAt" TO "last_imported_at";
  END IF;
END$$;
