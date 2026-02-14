-- CreateIndex
CREATE INDEX IF NOT EXISTS "events_venueId_idx" ON "events"("venueId");

-- CreateIndex  
CREATE INDEX IF NOT EXISTS "events_operatorId_idx" ON "events"("operatorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "packages_cityId_idx" ON "packages"("cityId");
