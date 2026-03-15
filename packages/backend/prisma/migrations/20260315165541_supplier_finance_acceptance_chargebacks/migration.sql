-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SupplierLedgerEntryType" ADD VALUE 'CHARGEBACK_ADJUSTMENT';
ALTER TYPE "SupplierLedgerEntryType" ADD VALUE 'FEE_RECHARGE';

-- AlterTable
ALTER TABLE "supplier_reports" ADD COLUMN     "acceptedBySupplierUserId" TEXT,
ADD COLUMN     "supplierAcceptedAt" TIMESTAMP(3);
