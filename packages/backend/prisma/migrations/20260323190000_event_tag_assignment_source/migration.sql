DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'EventTagAssignmentSource'
  ) THEN
    CREATE TYPE "EventTagAssignmentSource" AS ENUM ('MANUAL_ADMIN', 'IMPORT_MAPPED', 'AUTO_RULE');
  END IF;
END $$;

ALTER TABLE "event_tags"
ADD COLUMN IF NOT EXISTS "assignmentSource" "EventTagAssignmentSource";

CREATE INDEX IF NOT EXISTS "event_tags_assignmentSource_idx" ON "event_tags"("assignmentSource");
