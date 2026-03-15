-- CreateEnum
CREATE TYPE "SupplierDisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SupplierDisputeReasonCategory" AS ENUM ('WRONG_COMMISSION', 'MISSING_SALE', 'WRONG_DETAILS', 'OTHER');

-- AlterTable
ALTER TABLE "supplier_payout_requests" ADD COLUMN     "isBlockedByDispute" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "supplier_reports" ADD COLUMN     "hasConflict" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metaJson" JSONB;

-- CreateTable
CREATE TABLE "supplier_disputes" (
    "id" TEXT NOT NULL,
    "supplierReportId" TEXT NOT NULL,
    "operatorId" UUID NOT NULL,
    "status" "SupplierDisputeStatus" NOT NULL DEFAULT 'OPEN',
    "reasonCategory" "SupplierDisputeReasonCategory" NOT NULL,
    "reasonText" TEXT,
    "resolutionText" TEXT,
    "openedBySupplierUserId" UUID,
    "resolvedByAdminId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "supplier_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_disputes_supplierReportId_idx" ON "supplier_disputes"("supplierReportId");

-- CreateIndex
CREATE INDEX "supplier_disputes_operatorId_status_idx" ON "supplier_disputes"("operatorId", "status");

-- AddForeignKey
ALTER TABLE "supplier_disputes" ADD CONSTRAINT "supplier_disputes_supplierReportId_fkey" FOREIGN KEY ("supplierReportId") REFERENCES "supplier_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_disputes" ADD CONSTRAINT "supplier_disputes_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
