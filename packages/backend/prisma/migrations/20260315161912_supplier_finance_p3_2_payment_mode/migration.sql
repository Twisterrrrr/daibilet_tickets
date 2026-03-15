-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('SINGLE_MERCHANT', 'AGENT_SINGLE_PAYOUT', 'SPLIT_MERCHANT');

-- AlterTable
ALTER TABLE "operators" ADD COLUMN     "agentSchemeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentMode" "PaymentMode" NOT NULL DEFAULT 'SINGLE_MERCHANT',
ADD COLUMN     "splitEnabled" BOOLEAN NOT NULL DEFAULT false;
