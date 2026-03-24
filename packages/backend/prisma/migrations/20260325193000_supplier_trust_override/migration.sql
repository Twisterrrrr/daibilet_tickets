-- CreateTable
CREATE TABLE "supplier_trust_overrides" (
    "id" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "scoreDelta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_trust_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_trust_overrides_supplierId_key" ON "supplier_trust_overrides"("supplierId");

-- AddForeignKey
ALTER TABLE "supplier_trust_overrides" ADD CONSTRAINT "supplier_trust_overrides_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;
