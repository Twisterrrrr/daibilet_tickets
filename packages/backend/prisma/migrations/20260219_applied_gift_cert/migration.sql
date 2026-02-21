-- Применённый подарочный сертификат к корзине: { certificateId, code, discountAmount }
ALTER TABLE "checkout_sessions" ADD COLUMN IF NOT EXISTS "appliedGiftCertificateSnapshot" JSONB;
