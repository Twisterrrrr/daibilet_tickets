-- AlterTable
ALTER TABLE "checkout_sessions" ADD COLUMN IF NOT EXISTS "giftCertificateSnapshot" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "gift_certificates" (
    "id" UUID NOT NULL,
    "checkoutSessionId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "senderName" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "gift_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "gift_certificates_checkoutSessionId_key" ON "gift_certificates"("checkoutSessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "gift_certificates_code_key" ON "gift_certificates"("code");
CREATE INDEX IF NOT EXISTS "gift_certificates_code_idx" ON "gift_certificates"("code");
CREATE INDEX IF NOT EXISTS "gift_certificates_recipientEmail_idx" ON "gift_certificates"("recipientEmail");
CREATE INDEX IF NOT EXISTS "gift_certificates_status_idx" ON "gift_certificates"("status");

-- AddForeignKey
ALTER TABLE "gift_certificates" ADD CONSTRAINT "gift_certificates_checkoutSessionId_fkey" FOREIGN KEY ("checkoutSessionId") REFERENCES "checkout_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
