-- Add demo finance document types without breaking existing ones
ALTER TYPE "SupplierDocumentType" ADD VALUE IF NOT EXISTS 'SERVICE_ACT';
ALTER TYPE "SupplierDocumentType" ADD VALUE IF NOT EXISTS 'UPD';
