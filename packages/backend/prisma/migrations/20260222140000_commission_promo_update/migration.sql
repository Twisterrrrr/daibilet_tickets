-- Комиссии: promoRate 10%, базовая 25% для всех
-- promoRate включает YooKassa; для госмузеев — в частном порядке (venue.commissionRate)

ALTER TABLE "operators" ALTER COLUMN "commissionRate" SET DEFAULT 0.25;
ALTER TABLE "operators" ALTER COLUMN "promoRate" SET DEFAULT 0.10;
