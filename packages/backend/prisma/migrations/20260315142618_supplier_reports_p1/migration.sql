-- CreateEnum
CREATE TYPE "SupplierReportBasis" AS ENUM ('SOLD', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SupplierReportStatus" AS ENUM ('DRAFT', 'FINAL');

-- CreateEnum
CREATE TYPE "SupplierReportLineType" AS ENUM ('SALE', 'COMMISSION', 'REFUND', 'PAYOUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "SupplierDocumentType" AS ENUM ('AGENT_REPORT', 'COMMISSION_ACT', 'PAYOUT_STATEMENT');

-- CreateEnum
CREATE TYPE "SupplierDocumentStatus" AS ENUM ('DRAFT', 'GENERATED');

-- CreateEnum
CREATE TYPE "SupplierDocumentFileKind" AS ENUM ('PDF', 'JSON_SNAPSHOT');

-- CreateTable
CREATE TABLE "supplier_reports" (
    "id" TEXT NOT NULL,
    "operatorId" UUID NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "basis" "SupplierReportBasis" NOT NULL,
    "status" "SupplierReportStatus" NOT NULL DEFAULT 'DRAFT',
    "grossAmount" DECIMAL(14,2) NOT NULL,
    "commissionAmount" DECIMAL(14,2) NOT NULL,
    "refundAmount" DECIMAL(14,2) NOT NULL,
    "netAmount" DECIMAL(14,2) NOT NULL,
    "snapshotJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_report_lines" (
    "id" TEXT NOT NULL,
    "supplierReportId" TEXT NOT NULL,
    "type" "SupplierReportLineType" NOT NULL,
    "ledgerEntryId" UUID,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "netAmount" DECIMAL(14,2) NOT NULL,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_report_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_documents" (
    "id" TEXT NOT NULL,
    "operatorId" UUID NOT NULL,
    "reportId" TEXT,
    "type" "SupplierDocumentType" NOT NULL,
    "status" "SupplierDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_document_files" (
    "id" TEXT NOT NULL,
    "supplierDocumentId" TEXT NOT NULL,
    "kind" "SupplierDocumentFileKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_document_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_reports_operatorId_periodStart_periodEnd_idx" ON "supplier_reports"("operatorId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_reports_operatorId_periodStart_periodEnd_basis_key" ON "supplier_reports"("operatorId", "periodStart", "periodEnd", "basis");

-- CreateIndex
CREATE INDEX "supplier_report_lines_supplierReportId_idx" ON "supplier_report_lines"("supplierReportId");

-- CreateIndex
CREATE INDEX "supplier_report_lines_ledgerEntryId_idx" ON "supplier_report_lines"("ledgerEntryId");

-- CreateIndex
CREATE INDEX "supplier_documents_operatorId_idx" ON "supplier_documents"("operatorId");

-- CreateIndex
CREATE INDEX "supplier_documents_reportId_idx" ON "supplier_documents"("reportId");

-- CreateIndex
CREATE INDEX "supplier_document_files_supplierDocumentId_idx" ON "supplier_document_files"("supplierDocumentId");

-- AddForeignKey
ALTER TABLE "supplier_reports" ADD CONSTRAINT "supplier_reports_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_report_lines" ADD CONSTRAINT "supplier_report_lines_supplierReportId_fkey" FOREIGN KEY ("supplierReportId") REFERENCES "supplier_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "supplier_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_document_files" ADD CONSTRAINT "supplier_document_files_supplierDocumentId_fkey" FOREIGN KEY ("supplierDocumentId") REFERENCES "supplier_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
