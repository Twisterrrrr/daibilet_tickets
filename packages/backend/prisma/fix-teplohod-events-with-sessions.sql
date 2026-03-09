-- Одноразовый фикс: события TEPLOHOD с активными сеансами должны быть isActive=true.
-- Применять вручную: psql -f fix-teplohod-events-with-sessions.sql
-- или: npx prisma db execute --file prisma/fix-teplohod-events-with-sessions.sql

UPDATE events
SET "isActive" = true
WHERE id IN (
  SELECT DISTINCT "eventId"
  FROM event_sessions
  WHERE "canceledAt" IS NULL
    AND "startsAt" > NOW()
    AND "isActive" = true
)
AND source = 'TEPLOHOD'
AND "isActive" = false;
