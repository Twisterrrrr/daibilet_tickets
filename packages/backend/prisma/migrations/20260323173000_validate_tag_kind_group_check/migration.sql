DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tag_kind_group_check'
      AND convalidated = false
  ) THEN
    ALTER TABLE "tags" VALIDATE CONSTRAINT tag_kind_group_check;
  END IF;
END $$;

