-- External refund requests (manual, admin-operated) for imported sales external orders.

-- CreateEnum
CREATE TYPE "ExternalRefundRequestStatus" AS ENUM (
  'REQUESTED',
  'IN_REVIEW',
  'PROVIDER_CONTACTED',
  'APPROVED_MANUAL',
  'REJECTED',
  'COMPLETED',
  'CANCELED'
);

-- CreateEnum
CREATE TYPE "ExternalRefundRequestReason" AS ENUM (
  'OTHER',
  'CUSTOMER_REQUEST',
  'PROVIDER_CANCELED',
  'DUPLICATE',
  'WRONG_DATE'
);

-- CreateTable
CREATE TABLE "external_refund_requests" (
  "id" UUID NOT NULL,
  "externalOrderLinkId" UUID NOT NULL,
  "status" "ExternalRefundRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "reason" "ExternalRefundRequestReason" NOT NULL DEFAULT 'OTHER',
  "reasonNote" TEXT,
  "amount" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "createdByAdminId" UUID,
  "assignedToAdminId" UUID,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "external_refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "external_refund_requests_externalOrderLinkId_idx" ON "external_refund_requests"("externalOrderLinkId");

-- CreateIndex
CREATE INDEX "external_refund_requests_status_idx" ON "external_refund_requests"("status");

-- CreateIndex
CREATE INDEX "external_refund_requests_createdAt_idx" ON "external_refund_requests"("createdAt");

-- AddForeignKey
ALTER TABLE "external_refund_requests"
ADD CONSTRAINT "external_refund_requests_externalOrderLinkId_fkey"
FOREIGN KEY ("externalOrderLinkId") REFERENCES "external_order_links"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_refund_requests"
ADD CONSTRAINT "external_refund_requests_createdByAdminId_fkey"
FOREIGN KEY ("createdByAdminId") REFERENCES "admin_users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_refund_requests"
ADD CONSTRAINT "external_refund_requests_assignedToAdminId_fkey"
FOREIGN KEY ("assignedToAdminId") REFERENCES "admin_users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

