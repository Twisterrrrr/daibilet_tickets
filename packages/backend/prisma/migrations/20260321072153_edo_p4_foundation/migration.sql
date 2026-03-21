-- CreateEnum
CREATE TYPE "EdoProviderType" AS ENUM ('NOOP', 'DIADOK');

-- CreateEnum
CREATE TYPE "EdoDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'SIGNED', 'REJECTED', 'ERROR');

-- CreateTable
CREATE TABLE "supplier_edo_profiles" (
    "id" TEXT NOT NULL,
    "operatorId" UUID NOT NULL,
    "provider" "EdoProviderType" NOT NULL,
    "boxId" TEXT,
    "inn" TEXT NOT NULL,
    "kpp" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settingsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_edo_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edo_deliveries" (
    "id" TEXT NOT NULL,
    "supplierDocumentId" TEXT NOT NULL,
    "supplierEdoProfileId" TEXT NOT NULL,
    "provider" "EdoProviderType" NOT NULL,
    "providerDeliveryId" TEXT,
    "status" "EdoDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "lastStatusAt" TIMESTAMP(3),
    "initiatedByAdminUserId" UUID,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "edo_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_edo_profiles_operatorId_key" ON "supplier_edo_profiles"("operatorId");

-- CreateIndex
CREATE INDEX "edo_deliveries_supplierDocumentId_idx" ON "edo_deliveries"("supplierDocumentId");

-- CreateIndex
CREATE INDEX "edo_deliveries_supplierEdoProfileId_idx" ON "edo_deliveries"("supplierEdoProfileId");

-- CreateIndex
CREATE INDEX "edo_deliveries_status_idx" ON "edo_deliveries"("status");

-- CreateIndex
CREATE INDEX "edo_deliveries_provider_providerDeliveryId_idx" ON "edo_deliveries"("provider", "providerDeliveryId");

-- AddForeignKey
ALTER TABLE "supplier_edo_profiles" ADD CONSTRAINT "supplier_edo_profiles_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edo_deliveries" ADD CONSTRAINT "edo_deliveries_supplierDocumentId_fkey" FOREIGN KEY ("supplierDocumentId") REFERENCES "supplier_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edo_deliveries" ADD CONSTRAINT "edo_deliveries_supplierEdoProfileId_fkey" FOREIGN KEY ("supplierEdoProfileId") REFERENCES "supplier_edo_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
