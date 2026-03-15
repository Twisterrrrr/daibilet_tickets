-- AlterTable: P3-3 Admin API — кто/когда одобрил, причина отказа
ALTER TABLE "supplier_legal_profiles" ADD COLUMN "verifiedBy" UUID,
ADD COLUMN "verifiedAt" TIMESTAMP(3),
ADD COLUMN "rejectionComment" TEXT;
