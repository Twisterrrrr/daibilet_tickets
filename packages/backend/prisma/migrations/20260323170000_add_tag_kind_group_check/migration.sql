DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tag_kind_group_check'
  ) THEN
    ALTER TABLE "tags"
    ADD CONSTRAINT tag_kind_group_check
    CHECK (
      ("tagKind" = 'STRUCTURAL' AND "structuralGroup" IS NOT NULL)
      OR
      ("tagKind" = 'POPULAR' AND "structuralGroup" IS NULL)
    ) NOT VALID;
  END IF;
END $$;

