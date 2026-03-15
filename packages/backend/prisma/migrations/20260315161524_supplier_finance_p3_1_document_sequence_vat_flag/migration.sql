-- AlterTable
ALTER TABLE "supplier_document_template_versions" ADD COLUMN     "requiresVatData" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "document_sequences" (
    "id" TEXT NOT NULL,
    "operatorId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_sequences_operatorId_year_type_idx" ON "document_sequences"("operatorId", "year", "type");

-- CreateIndex
CREATE UNIQUE INDEX "document_sequences_operatorId_year_type_key" ON "document_sequences"("operatorId", "year", "type");
