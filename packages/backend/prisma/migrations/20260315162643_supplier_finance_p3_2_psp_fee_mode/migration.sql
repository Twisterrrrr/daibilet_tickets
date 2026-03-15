-- CreateEnum
CREATE TYPE "PspFeeMode" AS ENUM ('PLATFORM_PAYS', 'SUPPLIER_PAYS', 'SHARED_50_50', 'SERVICE_FEE');

-- AlterTable
ALTER TABLE "operators" ADD COLUMN     "pspFeeMode" "PspFeeMode" NOT NULL DEFAULT 'PLATFORM_PAYS';

-- AlterTable
ALTER TABLE "supplier_ledger_entries" ADD COLUMN     "metaJson" JSONB;
