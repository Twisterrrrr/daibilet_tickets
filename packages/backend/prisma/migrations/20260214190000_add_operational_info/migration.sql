-- Operational info fields for EventOffer
-- Shown to customer ONLY after order confirmation

ALTER TABLE "event_offers"
  ADD COLUMN IF NOT EXISTS "meetingPoint" TEXT,
  ADD COLUMN IF NOT EXISTS "meetingInstructions" TEXT,
  ADD COLUMN IF NOT EXISTS "operationalPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "operationalNote" TEXT;

-- Assert: columns exist
DO $$ BEGIN
  ASSERT (
    SELECT COUNT(*) = 4
    FROM information_schema.columns
    WHERE table_name = 'event_offers'
      AND column_name IN ('meetingPoint', 'meetingInstructions', 'operationalPhone', 'operationalNote')
  ), 'Not all operational columns were added to event_offers';
END $$;
