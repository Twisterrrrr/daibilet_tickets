-- CreateEnum
CREATE TYPE "PromoType" AS ENUM ('PERCENT', 'FIXED');

-- AlterTable
ALTER TABLE "checkout_sessions" ADD COLUMN     "appliedPromoCodeSnapshot" JSONB;

-- AlterTable
ALTER TABLE "event_overrides" ADD COLUMN     "manualBoost" INTEGER,
ADD COLUMN     "suppressLowQuality" BOOLEAN DEFAULT false;

-- CreateTable
CREATE TABLE "promo_codes" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "type" "PromoType" NOT NULL,
    "value" INTEGER NOT NULL,
    "operatorId" UUID,
    "eventId" UUID,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_invitations" (
    "id" UUID NOT NULL,
    "operatorId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "SupplierRole" NOT NULL DEFAULT 'MANAGER',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_code_key" ON "promo_codes"("code");

-- CreateIndex
CREATE INDEX "promo_codes_operatorId_idx" ON "promo_codes"("operatorId");

-- CreateIndex
CREATE INDEX "promo_codes_eventId_idx" ON "promo_codes"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_invitations_token_key" ON "supplier_invitations"("token");

-- CreateIndex
CREATE INDEX "supplier_invitations_operatorId_idx" ON "supplier_invitations"("operatorId");

-- CreateIndex
CREATE INDEX "supplier_invitations_token_idx" ON "supplier_invitations"("token");

-- AddForeignKey
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invitations" ADD CONSTRAINT "supplier_invitations_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
