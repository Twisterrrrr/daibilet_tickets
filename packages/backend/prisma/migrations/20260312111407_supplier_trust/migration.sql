-- AlterTable
ALTER TABLE "operators" ADD COLUMN     "trustCatalogScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trustLastCalculatedAt" TIMESTAMP(3),
ADD COLUMN     "trustManualExpiresAt" TIMESTAMP(3),
ADD COLUMN     "trustManualOverrideLevel" INTEGER,
ADD COLUMN     "trustManualOverrideScore" INTEGER,
ADD COLUMN     "trustManualReason" TEXT,
ADD COLUMN     "trustOperationsScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trustPenaltyScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trustProfileScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trustReputationScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trustScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trustStabilityScore" INTEGER NOT NULL DEFAULT 0;
