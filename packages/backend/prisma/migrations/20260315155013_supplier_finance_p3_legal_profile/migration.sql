-- CreateEnum
CREATE TYPE "SupplierTaxMode" AS ENUM ('NONE', 'USN', 'OSN', 'NPD', 'VAT_EXEMPT');

-- CreateEnum
CREATE TYPE "SupplierLegalProfileStatus" AS ENUM ('DRAFT', 'INCOMPLETE', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SupplierDocumentTemplateType" AS ENUM ('AGENT_REPORT', 'COMMISSION_ACT', 'PAYOUT_STATEMENT');

-- AlterTable
ALTER TABLE "supplier_documents" ADD COLUMN     "templateId" TEXT,
ADD COLUMN     "templateVersionId" TEXT;

-- AlterTable
ALTER TABLE "supplier_payout_requests" ADD COLUMN     "bankAccountSnapshot" JSONB;

-- AlterTable
ALTER TABLE "supplier_reports" ADD COLUMN     "legalProfileSnapshot" JSONB;

-- CreateTable
CREATE TABLE "supplier_legal_profiles" (
    "id" TEXT NOT NULL,
    "operatorId" UUID NOT NULL,
    "legalName" TEXT NOT NULL,
    "legalAddress" TEXT,
    "inn" TEXT,
    "kpp" TEXT,
    "ogrn" TEXT,
    "taxMode" "SupplierTaxMode" NOT NULL DEFAULT 'NONE',
    "vatPercent" DECIMAL(5,2),
    "signerFullName" TEXT,
    "signerPosition" TEXT,
    "financeEmail" TEXT,
    "docsEmail" TEXT,
    "status" "SupplierLegalProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_legal_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_bank_accounts" (
    "id" TEXT NOT NULL,
    "supplierLegalProfileId" TEXT NOT NULL,
    "bankName" TEXT,
    "bik" TEXT,
    "accountNumber" TEXT,
    "correspondentAccount" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_document_templates" (
    "id" TEXT NOT NULL,
    "type" "SupplierDocumentTemplateType" NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_document_template_versions" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "schemaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_document_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_legal_profiles_operatorId_key" ON "supplier_legal_profiles"("operatorId");

-- CreateIndex
CREATE INDEX "supplier_bank_accounts_supplierLegalProfileId_idx" ON "supplier_bank_accounts"("supplierLegalProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_document_templates_code_key" ON "supplier_document_templates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_document_template_versions_templateId_version_key" ON "supplier_document_template_versions"("templateId", "version");

-- AddForeignKey
ALTER TABLE "supplier_legal_profiles" ADD CONSTRAINT "supplier_legal_profiles_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bank_accounts" ADD CONSTRAINT "supplier_bank_accounts_supplierLegalProfileId_fkey" FOREIGN KEY ("supplierLegalProfileId") REFERENCES "supplier_legal_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "supplier_document_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "supplier_document_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_document_template_versions" ADD CONSTRAINT "supplier_document_template_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "supplier_document_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
