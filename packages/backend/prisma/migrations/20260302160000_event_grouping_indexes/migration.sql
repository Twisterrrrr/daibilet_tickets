-- Add indexes for EventGroup / multi-events queries
CREATE INDEX IF NOT EXISTS "events_groupingKey_cityId_idx" ON "events"("groupingKey", "cityId");
CREATE INDEX IF NOT EXISTS "event_sessions_eventId_startsAt_idx" ON "event_sessions"("eventId", "startsAt");
