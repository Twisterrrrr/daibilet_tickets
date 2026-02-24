-- Open-date / open-price поддержка для EventOffer
-- Добавляет enum-ы PriceMode и ValidityMode и поля в таблицу event_offers.

DO $$ BEGIN
  CREATE TYPE "PriceMode" AS ENUM ('FIXED_PRICE', 'OPEN_PRICE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ValidityMode" AS ENUM ('NO_EXPIRY', 'UNTIL_DATE', 'DAYS_FROM_PURCHASE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "event_offers"
  ADD COLUMN IF NOT EXISTS "priceMode" "PriceMode" NOT NULL DEFAULT 'FIXED_PRICE',
  ADD COLUMN IF NOT EXISTS "validityMode" "ValidityMode" NOT NULL DEFAULT 'NO_EXPIRY',
  ADD COLUMN IF NOT EXISTS "validUntil" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "validDays" INTEGER,
  ADD COLUMN IF NOT EXISTS "minAmount" INTEGER,
  ADD COLUMN IF NOT EXISTS "suggestedAmounts" INTEGER[] NOT NULL DEFAULT '{}';

