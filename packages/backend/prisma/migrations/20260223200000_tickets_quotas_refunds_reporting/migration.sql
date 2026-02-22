-- Билеты: категории, цены, квоты, политика возвратов, отчётность
-- См. docs/TicketsQuotasRefundsReporting.md

-- 1. Enum'ы
DO $$ BEGIN CREATE TYPE "DayOfWeek" AS ENUM ('MON','TUE','WED','THU','FRI','SAT','SUN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TicketCategoryKind" AS ENUM ('PRIMARY','ADDON'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TicketPriceStatus" AS ENUM ('ACTIVE','INACTIVE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PaymentMode" AS ENUM ('PLATFORM','EXTERNAL','MIXED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ProviderKind" AS ENUM ('TEPLOHOD','TICKETS_CLOUD','OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "RefundRequestStatus" AS ENUM ('REQUESTED','CALCULATED','FORWARDED','WAITING_PROVIDER','APPROVED','REJECTED','PROCESSING','REFUNDED','FAILED','CLOSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "RefundResolution" AS ENUM ('REFUND','RESCHEDULE','VOUCHER','NO_REFUND'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "RefundForwardingChannel" AS ENUM ('API','EMAIL','MANUAL_URL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "IssuedTicketStatus" AS ENUM ('ISSUED','CANCELLED','REFUNDED','USED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LedgerEntryType" AS ENUM ('SALE_TICKET_GROSS','PLATFORM_COMMISSION','PAYMENT_FEE','PROVIDER_PAYABLE','REFUND_TICKET','REVERSAL_PLATFORM_COMMISSION','REVERSAL_PROVIDER_PAYABLE','REVERSAL_PAYMENT_FEE','PAYOUT_TO_PROVIDER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SettlementBatchStatus" AS ENUM ('DRAFT','SENT','ACCEPTED','REJECTED','PAID','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReportType" AS ENUM ('EVENTS_OVERVIEW','SALES','COMMISSIONS','REFUNDS','VOUCHER_REGISTER','USAGE_REPORT','SETTLEMENT_ACT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReportStatus" AS ENUM ('QUEUED','RUNNING','READY','FAILED','EXPIRED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CancellationPolicyScope" AS ENUM ('PLATFORM','PROVIDER','OPERATOR','OFFER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. ticket_categories
CREATE TABLE IF NOT EXISTS "ticket_categories" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "offerId" UUID NOT NULL REFERENCES "event_offers"("id") ON DELETE CASCADE,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "kind" "TicketCategoryKind" NOT NULL DEFAULT 'PRIMARY',
  "allowedDays" "DayOfWeek"[] DEFAULT '{}',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isDefaultForCard" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("offerId","code")
);
CREATE INDEX IF NOT EXISTS "ticket_categories_offerId_isActive_idx" ON "ticket_categories"("offerId","isActive");
CREATE INDEX IF NOT EXISTS "ticket_categories_offerId_sortOrder_idx" ON "ticket_categories"("offerId","sortOrder");

-- 3. ticket_prices
CREATE TABLE IF NOT EXISTS "ticket_prices" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "offerId" UUID NOT NULL REFERENCES "event_offers"("id") ON DELETE CASCADE,
  "categoryId" UUID NOT NULL REFERENCES "ticket_categories"("id") ON DELETE CASCADE,
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "priceCents" INTEGER NOT NULL,
  "compareAtPriceCents" INTEGER,
  "status" "TicketPriceStatus" NOT NULL DEFAULT 'ACTIVE',
  "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validTo" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ticket_prices_offerId_status_validFrom_idx" ON "ticket_prices"("offerId","status","validFrom");
CREATE INDEX IF NOT EXISTS "ticket_prices_categoryId_status_validFrom_idx" ON "ticket_prices"("categoryId","status","validFrom");
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_prices_one_active_per_category"
  ON "ticket_prices"("categoryId") WHERE "status" = 'ACTIVE' AND "validTo" IS NULL;

-- 4. ticket_quota_defaults
CREATE TABLE IF NOT EXISTS "ticket_quota_defaults" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "offerId" UUID NOT NULL REFERENCES "event_offers"("id") ON DELETE CASCADE,
  "categoryId" UUID REFERENCES "ticket_categories"("id") ON DELETE CASCADE,
  "capacityTotal" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("offerId","categoryId")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_quota_defaults_offer_total_unique"
  ON "ticket_quota_defaults"("offerId") WHERE "categoryId" IS NULL;
CREATE INDEX IF NOT EXISTS "ticket_quota_defaults_offerId_idx" ON "ticket_quota_defaults"("offerId");
CREATE INDEX IF NOT EXISTS "ticket_quota_defaults_categoryId_idx" ON "ticket_quota_defaults"("categoryId");

-- 5. ticket_quota_overrides
CREATE TABLE IF NOT EXISTS "ticket_quota_overrides" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionId" UUID NOT NULL REFERENCES "event_sessions"("id") ON DELETE CASCADE,
  "categoryId" UUID REFERENCES "ticket_categories"("id") ON DELETE CASCADE,
  "capacityTotal" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("sessionId","categoryId")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_quota_overrides_session_total_unique"
  ON "ticket_quota_overrides"("sessionId") WHERE "categoryId" IS NULL;
CREATE INDEX IF NOT EXISTS "ticket_quota_overrides_sessionId_idx" ON "ticket_quota_overrides"("sessionId");
CREATE INDEX IF NOT EXISTS "ticket_quota_overrides_categoryId_idx" ON "ticket_quota_overrides"("categoryId");

-- 6. ticket_sales_counters
CREATE TABLE IF NOT EXISTS "ticket_sales_counters" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionId" UUID NOT NULL REFERENCES "event_sessions"("id") ON DELETE CASCADE,
  "categoryId" UUID NOT NULL REFERENCES "ticket_categories"("id") ON DELETE CASCADE,
  "soldQty" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("sessionId","categoryId")
);
CREATE INDEX IF NOT EXISTS "ticket_sales_counters_sessionId_idx" ON "ticket_sales_counters"("sessionId");
CREATE INDEX IF NOT EXISTS "ticket_sales_counters_categoryId_idx" ON "ticket_sales_counters"("categoryId");

-- 7. cancellation_policy_templates
CREATE TABLE IF NOT EXISTS "cancellation_policy_templates" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "scopeType" "CancellationPolicyScope" NOT NULL,
  "scopeId" UUID,
  "provider" "ProviderKind",
  "name" TEXT NOT NULL,
  "publicText" TEXT,
  "shortBadge" TEXT,
  "ruleJson" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "cancellation_policy_templates_scope_idx" ON "cancellation_policy_templates"("scopeType","scopeId");
CREATE INDEX IF NOT EXISTS "cancellation_policy_templates_provider_idx" ON "cancellation_policy_templates"("provider");

-- 8. tickets_issued
CREATE TABLE IF NOT EXISTS "tickets_issued" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" UUID,
  "packageId" UUID,
  "paymentId" UUID,
  "offerId" UUID NOT NULL REFERENCES "event_offers"("id") ON DELETE RESTRICT,
  "sessionId" UUID REFERENCES "event_sessions"("id") ON DELETE RESTRICT,
  "openDate" DATE,
  "categoryId" UUID REFERENCES "ticket_categories"("id") ON DELETE SET NULL,
  "categoryCode" TEXT,
  "categoryTitle" TEXT,
  "provider" "ProviderKind",
  "providerOrderRef" TEXT,
  "providerTicketRef" TEXT,
  "operatorId" UUID,
  "supplierId" UUID,
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "grossCents" INTEGER NOT NULL,
  "commissionCents" INTEGER NOT NULL,
  "paymentFeeCents" INTEGER NOT NULL DEFAULT 0,
  "providerPayableCents" INTEGER NOT NULL,
  "voucherCode" TEXT UNIQUE,
  "qrPayload" TEXT,
  "status" "IssuedTicketStatus" NOT NULL DEFAULT 'ISSUED',
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "usedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "tickets_issued_offerId_issuedAt_idx" ON "tickets_issued"("offerId","issuedAt");
CREATE INDEX IF NOT EXISTS "tickets_issued_sessionId_issuedAt_idx" ON "tickets_issued"("sessionId","issuedAt");
CREATE INDEX IF NOT EXISTS "tickets_issued_operatorId_issuedAt_idx" ON "tickets_issued"("operatorId","issuedAt");
CREATE INDEX IF NOT EXISTS "tickets_issued_supplierId_issuedAt_idx" ON "tickets_issued"("supplierId","issuedAt");
CREATE INDEX IF NOT EXISTS "tickets_issued_provider_issuedAt_idx" ON "tickets_issued"("provider","issuedAt");
CREATE INDEX IF NOT EXISTS "tickets_issued_status_issuedAt_idx" ON "tickets_issued"("status","issuedAt");
CREATE INDEX IF NOT EXISTS "tickets_issued_openDate_idx" ON "tickets_issued"("openDate");

-- 9. ledger_entries
CREATE TABLE IF NOT EXISTS "ledger_entries" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "entryType" "LedgerEntryType" NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "amountCents" INTEGER NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "orderId" UUID,
  "packageId" UUID,
  "ticketId" UUID REFERENCES "tickets_issued"("id") ON DELETE SET NULL,
  "offerId" UUID,
  "sessionId" UUID,
  "provider" "ProviderKind",
  "operatorId" UUID,
  "supplierId" UUID,
  "paymentMode" "PaymentMode",
  "paymentProvider" TEXT,
  "paymentRef" TEXT,
  "memo" TEXT,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ledger_entries_entryType_effectiveAt_idx" ON "ledger_entries"("entryType","effectiveAt");
CREATE INDEX IF NOT EXISTS "ledger_entries_ticketId_idx" ON "ledger_entries"("ticketId");
CREATE INDEX IF NOT EXISTS "ledger_entries_orderId_idx" ON "ledger_entries"("orderId");
CREATE INDEX IF NOT EXISTS "ledger_entries_packageId_idx" ON "ledger_entries"("packageId");
CREATE INDEX IF NOT EXISTS "ledger_entries_operatorId_effectiveAt_idx" ON "ledger_entries"("operatorId","effectiveAt");
CREATE INDEX IF NOT EXISTS "ledger_entries_supplierId_effectiveAt_idx" ON "ledger_entries"("supplierId","effectiveAt");
CREATE INDEX IF NOT EXISTS "ledger_entries_provider_effectiveAt_idx" ON "ledger_entries"("provider","effectiveAt");
CREATE INDEX IF NOT EXISTS "ledger_entries_paymentRef_idx" ON "ledger_entries"("paymentRef");

-- 10. refund_requests
CREATE TABLE IF NOT EXISTS "refund_requests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "status" "RefundRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "resolution" "RefundResolution",
  "paymentMode" "PaymentMode" NOT NULL,
  "provider" "ProviderKind",
  "forwardingChannel" "RefundForwardingChannel",
  "requestedByUserId" UUID,
  "requestedByAdminId" UUID,
  "requestedBySupplierUserId" UUID,
  "orderId" UUID,
  "packageId" UUID,
  "ticketId" UUID REFERENCES "tickets_issued"("id") ON DELETE SET NULL,
  "offerId" UUID,
  "sessionId" UUID,
  "operatorId" UUID,
  "supplierId" UUID,
  "providerOrderRef" TEXT,
  "providerTicketRef" TEXT,
  "providerSupportEmail" TEXT,
  "providerSupportUrl" TEXT,
  "forwardedAt" TIMESTAMP(3),
  "providerResponseAt" TIMESTAMP(3),
  "policySnapshot" JSONB,
  "calcSnapshot" JSONB,
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "requestedAmountCents" INTEGER,
  "approvedAmountCents" INTEGER,
  "refundedAmountCents" INTEGER,
  "reason" TEXT,
  "comment" TEXT,
  "paymentProvider" TEXT,
  "paymentRef" TEXT,
  "refundProviderRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "refund_requests_status_createdAt_idx" ON "refund_requests"("status","createdAt");
CREATE INDEX IF NOT EXISTS "refund_requests_paymentMode_createdAt_idx" ON "refund_requests"("paymentMode","createdAt");
CREATE INDEX IF NOT EXISTS "refund_requests_provider_status_createdAt_idx" ON "refund_requests"("provider","status","createdAt");
CREATE INDEX IF NOT EXISTS "refund_requests_operatorId_status_createdAt_idx" ON "refund_requests"("operatorId","status","createdAt");
CREATE INDEX IF NOT EXISTS "refund_requests_supplierId_status_createdAt_idx" ON "refund_requests"("supplierId","status","createdAt");
CREATE INDEX IF NOT EXISTS "refund_requests_paymentRef_idx" ON "refund_requests"("paymentRef");
CREATE UNIQUE INDEX IF NOT EXISTS "refund_requests_one_open_per_ticket"
  ON "refund_requests"("ticketId") WHERE "ticketId" IS NOT NULL AND "status" IN ('REQUESTED','CALCULATED','FORWARDED','WAITING_PROVIDER','APPROVED','PROCESSING');

ALTER TABLE "ledger_entries" ADD COLUMN IF NOT EXISTS "refundRequestId" UUID REFERENCES "refund_requests"("id") ON DELETE SET NULL;

-- 11. settlement_batches
CREATE TABLE IF NOT EXISTS "settlement_batches" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "status" "SettlementBatchStatus" NOT NULL DEFAULT 'DRAFT',
  "periodFrom" TIMESTAMP(3) NOT NULL,
  "periodTo" TIMESTAMP(3) NOT NULL,
  "supplierId" UUID,
  "operatorId" UUID,
  "provider" "ProviderKind",
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "grossCents" INTEGER NOT NULL DEFAULT 0,
  "commissionCents" INTEGER NOT NULL DEFAULT 0,
  "refundsCents" INTEGER NOT NULL DEFAULT 0,
  "payableCents" INTEGER NOT NULL DEFAULT 0,
  "actPdfPath" TEXT,
  "xlsPath" TEXT,
  "snapshot" JSONB,
  "createdByAdminId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "settlement_batches_status_period_idx" ON "settlement_batches"("status","periodFrom","periodTo");
CREATE INDEX IF NOT EXISTS "settlement_batches_supplierId_period_idx" ON "settlement_batches"("supplierId","periodFrom","periodTo");
CREATE INDEX IF NOT EXISTS "settlement_batches_operatorId_period_idx" ON "settlement_batches"("operatorId","periodFrom","periodTo");
CREATE INDEX IF NOT EXISTS "settlement_batches_provider_period_idx" ON "settlement_batches"("provider","periodFrom","periodTo");

-- 12. settlement_batch_items
CREATE TABLE IF NOT EXISTS "settlement_batch_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "batchId" UUID NOT NULL REFERENCES "settlement_batches"("id") ON DELETE CASCADE,
  "ledgerEntryId" UUID NOT NULL REFERENCES "ledger_entries"("id") ON DELETE RESTRICT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("batchId","ledgerEntryId")
);
CREATE INDEX IF NOT EXISTS "settlement_batch_items_batchId_idx" ON "settlement_batch_items"("batchId");
CREATE INDEX IF NOT EXISTS "settlement_batch_items_ledgerEntryId_idx" ON "settlement_batch_items"("ledgerEntryId");

-- 13. report_runs
CREATE TABLE IF NOT EXISTS "report_runs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" "ReportType" NOT NULL,
  "status" "ReportStatus" NOT NULL DEFAULT 'QUEUED',
  "requestedByAdminId" UUID,
  "requestedBySupplierUserId" UUID,
  "requestedByOperatorUserId" UUID,
  "supplierId" UUID,
  "operatorId" UUID,
  "provider" "ProviderKind",
  "params" JSONB NOT NULL,
  "rowCount" INTEGER,
  "fileXlsPath" TEXT,
  "filePdfPath" TEXT,
  "error" TEXT,
  "sendToEmail" TEXT,
  "emailedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "report_runs_type_status_createdAt_idx" ON "report_runs"("type","status","createdAt");
CREATE INDEX IF NOT EXISTS "report_runs_supplierId_createdAt_idx" ON "report_runs"("supplierId","createdAt");
CREATE INDEX IF NOT EXISTS "report_runs_operatorId_createdAt_idx" ON "report_runs"("operatorId","createdAt");
CREATE INDEX IF NOT EXISTS "report_runs_provider_createdAt_idx" ON "report_runs"("provider","createdAt");
CREATE INDEX IF NOT EXISTS "report_runs_sendToEmail_status_idx" ON "report_runs"("sendToEmail","status");
