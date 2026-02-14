-- AlterTable
ALTER TABLE "reviews" ADD COLUMN "venueId" UUID;

-- CreateIndex
CREATE INDEX "reviews_venueId_status_idx" ON "reviews"("venueId", "status");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropIndex (old unique)
DROP INDEX IF EXISTS "reviews_authorEmail_eventId_key";

-- CreateIndex (new unique)
CREATE UNIQUE INDEX "reviews_authorEmail_eventId_venueId_key" ON "reviews"("authorEmail", "eventId", "venueId");
