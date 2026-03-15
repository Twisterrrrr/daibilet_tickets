/*
  Warnings:

  - You are about to drop the column `vatPercent` on the `supplier_legal_profiles` table. All the data in the column will be lost.
  - The `taxMode` column on the `supplier_legal_profiles` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TaxMode" AS ENUM ('OSNO', 'USN_6', 'USN_15', 'AUSN', 'NPD');

-- AlterTable
ALTER TABLE "supplier_legal_profiles" DROP COLUMN "vatPercent",
ADD COLUMN     "defaultVatRate" DECIMAL(5,2),
ADD COLUMN     "isVatPayer" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "taxMode",
ADD COLUMN     "taxMode" "TaxMode" NOT NULL DEFAULT 'OSNO';

-- DropEnum
DROP TYPE "SupplierTaxMode";
