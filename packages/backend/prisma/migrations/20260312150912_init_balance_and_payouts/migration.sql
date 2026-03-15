/*
  Warnings:

  - You are about to drop the `event_sessions_partitioned` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "event_sessions_partitioned" DROP CONSTRAINT "event_sessions_partitioned_eventId_fkey";

-- DropForeignKey
ALTER TABLE "event_sessions_partitioned" DROP CONSTRAINT "event_sessions_partitioned_offerId_fkey";

-- DropTable
DROP TABLE "event_sessions_partitioned";

-- CreateTable
CREATE TABLE "supplier_payout_requests" (
    "id" TEXT NOT NULL,
    "operatorId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "comment" TEXT,
    "adminComment" TEXT,

    CONSTRAINT "supplier_payout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_payout_requests_operatorId_idx" ON "supplier_payout_requests"("operatorId");
