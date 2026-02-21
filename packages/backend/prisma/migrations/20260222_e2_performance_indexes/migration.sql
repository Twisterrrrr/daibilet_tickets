-- E2 — Индексы под /events, /catalog, /venues, admin list
-- idempotent: IF NOT EXISTS

CREATE INDEX IF NOT EXISTS "events_catalog_idx" ON "events"("cityId", "isActive", "isDeleted") WHERE "isDeleted" = false;
CREATE INDEX IF NOT EXISTS "events_admin_list_idx" ON "events"("updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "event_sessions_active_starts_idx" ON "event_sessions"("startsAt") WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS "venues_city_active_idx" ON "venues"("cityId", "isActive") WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS "processed_webhook_events_processed_at_idx" ON "processed_webhook_events"("processedAt");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("createdAt");
