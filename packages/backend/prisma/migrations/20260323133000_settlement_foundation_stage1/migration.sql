-- Stage 1 foundation: settlement + supplier document policy fields

-- Enums
DO $$
BEGIN
  CREATE TYPE "ClosingDocumentMode" AS ENUM ('UPD', 'ACT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SettlementStatus" AS ENUM ('DRAFT', 'CALCULATED', 'APPROVED', 'FINALIZED', 'PAID', 'CANCELED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "SupplierDocumentType" ADD VALUE IF NOT EXISTS 'INVOICE';
ALTER TYPE "SupplierDocumentType" ADD VALUE IF NOT EXISTS 'VAT_INVOICE';

ALTER TYPE "SupplierDocumentStatus" ADD VALUE IF NOT EXISTS 'ISSUED';
ALTER TYPE "SupplierDocumentStatus" ADD VALUE IF NOT EXISTS 'SENT';
ALTER TYPE "SupplierDocumentStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE "SupplierDocumentStatus" ADD VALUE IF NOT EXISTS 'SIGNED';
ALTER TYPE "SupplierDocumentStatus" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE "SupplierDocumentStatus" ADD VALUE IF NOT EXISTS 'CANCELED';

-- supplier_legal_profiles settings
ALTER TABLE "supplier_legal_profiles"
  ADD COLUMN IF NOT EXISTS "generateInvoiceDocuments" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "closingDocumentMode" "ClosingDocumentMode" NOT NULL DEFAULT 'UPD';

-- settlement table
CREATE TABLE IF NOT EXISTS "supplier_settlements" (
  "id" TEXT NOT NULL,
  "operatorId" UUID NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "grossAmount" DECIMAL(14,2) NOT NULL,
  "commissionAmount" DECIMAL(14,2) NOT NULL,
  "adjustmentAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "netAmount" DECIMAL(14,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "status" "SettlementStatus" NOT NULL DEFAULT 'DRAFT',
  "payoutId" TEXT,
  "approvedAt" TIMESTAMP(3),
  "finalizedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "metaJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "supplier_settlements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "supplier_settlements_operatorId_periodStart_periodEnd_idx"
  ON "supplier_settlements"("operatorId", "periodStart", "periodEnd");

ALTER TABLE "supplier_settlements"
  ADD CONSTRAINT "supplier_settlements_operatorId_fkey"
  FOREIGN KEY ("operatorId") REFERENCES "operators"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- link supplier_documents -> settlement
ALTER TABLE "supplier_documents"
  ADD COLUMN IF NOT EXISTS "settlementId" TEXT;

CREATE INDEX IF NOT EXISTS "supplier_documents_settlementId_idx"
  ON "supplier_documents"("settlementId");

ALTER TABLE "supplier_documents"
  ADD CONSTRAINT "supplier_documents_settlementId_fkey"
  FOREIGN KEY ("settlementId") REFERENCES "supplier_settlements"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
