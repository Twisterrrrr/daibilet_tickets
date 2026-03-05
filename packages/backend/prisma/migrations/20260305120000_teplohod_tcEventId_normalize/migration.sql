-- Normalize Teplohod tcEventId to pure digits
UPDATE "events"
SET "tcEventId" = regexp_replace("tcEventId", '.*?([0-9]+).*', '\1')
WHERE "source" = 'TEPLOHOD'
  AND "tcEventId" IS NOT NULL
  AND "tcEventId" ~ '[0-9]';

-- Optional: if any became empty (should not), null them
UPDATE "events"
SET "tcEventId" = NULL
WHERE "source" = 'TEPLOHOD'
  AND "tcEventId" = '';

