-- AlterTable (idempotent: add column only if not exists)
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "venueId" UUID;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reviews_venueId_status_idx" ON "reviews"("venueId", "status");

-- AddForeignKey (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_venueId_fkey') THEN
    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- DropIndex (old unique)
DROP INDEX IF EXISTS "reviews_authorEmail_eventId_key";

-- CreateIndex (new unique)
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_authorEmail_eventId_venueId_key" ON "reviews"("authorEmail", "eventId", "venueId");
