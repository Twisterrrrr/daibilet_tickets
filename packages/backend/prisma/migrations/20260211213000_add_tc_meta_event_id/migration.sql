-- AlterTable
ALTER TABLE "events" ADD COLUMN     "tcMetaEventId" TEXT;

-- CreateIndex
CREATE INDEX "events_tcMetaEventId_idx" ON "events"("tcMetaEventId");
