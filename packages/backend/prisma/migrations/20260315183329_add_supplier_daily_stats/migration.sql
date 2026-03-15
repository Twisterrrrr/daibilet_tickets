-- CreateTable
CREATE TABLE "supplier_daily_stats" (
    "id" UUID NOT NULL,
    "operatorId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "grossAmountCents" INTEGER NOT NULL DEFAULT 0,
    "platformFeeCents" INTEGER NOT NULL DEFAULT 0,
    "supplierAmountCents" INTEGER NOT NULL DEFAULT 0,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_daily_stats_operatorId_idx" ON "supplier_daily_stats"("operatorId");

-- CreateIndex
CREATE INDEX "supplier_daily_stats_date_idx" ON "supplier_daily_stats"("date");

-- CreateIndex
CREATE INDEX "supplier_daily_stats_operatorId_date_idx" ON "supplier_daily_stats"("operatorId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_daily_stats_operatorId_date_key" ON "supplier_daily_stats"("operatorId", "date");

-- AddForeignKey
ALTER TABLE "supplier_daily_stats" ADD CONSTRAINT "supplier_daily_stats_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;
