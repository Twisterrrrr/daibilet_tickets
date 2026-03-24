-- CreateTable
CREATE TABLE "catalog_consistency_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "snapshotDate" DATE NOT NULL,
    "sellablePercent" DOUBLE PRECISION NOT NULL,
    "issuesJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_consistency_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_consistency_snapshots_snapshotDate_key" ON "catalog_consistency_snapshots"("snapshotDate");
