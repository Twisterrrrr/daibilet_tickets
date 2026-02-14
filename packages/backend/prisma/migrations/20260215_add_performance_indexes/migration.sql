-- Performance indexes
CREATE INDEX IF NOT EXISTS "events_venueId_idx" ON "events"("venueId");
CREATE INDEX IF NOT EXISTS "events_operatorId_idx" ON "events"("operatorId");
CREATE INDEX IF NOT EXISTS "packages_cityId_idx" ON "packages"("cityId");
CREATE INDEX IF NOT EXISTS "checkout_sessions_status_idx" ON "checkout_sessions"("status");
CREATE INDEX IF NOT EXISTS "order_requests_status_idx" ON "order_requests"("status");
CREATE INDEX IF NOT EXISTS "support_tickets_assignedTo_idx" ON "support_tickets"("assignedTo");
