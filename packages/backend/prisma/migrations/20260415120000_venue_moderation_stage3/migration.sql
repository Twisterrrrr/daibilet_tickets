-- Venue moderation Stage 3: decision history, signals, analytics foundation

CREATE TYPE "VenueModerationAction" AS ENUM ('APPROVE', 'REJECT', 'MERGE');

CREATE TYPE "VenueModerationReasonCode" AS ENUM (
  'BAD_SOURCE_DATA',
  'DUPLICATE_NOT_CONFIRMED',
  'WRONG_CITY',
  'WRONG_ADDRESS',
  'SPAM',
  'IRRELEVANT',
  'OTHER'
);

CREATE TABLE "venue_moderation_decisions" (
    "id" TEXT NOT NULL,
    "venueId" UUID NOT NULL,
    "action" "VenueModerationAction" NOT NULL,
    "reasonCode" "VenueModerationReasonCode",
    "reasonText" TEXT,
    "actorAdminId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "venue_moderation_decisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "venue_moderation_decisions_venueId_idx" ON "venue_moderation_decisions"("venueId");
CREATE INDEX "venue_moderation_decisions_createdAt_idx" ON "venue_moderation_decisions"("createdAt");
CREATE INDEX "venue_moderation_decisions_actorAdminId_idx" ON "venue_moderation_decisions"("actorAdminId");

ALTER TABLE "venue_moderation_decisions" ADD CONSTRAINT "venue_moderation_decisions_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "venue_moderation_decisions" ADD CONSTRAINT "venue_moderation_decisions_actorAdminId_fkey" FOREIGN KEY ("actorAdminId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "venue_moderation_signals" (
    "id" TEXT NOT NULL,
    "venueId" UUID NOT NULL,
    "action" "VenueModerationAction" NOT NULL,
    "decisionHint" TEXT,
    "confidenceScore" DOUBLE PRECISION,
    "needsReview" BOOLEAN,
    "duplicatesCount" INTEGER,
    "titleSimilarity" DOUBLE PRECISION,
    "addressSimilarity" DOUBLE PRECISION,
    "sameCity" BOOLEAN,
    "importSource" "VenueImportSource",
    "targetVenueId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venue_moderation_signals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "venue_moderation_signals_venueId_idx" ON "venue_moderation_signals"("venueId");
CREATE INDEX "venue_moderation_signals_createdAt_idx" ON "venue_moderation_signals"("createdAt");
CREATE INDEX "venue_moderation_signals_importSource_idx" ON "venue_moderation_signals"("importSource");

ALTER TABLE "venue_moderation_signals" ADD CONSTRAINT "venue_moderation_signals_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
