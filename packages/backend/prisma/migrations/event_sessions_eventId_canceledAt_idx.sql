-- Index to speed up admin schedule queries filtering by eventId + canceledAt
-- Used by GET /admin/events/:id/sessions when includeCancelled=1 and for cancelledCount meta.

CREATE INDEX IF NOT EXISTS "event_sessions_eventId_canceledAt_idx"
  ON "event_sessions" ("eventId", "canceledAt");

