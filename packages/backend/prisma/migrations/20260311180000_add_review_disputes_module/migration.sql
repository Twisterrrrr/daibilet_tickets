-- AlterEnum
ALTER TYPE "ReviewStatus" ADD VALUE 'HIDDEN';

-- CreateEnum
CREATE TYPE "ReviewSupplierResponseStatus" AS ENUM ('DRAFT', 'PENDING_MODERATION', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewDisputeStatus" AS ENUM ('MODERATOR_REVIEW', 'RESOLVED_KEEP', 'RESOLVED_EDIT', 'RESOLVED_HIDE', 'RESOLVED_DELETE');

-- CreateEnum
CREATE TYPE "ReviewDisputeReasonCode" AS ENUM ('FALSE_FACTS', 'OFF_TOPIC', 'ABUSIVE', 'PERSONAL_DATA', 'BLACKMAIL', 'SPAM', 'OTHER');

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "supplierId" UUID;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "review_supplier_responses" (
    "id" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "status" "ReviewSupplierResponseStatus" NOT NULL DEFAULT 'DRAFT',
    "moderationComment" TEXT,
    "moderatedBy" UUID,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_supplier_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_disputes" (
    "id" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "status" "ReviewDisputeStatus" NOT NULL DEFAULT 'MODERATOR_REVIEW',
    "reasonCode" "ReviewDisputeReasonCode" NOT NULL,
    "claimText" TEXT NOT NULL,
    "supplierConfirmedTruth" BOOLEAN NOT NULL,
    "decisionComment" TEXT,
    "handledByAdminId" UUID,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_dispute_evidence" (
    "id" UUID NOT NULL,
    "disputeId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_dispute_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_action_logs" (
    "id" UUID NOT NULL,
    "reviewId" UUID,
    "disputeId" UUID,
    "actorType" TEXT NOT NULL,
    "actorId" UUID,
    "actionType" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reviews_supplierId_status_idx" ON "reviews"("supplierId", "status");
CREATE INDEX "reviews_createdAt_idx" ON "reviews"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "review_supplier_responses_reviewId_key" ON "review_supplier_responses"("reviewId");

-- CreateIndex
CREATE INDEX "review_supplier_responses_supplierId_status_idx" ON "review_supplier_responses"("supplierId", "status");

-- CreateIndex
CREATE INDEX "review_supplier_responses_status_idx" ON "review_supplier_responses"("status");

-- CreateIndex
CREATE UNIQUE INDEX "review_disputes_reviewId_key" ON "review_disputes"("reviewId");

-- CreateIndex
CREATE INDEX "review_disputes_supplierId_status_idx" ON "review_disputes"("supplierId", "status");

-- CreateIndex
CREATE INDEX "review_disputes_status_idx" ON "review_disputes"("status");
CREATE INDEX "review_disputes_createdAt_idx" ON "review_disputes"("createdAt");

-- CreateIndex
CREATE INDEX "review_dispute_evidence_disputeId_idx" ON "review_dispute_evidence"("disputeId");

-- CreateIndex
CREATE INDEX "review_action_logs_reviewId_createdAt_idx" ON "review_action_logs"("reviewId", "createdAt");

-- CreateIndex
CREATE INDEX "review_action_logs_disputeId_createdAt_idx" ON "review_action_logs"("disputeId", "createdAt");

-- CreateIndex
CREATE INDEX "review_action_logs_actionType_idx" ON "review_action_logs"("actionType");

-- AddForeignKey
ALTER TABLE "review_supplier_responses" ADD CONSTRAINT "review_supplier_responses_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_supplier_responses" ADD CONSTRAINT "review_supplier_responses_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_disputes" ADD CONSTRAINT "review_disputes_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_disputes" ADD CONSTRAINT "review_disputes_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_dispute_evidence" ADD CONSTRAINT "review_dispute_evidence_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "review_disputes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_action_logs" ADD CONSTRAINT "review_action_logs_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_action_logs" ADD CONSTRAINT "review_action_logs_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "review_disputes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
