-- Hint outcome flags + indexes for moderation analytics

ALTER TABLE "venue_moderation_signals" ADD COLUMN "wasHintAccepted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "venue_moderation_signals" ADD COLUMN "wasHintOverridden" BOOLEAN NOT NULL DEFAULT false;

UPDATE "venue_moderation_signals"
SET
  "wasHintAccepted" = (
    ("decisionHint" = 'MERGE_RECOMMENDED' AND "action" = 'MERGE'::"VenueModerationAction")
    OR ("decisionHint" = 'APPROVE_AS_NEW' AND "action" = 'APPROVE'::"VenueModerationAction")
    OR ("decisionHint" = 'REJECT_RECOMMENDED' AND "action" = 'REJECT'::"VenueModerationAction")
  ),
  "wasHintOverridden" = (
    ("decisionHint" = 'MERGE_RECOMMENDED' AND "action" = 'APPROVE'::"VenueModerationAction")
    OR ("decisionHint" = 'APPROVE_AS_NEW' AND "action" = 'MERGE'::"VenueModerationAction")
    OR (
      "decisionHint" = 'REJECT_RECOMMENDED'
      AND (
        "action" = 'APPROVE'::"VenueModerationAction"
        OR "action" = 'MERGE'::"VenueModerationAction"
      )
    )
  );

CREATE INDEX "venue_moderation_decisions_venueId_createdAt_idx" ON "venue_moderation_decisions"("venueId", "createdAt");
CREATE INDEX "venue_moderation_decisions_action_idx" ON "venue_moderation_decisions"("action");
CREATE INDEX "venue_moderation_signals_decisionHint_idx" ON "venue_moderation_signals"("decisionHint");
