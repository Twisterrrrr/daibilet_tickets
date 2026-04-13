-- Catalog foundation reset (clean DB or manual drop of legacy catalog objects).
-- Не применять на проде с существующей историей миграций без отдельного плана:
-- см. packages/backend/prisma/CATALOG_FOUNDATION_MIGRATION.md
--

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "SupplierRole" AS ENUM ('OWNER', 'MANAGER', 'CONTENT', 'ACCOUNTANT');

-- CreateEnum
CREATE TYPE "OperatorStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CheckoutStatus" AS ENUM ('STARTED', 'VALIDATED', 'REDIRECTED', 'PENDING_CONFIRMATION', 'CONFIRMED', 'AWAITING_PAYMENT', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('MANUAL', 'TICKETSCLOUD', 'TEPLOHOD', 'EXTERNAL_API');

-- CreateEnum
CREATE TYPE "SessionOwnerKind" AS ENUM ('EVENT', 'ADMISSION');

-- CreateEnum
CREATE TYPE "OfferOwnerKind" AS ENUM ('EVENT', 'ADMISSION');

-- CreateEnum
CREATE TYPE "ProviderEntityKind" AS ENUM ('EVENT', 'ADMISSION', 'SESSION', 'OFFER', 'LOCATION');

-- CreateEnum
CREATE TYPE "EventFormat" AS ENUM ('EXCURSION', 'CRUISE', 'CONCERT', 'PERFORMANCE', 'EXHIBITION_EVENT', 'TOUR', 'MASTER_CLASS', 'FESTIVAL', 'LECTURE', 'OTHER');

-- CreateEnum
CREATE TYPE "EventDateMode" AS ENUM ('ONE_TIME', 'SCHEDULED', 'OPEN_DATE');

-- CreateEnum
CREATE TYPE "AdmissionType" AS ENUM ('MUSEUM_ENTRY', 'EXHIBITION_ENTRY', 'OBSERVATION_ENTRY', 'PARK_ENTRY', 'ATTRACTION_ENTRY', 'COMPLEX_ENTRY', 'OTHER');

-- CreateEnum
CREATE TYPE "LocationKind" AS ENUM ('MUSEUM', 'VENUE', 'LANDMARK', 'PIER', 'PARK', 'DISTRICT', 'ROUTE_OBJECT', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketProviderCode" AS ENUM ('MANUAL', 'TICKETS_CLOUD', 'TEPLOHOD', 'RADARIO', 'QTICKETS', 'INTICKETS', 'EDINOE_POLE', 'TICKETNET', 'YANDEX_TICKETS', 'MOSRU_RUSSPASS', 'LANIT');

-- CreateEnum
CREATE TYPE "ProviderProtocolType" AS ENUM ('REST_JSON', 'SOAP_XML', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ProviderOperationalClass" AS ENUM ('CORE_REST', 'ENTERPRISE_GATED', 'LEGACY_SOAP', 'CUSTOM_PARTNER');

-- CreateEnum
CREATE TYPE "ProviderAccountAuthType" AS ENUM ('NONE', 'API_KEY', 'BEARER', 'BASIC', 'OAUTH2', 'MUTUAL_TLS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ProviderAccountEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "ProviderLinkStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');

-- CreateEnum
CREATE TYPE "ProviderSyncMode" AS ENUM ('PULL', 'PUSH', 'MANUAL', 'DISABLED');

-- CreateEnum
CREATE TYPE "ExternalOrderStatus" AS ENUM ('OPEN', 'CONFIRMED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "ExternalIntegrationState" AS ENUM ('CREATED', 'SENT_TO_PROVIDER', 'AWAITING_CONFIRMATION', 'CONFIRMED', 'FAILED', 'RECONCILE_REQUIRED');

-- CreateEnum
CREATE TYPE "ProviderWebhookProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'ERROR', 'NO_OP_UNSUPPORTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PurchaseFlow" AS ENUM ('PLATFORM', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'RESERVING', 'RESERVED', 'CONFIRMED', 'REFUND_PENDING', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RefundRequestStatus" AS ENUM ('CREATED', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RefundRequestReason" AS ENUM ('USER_REQUEST', 'EVENT_CANCELLED', 'SUPPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "RefundCreatedByType" AS ENUM ('ADMIN', 'USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "IdempotencyScope" AS ENUM ('YOOKASSA_WEBHOOK', 'CHECKOUT_CREATE', 'EMAIL_SEND', 'EXTERNAL_CALLBACK');

-- CreateEnum
CREATE TYPE "ExternalWidgetProviderKind" AS ENUM ('TEPLOHOD');

-- CreateEnum
CREATE TYPE "ChatConversationStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ChatAuthorType" AS ENUM ('CUSTOMER', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('ORDER', 'REFUND', 'VENUE', 'TECHNICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "SupplierLedgerEntryType" AS ENUM ('SALE', 'COMMISSION', 'REFUND', 'PAYOUT', 'ADJUSTMENT', 'CHARGEBACK_ADJUSTMENT', 'FEE_RECHARGE');

-- CreateEnum
CREATE TYPE "SupplierReportBasis" AS ENUM ('SOLD', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SupplierReportStatus" AS ENUM ('DRAFT', 'FINAL');

-- CreateEnum
CREATE TYPE "SupplierReportLineType" AS ENUM ('SALE', 'COMMISSION', 'REFUND', 'PAYOUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "SupplierDocumentType" AS ENUM ('AGENT_REPORT', 'SERVICE_ACT', 'UPD', 'INVOICE', 'VAT_INVOICE', 'COMMISSION_ACT', 'PAYOUT_STATEMENT');

-- CreateEnum
CREATE TYPE "SupplierDocumentStatus" AS ENUM ('DRAFT', 'GENERATED', 'ISSUED', 'SENT', 'DELIVERED', 'SIGNED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ClosingDocumentMode" AS ENUM ('UPD', 'ACT');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('DRAFT', 'CALCULATED', 'APPROVED', 'FINALIZED', 'PAID', 'CANCELED');

-- CreateEnum
CREATE TYPE "SupplierDocumentFileKind" AS ENUM ('PDF', 'JSON_SNAPSHOT');

-- CreateEnum
CREATE TYPE "SupplierDisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SupplierDisputeReasonCategory" AS ENUM ('WRONG_COMMISSION', 'MISSING_SALE', 'WRONG_DETAILS', 'OTHER');

-- CreateEnum
CREATE TYPE "SupplierLegalProfileStatus" AS ENUM ('DRAFT', 'INCOMPLETE', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TaxMode" AS ENUM ('OSNO', 'USN_6', 'USN_15', 'AUSN', 'NPD');

-- CreateEnum
CREATE TYPE "SupplierDocumentTemplateType" AS ENUM ('AGENT_REPORT', 'COMMISSION_ACT', 'PAYOUT_STATEMENT');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('SINGLE_MERCHANT', 'AGENT_SINGLE_PAYOUT', 'SPLIT_MERCHANT');

-- CreateEnum
CREATE TYPE "PspFeeMode" AS ENUM ('PLATFORM_PAYS', 'SUPPLIER_PAYS', 'SHARED_50_50', 'SERVICE_FEE');

-- CreateEnum
CREATE TYPE "EdoProviderType" AS ENUM ('NOOP', 'DIADOK');

-- CreateEnum
CREATE TYPE "EdoDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'SIGNED', 'REJECTED', 'ERROR');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'EDITOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "refreshTokenHash" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "refreshTokenHash" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_favorites" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "eventSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "heroImage" TEXT,
    "lat" DECIMAL(10,7),
    "lng" DECIMAL(10,7),
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Moscow',
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regions" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "heroImage" TEXT,
    "hubCityId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "region_cities" (
    "regionId" UUID NOT NULL,
    "cityId" UUID NOT NULL,

    CONSTRAINT "region_cities_pkey" PRIMARY KEY ("regionId","cityId")
);

-- CreateTable
CREATE TABLE "provider_webhook_logs" (
    "id" UUID NOT NULL,
    "provider" "TicketProviderCode" NOT NULL,
    "processingStatus" "ProviderWebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB NOT NULL,
    "headersJson" JSONB,
    "notes" TEXT,
    "errorMessage" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "provider_webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_account_configs" (
    "id" UUID NOT NULL,
    "provider" "TicketProviderCode" NOT NULL,
    "protocolType" "ProviderProtocolType" NOT NULL,
    "operationalClass" "ProviderOperationalClass" NOT NULL,
    "authType" "ProviderAccountAuthType" NOT NULL,
    "environment" "ProviderAccountEnvironment" NOT NULL,
    "sandboxBaseUrl" TEXT,
    "productionBaseUrl" TEXT,
    "requiresClientCertificate" BOOLEAN NOT NULL DEFAULT false,
    "credentialsJson" JSONB,
    "settingsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_account_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operators" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "website" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" "OperatorStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "archiveReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isSupplier" BOOLEAN NOT NULL DEFAULT false,
    "trustLevel" INTEGER NOT NULL DEFAULT 0,
    "trustScore" INTEGER NOT NULL DEFAULT 0,
    "trustProfileScore" INTEGER NOT NULL DEFAULT 0,
    "trustCatalogScore" INTEGER NOT NULL DEFAULT 0,
    "trustOperationsScore" INTEGER NOT NULL DEFAULT 0,
    "trustReputationScore" INTEGER NOT NULL DEFAULT 0,
    "trustStabilityScore" INTEGER NOT NULL DEFAULT 0,
    "trustPenaltyScore" INTEGER NOT NULL DEFAULT 0,
    "trustLastCalculatedAt" TIMESTAMP(3),
    "trustManualOverrideLevel" INTEGER,
    "trustManualOverrideScore" INTEGER,
    "trustManualReason" TEXT,
    "trustManualExpiresAt" TIMESTAMP(3),
    "commissionRate" DECIMAL(5,4) NOT NULL DEFAULT 0.25,
    "promoRate" DECIMAL(5,4),
    "promoUntil" TIMESTAMP(3),
    "yookassaAccountId" TEXT,
    "companyName" TEXT,
    "inn" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "successfulSales" INTEGER NOT NULL DEFAULT 0,
    "refundRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "settlementMode" TEXT DEFAULT 'DIRECT',
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "defaultRefundPolicyText" TEXT,
    "defaultRefundPolicyUpdatedAt" TIMESTAMP(3),
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'SINGLE_MERCHANT',
    "agentSchemeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "splitEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pspFeeMode" "PspFeeMode" NOT NULL DEFAULT 'PLATFORM_PAYS',

    CONSTRAINT "operators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "LocationKind" NOT NULL,
    "cityId" UUID NOT NULL,
    "operatorId" UUID,
    "source" "SourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceRef" TEXT,
    "address" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publishStatus" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "summary" TEXT,
    "description" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "format" "EventFormat" NOT NULL,
    "dateMode" "EventDateMode" NOT NULL,
    "cityId" UUID NOT NULL,
    "locationId" UUID,
    "operatorId" UUID,
    "source" "SourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceRef" TEXT,
    "summary" TEXT,
    "description" TEXT,
    "durationMinutes" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publishStatus" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admission_products" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "AdmissionType" NOT NULL,
    "cityId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "operatorId" UUID,
    "source" "SourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceRef" TEXT,
    "summary" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publishStatus" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admission_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_sessions" (
    "id" UUID NOT NULL,
    "ownerKind" "SessionOwnerKind" NOT NULL,
    "eventId" UUID,
    "admissionProductId" UUID,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "capacity" INTEGER,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_offers" (
    "id" UUID NOT NULL,
    "ownerKind" "OfferOwnerKind" NOT NULL,
    "eventId" UUID,
    "admissionProductId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'RUB',
    "priceFrom" DECIMAL(10,2),
    "priceTo" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_links" (
    "id" UUID NOT NULL,
    "source" "SourceType" NOT NULL,
    "entityKind" "ProviderEntityKind" NOT NULL,
    "eventId" UUID,
    "admissionProductId" UUID,
    "sessionId" UUID,
    "offerId" UUID,
    "locationId" UUID,
    "externalId" TEXT NOT NULL,
    "externalParentId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_config" (
    "id" UUID NOT NULL,
    "serviceFeePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "peakMarkupPercent" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "lastMinutePercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "tcCommissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "peakRanges" JSONB NOT NULL DEFAULT '[]',
    "updatedBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upsell_items" (
    "id" UUID NOT NULL,
    "citySlug" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priceKopecks" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upsell_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_status" (
    "id" UUID NOT NULL,
    "lastFullSyncAt" TIMESTAMP(3),
    "lastIncrSyncAt" TIMESTAMP(3),
    "lastRetagAt" TIMESTAMP(3),
    "lastPopulateAt" TIMESTAMP(3),
    "lastCacheFlush" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_status_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "supplier_legal_profiles" (
    "id" TEXT NOT NULL,
    "operatorId" UUID NOT NULL,
    "legalName" TEXT NOT NULL,
    "legalAddress" TEXT,
    "inn" TEXT,
    "kpp" TEXT,
    "ogrn" TEXT,
    "taxMode" "TaxMode" NOT NULL DEFAULT 'OSNO',
    "isVatPayer" BOOLEAN NOT NULL DEFAULT false,
    "defaultVatRate" DECIMAL(5,2),
    "signerFullName" TEXT,
    "signerPosition" TEXT,
    "financeEmail" TEXT,
    "docsEmail" TEXT,
    "generateInvoiceDocuments" BOOLEAN NOT NULL DEFAULT false,
    "closingDocumentMode" "ClosingDocumentMode" NOT NULL DEFAULT 'UPD',
    "status" "SupplierLegalProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "verifiedBy" UUID,
    "verifiedAt" TIMESTAMP(3),
    "rejectionComment" TEXT,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_legal_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_bank_accounts" (
    "id" TEXT NOT NULL,
    "supplierLegalProfileId" TEXT NOT NULL,
    "bankName" TEXT,
    "bik" TEXT,
    "accountNumber" TEXT,
    "correspondentAccount" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL,
    "operatorId" UUID NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'default',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "rateLimit" INTEGER NOT NULL DEFAULT 100,
    "ipWhitelist" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_users" (
    "id" UUID NOT NULL,
    "operatorId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "SupplierRole" NOT NULL DEFAULT 'MANAGER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "refreshTokenHash" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_invitations" (
    "id" UUID NOT NULL,
    "operatorId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "SupplierRole" NOT NULL DEFAULT 'MANAGER',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_sessions" (
    "id" UUID NOT NULL,
    "shortCode" TEXT NOT NULL,
    "userId" UUID,
    "cartSnapshot" JSONB NOT NULL,
    "validatedSnapshot" JSONB,
    "offersSnapshot" JSONB,
    "giftCertificateSnapshot" JSONB,
    "appliedGiftCertificateSnapshot" JSONB,
    "appliedPromoCodeSnapshot" JSONB,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "status" "CheckoutStatus" NOT NULL DEFAULT 'STARTED',
    "totalPrice" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "last_customer_snapshots" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "last_customer_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_certificates" (
    "id" UUID NOT NULL,
    "checkoutSessionId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "senderName" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "gift_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_intents" (
    "id" UUID NOT NULL,
    "checkoutSessionId" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'STUB',
    "providerPaymentId" TEXT,
    "providerData" JSONB,
    "paymentUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "supplierId" UUID,
    "grossAmount" INTEGER,
    "platformFee" INTEGER,
    "supplierAmount" INTEGER,
    "commissionRate" DECIMAL(5,4),
    "splitPaymentId" TEXT,

    CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fulfillment_items" (
    "id" UUID NOT NULL,
    "checkoutSessionId" UUID NOT NULL,
    "lineItemIndex" INTEGER NOT NULL,
    "offerId" UUID NOT NULL,
    "purchaseFlow" "PurchaseFlow" NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'INTERNAL',
    "status" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING',
    "externalOrderId" TEXT,
    "externalPaymentUrl" TEXT,
    "providerData" JSONB,
    "amount" INTEGER NOT NULL,
    "isRedeemed" BOOLEAN NOT NULL DEFAULT false,
    "refundedAmount" INTEGER NOT NULL DEFAULT 0,
    "refundId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "lastError" TEXT,
    "escalatedAt" TIMESTAMP(3),
    "resolvedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fulfillment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_requests" (
    "id" UUID NOT NULL,
    "fulfillmentItemId" UUID NOT NULL,
    "paymentIntentId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "reason" "RefundRequestReason" NOT NULL DEFAULT 'OTHER',
    "reasonNote" TEXT,
    "status" "RefundRequestStatus" NOT NULL DEFAULT 'CREATED',
    "createdByType" "RefundCreatedByType" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_event_logs" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_webhook_events" (
    "id" UUID NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "result" TEXT,
    "paymentIntentId" UUID,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" TEXT NOT NULL,
    "scope" "IdempotencyScope" NOT NULL,
    "key" TEXT NOT NULL,
    "entityId" UUID,
    "status" TEXT NOT NULL,
    "response" JSONB,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "scopeValue" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_widget_providers" (
    "id" TEXT NOT NULL,
    "kind" "ExternalWidgetProviderKind" NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_widget_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_widgets" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT,
    "url" TEXT,
    "metaJson" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_filters" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isSeo" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "query_filters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_conversations" (
    "id" UUID NOT NULL,
    "status" "ChatConversationStatus" NOT NULL DEFAULT 'OPEN',
    "guestName" TEXT,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "userId" UUID,
    "guestTokenHash" TEXT,
    "lastCustomerMessageAt" TIMESTAMP(3),
    "lastAdminMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "authorType" "ChatAuthorType" NOT NULL,
    "authorName" TEXT,
    "authorAdminId" UUID,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_telegram_operator_states" (
    "id" UUID NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "activeConversationId" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_telegram_operator_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL,
    "shortCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "category" "TicketCategory" NOT NULL DEFAULT 'OTHER',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "orderCode" TEXT,
    "assignedTo" UUID,
    "resolvedAt" TIMESTAMP(3),
    "slaDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_responses" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "authorType" TEXT NOT NULL DEFAULT 'admin',
    "authorName" TEXT,
    "message" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_ledger_entries" (
    "id" TEXT NOT NULL,
    "operatorId" UUID NOT NULL,
    "type" "SupplierLedgerEntryType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "referenceType" TEXT,
    "referenceId" TEXT,
    "note" TEXT,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_ledger_entries_pkey" PRIMARY KEY ("id")
);

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
    "isBlockedByDispute" BOOLEAN NOT NULL DEFAULT false,
    "bankAccountSnapshot" JSONB,

    CONSTRAINT "supplier_payout_requests_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "supplier_reports" (
    "id" TEXT NOT NULL,
    "operatorId" UUID NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "basis" "SupplierReportBasis" NOT NULL,
    "status" "SupplierReportStatus" NOT NULL DEFAULT 'DRAFT',
    "hasConflict" BOOLEAN NOT NULL DEFAULT false,
    "supplierAcceptedAt" TIMESTAMP(3),
    "acceptedBySupplierUserId" TEXT,
    "grossAmount" DECIMAL(14,2) NOT NULL,
    "commissionAmount" DECIMAL(14,2) NOT NULL,
    "refundAmount" DECIMAL(14,2) NOT NULL,
    "netAmount" DECIMAL(14,2) NOT NULL,
    "snapshotJson" JSONB,
    "metaJson" JSONB,
    "legalProfileSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_report_lines" (
    "id" TEXT NOT NULL,
    "supplierReportId" TEXT NOT NULL,
    "type" "SupplierReportLineType" NOT NULL,
    "ledgerEntryId" UUID,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "netAmount" DECIMAL(14,2) NOT NULL,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_report_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_disputes" (
    "id" TEXT NOT NULL,
    "supplierReportId" TEXT NOT NULL,
    "operatorId" UUID NOT NULL,
    "status" "SupplierDisputeStatus" NOT NULL DEFAULT 'OPEN',
    "reasonCategory" "SupplierDisputeReasonCategory" NOT NULL,
    "reasonText" TEXT,
    "resolutionText" TEXT,
    "openedBySupplierUserId" UUID,
    "resolvedByAdminId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "supplier_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_documents" (
    "id" TEXT NOT NULL,
    "operatorId" UUID NOT NULL,
    "reportId" TEXT,
    "settlementId" TEXT,
    "type" "SupplierDocumentType" NOT NULL,
    "status" "SupplierDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "payloadJson" JSONB,
    "templateId" TEXT,
    "templateVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_settlements" (
    "id" TEXT NOT NULL,
    "operatorId" UUID NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "grossAmount" DECIMAL(14,2) NOT NULL,
    "commissionAmount" DECIMAL(14,2) NOT NULL,
    "adjustmentAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "status" "SettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "payoutId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_edo_profiles" (
    "id" TEXT NOT NULL,
    "operatorId" UUID NOT NULL,
    "provider" "EdoProviderType" NOT NULL,
    "boxId" TEXT,
    "inn" TEXT NOT NULL,
    "kpp" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settingsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_edo_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edo_deliveries" (
    "id" TEXT NOT NULL,
    "supplierDocumentId" TEXT NOT NULL,
    "supplierEdoProfileId" TEXT NOT NULL,
    "provider" "EdoProviderType" NOT NULL,
    "providerDeliveryId" TEXT,
    "status" "EdoDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "lastStatusAt" TIMESTAMP(3),
    "initiatedByAdminUserId" UUID,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "edo_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_document_files" (
    "id" TEXT NOT NULL,
    "supplierDocumentId" TEXT NOT NULL,
    "kind" "SupplierDocumentFileKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_document_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_document_templates" (
    "id" TEXT NOT NULL,
    "type" "SupplierDocumentTemplateType" NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_document_template_versions" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "schemaJson" JSONB,
    "requiresVatData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_document_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_sequences" (
    "id" TEXT NOT NULL,
    "operatorId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "meta" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "user_favorites_userId_idx" ON "user_favorites"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorites_userId_eventSlug_key" ON "user_favorites"("userId", "eventSlug");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "cities_slug_key" ON "cities"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "regions_slug_key" ON "regions"("slug");

-- CreateIndex
CREATE INDEX "regions_hubCityId_idx" ON "regions"("hubCityId");

-- CreateIndex
CREATE INDEX "region_cities_cityId_idx" ON "region_cities"("cityId");

-- CreateIndex
CREATE INDEX "provider_webhook_logs_provider_receivedAt_idx" ON "provider_webhook_logs"("provider", "receivedAt");

-- CreateIndex
CREATE INDEX "provider_account_configs_provider_environment_idx" ON "provider_account_configs"("provider", "environment");

-- CreateIndex
CREATE UNIQUE INDEX "operators_slug_key" ON "operators"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "locations_slug_key" ON "locations"("slug");

-- CreateIndex
CREATE INDEX "locations_cityId_kind_publishStatus_idx" ON "locations"("cityId", "kind", "publishStatus");

-- CreateIndex
CREATE INDEX "locations_operatorId_idx" ON "locations"("operatorId");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_cityId_publishStatus_idx" ON "events"("cityId", "publishStatus");

-- CreateIndex
CREATE INDEX "events_locationId_idx" ON "events"("locationId");

-- CreateIndex
CREATE INDEX "events_operatorId_idx" ON "events"("operatorId");

-- CreateIndex
CREATE UNIQUE INDEX "admission_products_slug_key" ON "admission_products"("slug");

-- CreateIndex
CREATE INDEX "admission_products_cityId_publishStatus_idx" ON "admission_products"("cityId", "publishStatus");

-- CreateIndex
CREATE INDEX "admission_products_locationId_idx" ON "admission_products"("locationId");

-- CreateIndex
CREATE INDEX "admission_products_operatorId_idx" ON "admission_products"("operatorId");

-- CreateIndex
CREATE INDEX "catalog_sessions_eventId_startsAt_idx" ON "catalog_sessions"("eventId", "startsAt");

-- CreateIndex
CREATE INDEX "catalog_sessions_admissionProductId_startsAt_idx" ON "catalog_sessions"("admissionProductId", "startsAt");

-- CreateIndex
CREATE INDEX "catalog_offers_eventId_isActive_idx" ON "catalog_offers"("eventId", "isActive");

-- CreateIndex
CREATE INDEX "catalog_offers_admissionProductId_isActive_idx" ON "catalog_offers"("admissionProductId", "isActive");

-- CreateIndex
CREATE INDEX "provider_links_eventId_idx" ON "provider_links"("eventId");

-- CreateIndex
CREATE INDEX "provider_links_admissionProductId_idx" ON "provider_links"("admissionProductId");

-- CreateIndex
CREATE INDEX "provider_links_sessionId_idx" ON "provider_links"("sessionId");

-- CreateIndex
CREATE INDEX "provider_links_offerId_idx" ON "provider_links"("offerId");

-- CreateIndex
CREATE INDEX "provider_links_locationId_idx" ON "provider_links"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "provider_links_source_entityKind_externalId_key" ON "provider_links"("source", "entityKind", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_trust_overrides_supplierId_key" ON "supplier_trust_overrides"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_legal_profiles_operatorId_key" ON "supplier_legal_profiles"("operatorId");

-- CreateIndex
CREATE INDEX "supplier_bank_accounts_supplierLegalProfileId_idx" ON "supplier_bank_accounts"("supplierLegalProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_operatorId_idx" ON "api_keys"("operatorId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_users_email_key" ON "supplier_users"("email");

-- CreateIndex
CREATE INDEX "supplier_users_operatorId_idx" ON "supplier_users"("operatorId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_invitations_token_key" ON "supplier_invitations"("token");

-- CreateIndex
CREATE INDEX "supplier_invitations_operatorId_idx" ON "supplier_invitations"("operatorId");

-- CreateIndex
CREATE INDEX "supplier_invitations_token_idx" ON "supplier_invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_sessions_shortCode_key" ON "checkout_sessions"("shortCode");

-- CreateIndex
CREATE INDEX "checkout_sessions_status_idx" ON "checkout_sessions"("status");

-- CreateIndex
CREATE INDEX "checkout_sessions_customerEmail_idx" ON "checkout_sessions"("customerEmail");

-- CreateIndex
CREATE INDEX "checkout_sessions_userId_idx" ON "checkout_sessions"("userId");

-- CreateIndex
CREATE INDEX "checkout_sessions_status_expiresAt_idx" ON "checkout_sessions"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "last_customer_snapshots_email_key" ON "last_customer_snapshots"("email");

-- CreateIndex
CREATE UNIQUE INDEX "gift_certificates_checkoutSessionId_key" ON "gift_certificates"("checkoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "gift_certificates_code_key" ON "gift_certificates"("code");

-- CreateIndex
CREATE INDEX "gift_certificates_code_idx" ON "gift_certificates"("code");

-- CreateIndex
CREATE INDEX "gift_certificates_recipientEmail_idx" ON "gift_certificates"("recipientEmail");

-- CreateIndex
CREATE INDEX "gift_certificates_status_idx" ON "gift_certificates"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_idempotencyKey_key" ON "payment_intents"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payment_intents_checkoutSessionId_idx" ON "payment_intents"("checkoutSessionId");

-- CreateIndex
CREATE INDEX "payment_intents_status_idx" ON "payment_intents"("status");

-- CreateIndex
CREATE INDEX "payment_intents_provider_providerPaymentId_idx" ON "payment_intents"("provider", "providerPaymentId");

-- CreateIndex
CREATE INDEX "payment_intents_supplierId_idx" ON "payment_intents"("supplierId");

-- CreateIndex
CREATE INDEX "fulfillment_items_checkoutSessionId_idx" ON "fulfillment_items"("checkoutSessionId");

-- CreateIndex
CREATE INDEX "fulfillment_items_offerId_idx" ON "fulfillment_items"("offerId");

-- CreateIndex
CREATE INDEX "fulfillment_items_status_idx" ON "fulfillment_items"("status");

-- CreateIndex
CREATE INDEX "fulfillment_items_status_nextRetryAt_idx" ON "fulfillment_items"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "fulfillment_items_status_escalatedAt_idx" ON "fulfillment_items"("status", "escalatedAt");

-- CreateIndex
CREATE INDEX "refund_requests_fulfillmentItemId_idx" ON "refund_requests"("fulfillmentItemId");

-- CreateIndex
CREATE INDEX "refund_requests_paymentIntentId_idx" ON "refund_requests"("paymentIntentId");

-- CreateIndex
CREATE INDEX "refund_requests_status_idx" ON "refund_requests"("status");

-- CreateIndex
CREATE INDEX "payment_event_logs_provider_eventType_idx" ON "payment_event_logs"("provider", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "payment_event_logs_provider_eventType_paymentId_key" ON "payment_event_logs"("provider", "eventType", "paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "processed_webhook_events_dedupeKey_key" ON "processed_webhook_events"("dedupeKey");

-- CreateIndex
CREATE INDEX "processed_webhook_events_provider_eventType_idx" ON "processed_webhook_events"("provider", "eventType");

-- CreateIndex
CREATE INDEX "processed_webhook_events_paymentIntentId_idx" ON "processed_webhook_events"("paymentIntentId");

-- CreateIndex
CREATE INDEX "processed_webhook_events_providerEventId_idx" ON "processed_webhook_events"("providerEventId");

-- CreateIndex
CREATE INDEX "idempotency_keys_expiresAt_idx" ON "idempotency_keys"("expiresAt");

-- CreateIndex
CREATE INDEX "idempotency_keys_entityId_idx" ON "idempotency_keys"("entityId");

-- CreateIndex
CREATE INDEX "idempotency_keys_status_idx" ON "idempotency_keys"("status");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_scope_key_key" ON "idempotency_keys"("scope", "key");

-- CreateIndex
CREATE INDEX "feature_flags_key_scope_idx" ON "feature_flags"("key", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_scope_scopeValue_key" ON "feature_flags"("key", "scope", "scopeValue");

-- CreateIndex
CREATE UNIQUE INDEX "external_widget_providers_kind_key" ON "external_widget_providers"("kind");

-- CreateIndex
CREATE INDEX "external_widget_providers_isActive_idx" ON "external_widget_providers"("isActive");

-- CreateIndex
CREATE INDEX "external_widgets_providerId_idx" ON "external_widgets"("providerId");

-- CreateIndex
CREATE INDEX "external_widgets_isActive_idx" ON "external_widgets"("isActive");

-- CreateIndex
CREATE INDEX "external_widgets_updatedAt_idx" ON "external_widgets"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "external_widgets_providerId_externalId_key" ON "external_widgets"("providerId", "externalId");

-- CreateIndex
CREATE INDEX "query_filters_type_idx" ON "query_filters"("type");

-- CreateIndex
CREATE INDEX "query_filters_type_group_idx" ON "query_filters"("type", "group");

-- CreateIndex
CREATE UNIQUE INDEX "query_filters_slug_type_key" ON "query_filters"("slug", "type");

-- CreateIndex
CREATE INDEX "chat_conversations_status_idx" ON "chat_conversations"("status");

-- CreateIndex
CREATE INDEX "chat_conversations_guestEmail_idx" ON "chat_conversations"("guestEmail");

-- CreateIndex
CREATE INDEX "chat_conversations_userId_idx" ON "chat_conversations"("userId");

-- CreateIndex
CREATE INDEX "chat_conversations_lastCustomerMessageAt_idx" ON "chat_conversations"("lastCustomerMessageAt");

-- CreateIndex
CREATE INDEX "chat_messages_conversationId_idx" ON "chat_messages"("conversationId");

-- CreateIndex
CREATE INDEX "chat_messages_createdAt_idx" ON "chat_messages"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "chat_telegram_operator_states_telegramUserId_key" ON "chat_telegram_operator_states"("telegramUserId");

-- CreateIndex
CREATE INDEX "chat_telegram_operator_states_activeConversationId_idx" ON "chat_telegram_operator_states"("activeConversationId");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_shortCode_key" ON "support_tickets"("shortCode");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_tickets_email_idx" ON "support_tickets"("email");

-- CreateIndex
CREATE INDEX "support_tickets_orderCode_idx" ON "support_tickets"("orderCode");

-- CreateIndex
CREATE INDEX "support_tickets_category_status_idx" ON "support_tickets"("category", "status");

-- CreateIndex
CREATE INDEX "support_tickets_assignedTo_idx" ON "support_tickets"("assignedTo");

-- CreateIndex
CREATE INDEX "ticket_responses_ticketId_idx" ON "ticket_responses"("ticketId");

-- CreateIndex
CREATE INDEX "supplier_ledger_entries_operatorId_idx" ON "supplier_ledger_entries"("operatorId");

-- CreateIndex
CREATE INDEX "supplier_payout_requests_operatorId_idx" ON "supplier_payout_requests"("operatorId");

-- CreateIndex
CREATE INDEX "supplier_daily_stats_operatorId_idx" ON "supplier_daily_stats"("operatorId");

-- CreateIndex
CREATE INDEX "supplier_daily_stats_date_idx" ON "supplier_daily_stats"("date");

-- CreateIndex
CREATE INDEX "supplier_daily_stats_operatorId_date_idx" ON "supplier_daily_stats"("operatorId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_daily_stats_operatorId_date_key" ON "supplier_daily_stats"("operatorId", "date");

-- CreateIndex
CREATE INDEX "supplier_reports_operatorId_periodStart_periodEnd_idx" ON "supplier_reports"("operatorId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_reports_operatorId_periodStart_periodEnd_basis_key" ON "supplier_reports"("operatorId", "periodStart", "periodEnd", "basis");

-- CreateIndex
CREATE INDEX "supplier_report_lines_supplierReportId_idx" ON "supplier_report_lines"("supplierReportId");

-- CreateIndex
CREATE INDEX "supplier_report_lines_ledgerEntryId_idx" ON "supplier_report_lines"("ledgerEntryId");

-- CreateIndex
CREATE INDEX "supplier_disputes_supplierReportId_idx" ON "supplier_disputes"("supplierReportId");

-- CreateIndex
CREATE INDEX "supplier_disputes_operatorId_status_idx" ON "supplier_disputes"("operatorId", "status");

-- CreateIndex
CREATE INDEX "supplier_documents_operatorId_idx" ON "supplier_documents"("operatorId");

-- CreateIndex
CREATE INDEX "supplier_documents_reportId_idx" ON "supplier_documents"("reportId");

-- CreateIndex
CREATE INDEX "supplier_documents_settlementId_idx" ON "supplier_documents"("settlementId");

-- CreateIndex
CREATE INDEX "supplier_settlements_operatorId_periodStart_periodEnd_idx" ON "supplier_settlements"("operatorId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_edo_profiles_operatorId_key" ON "supplier_edo_profiles"("operatorId");

-- CreateIndex
CREATE INDEX "edo_deliveries_supplierDocumentId_idx" ON "edo_deliveries"("supplierDocumentId");

-- CreateIndex
CREATE INDEX "edo_deliveries_supplierEdoProfileId_idx" ON "edo_deliveries"("supplierEdoProfileId");

-- CreateIndex
CREATE INDEX "edo_deliveries_status_idx" ON "edo_deliveries"("status");

-- CreateIndex
CREATE INDEX "edo_deliveries_provider_providerDeliveryId_idx" ON "edo_deliveries"("provider", "providerDeliveryId");

-- CreateIndex
CREATE INDEX "supplier_document_files_supplierDocumentId_idx" ON "supplier_document_files"("supplierDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_document_templates_code_key" ON "supplier_document_templates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_document_template_versions_templateId_version_key" ON "supplier_document_template_versions"("templateId", "version");

-- CreateIndex
CREATE INDEX "document_sequences_operatorId_year_type_idx" ON "document_sequences"("operatorId", "year", "type");

-- CreateIndex
CREATE UNIQUE INDEX "document_sequences_operatorId_year_type_key" ON "document_sequences"("operatorId", "year", "type");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt");

-- AddForeignKey
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regions" ADD CONSTRAINT "regions_hubCityId_fkey" FOREIGN KEY ("hubCityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "region_cities" ADD CONSTRAINT "region_cities_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "region_cities" ADD CONSTRAINT "region_cities_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_products" ADD CONSTRAINT "admission_products_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_products" ADD CONSTRAINT "admission_products_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_products" ADD CONSTRAINT "admission_products_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_sessions" ADD CONSTRAINT "catalog_sessions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_sessions" ADD CONSTRAINT "catalog_sessions_admissionProductId_fkey" FOREIGN KEY ("admissionProductId") REFERENCES "admission_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_offers" ADD CONSTRAINT "catalog_offers_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_offers" ADD CONSTRAINT "catalog_offers_admissionProductId_fkey" FOREIGN KEY ("admissionProductId") REFERENCES "admission_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_links" ADD CONSTRAINT "provider_links_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_links" ADD CONSTRAINT "provider_links_admissionProductId_fkey" FOREIGN KEY ("admissionProductId") REFERENCES "admission_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_links" ADD CONSTRAINT "provider_links_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "catalog_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_links" ADD CONSTRAINT "provider_links_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "catalog_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_links" ADD CONSTRAINT "provider_links_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_trust_overrides" ADD CONSTRAINT "supplier_trust_overrides_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_legal_profiles" ADD CONSTRAINT "supplier_legal_profiles_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bank_accounts" ADD CONSTRAINT "supplier_bank_accounts_supplierLegalProfileId_fkey" FOREIGN KEY ("supplierLegalProfileId") REFERENCES "supplier_legal_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_users" ADD CONSTRAINT "supplier_users_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invitations" ADD CONSTRAINT "supplier_invitations_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_certificates" ADD CONSTRAINT "gift_certificates_checkoutSessionId_fkey" FOREIGN KEY ("checkoutSessionId") REFERENCES "checkout_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_checkoutSessionId_fkey" FOREIGN KEY ("checkoutSessionId") REFERENCES "checkout_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_items" ADD CONSTRAINT "fulfillment_items_checkoutSessionId_fkey" FOREIGN KEY ("checkoutSessionId") REFERENCES "checkout_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_fulfillmentItemId_fkey" FOREIGN KEY ("fulfillmentItemId") REFERENCES "fulfillment_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "payment_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_widgets" ADD CONSTRAINT "external_widgets_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "external_widget_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_telegram_operator_states" ADD CONSTRAINT "chat_telegram_operator_states_activeConversationId_fkey" FOREIGN KEY ("activeConversationId") REFERENCES "chat_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_responses" ADD CONSTRAINT "ticket_responses_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payout_requests" ADD CONSTRAINT "supplier_payout_requests_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_daily_stats" ADD CONSTRAINT "supplier_daily_stats_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_reports" ADD CONSTRAINT "supplier_reports_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_report_lines" ADD CONSTRAINT "supplier_report_lines_supplierReportId_fkey" FOREIGN KEY ("supplierReportId") REFERENCES "supplier_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_disputes" ADD CONSTRAINT "supplier_disputes_supplierReportId_fkey" FOREIGN KEY ("supplierReportId") REFERENCES "supplier_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_disputes" ADD CONSTRAINT "supplier_disputes_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "supplier_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "supplier_settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "supplier_document_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "supplier_document_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_settlements" ADD CONSTRAINT "supplier_settlements_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_edo_profiles" ADD CONSTRAINT "supplier_edo_profiles_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edo_deliveries" ADD CONSTRAINT "edo_deliveries_supplierDocumentId_fkey" FOREIGN KEY ("supplierDocumentId") REFERENCES "supplier_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edo_deliveries" ADD CONSTRAINT "edo_deliveries_supplierEdoProfileId_fkey" FOREIGN KEY ("supplierEdoProfileId") REFERENCES "supplier_edo_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_document_files" ADD CONSTRAINT "supplier_document_files_supplierDocumentId_fkey" FOREIGN KEY ("supplierDocumentId") REFERENCES "supplier_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_document_template_versions" ADD CONSTRAINT "supplier_document_template_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "supplier_document_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Catalog foundation: CHECK (полиморфные Session / Offer / ProviderLink)
-- и partial unique для импорта (source + sourceRef), не генерируются Prisma.
-- ---------------------------------------------------------------------------

-- Session: ровно один из eventId / admissionProductId согласован с ownerKind
ALTER TABLE "catalog_sessions" ADD CONSTRAINT "catalog_sessions_owner_check" CHECK (
  ("ownerKind" = 'EVENT'::"SessionOwnerKind" AND "eventId" IS NOT NULL AND "admissionProductId" IS NULL)
  OR
  ("ownerKind" = 'ADMISSION'::"SessionOwnerKind" AND "admissionProductId" IS NOT NULL AND "eventId" IS NULL)
);

-- Offer: аналогично
ALTER TABLE "catalog_offers" ADD CONSTRAINT "catalog_offers_owner_check" CHECK (
  ("ownerKind" = 'EVENT'::"OfferOwnerKind" AND "eventId" IS NOT NULL AND "admissionProductId" IS NULL)
  OR
  ("ownerKind" = 'ADMISSION'::"OfferOwnerKind" AND "admissionProductId" IS NOT NULL AND "eventId" IS NULL)
);

-- ProviderLink: ровно одна ссылка на сущность
ALTER TABLE "provider_links" ADD CONSTRAINT "provider_links_exactly_one_target" CHECK (
  (CASE WHEN "eventId" IS NOT NULL THEN 1 ELSE 0 END)
  + (CASE WHEN "admissionProductId" IS NOT NULL THEN 1 ELSE 0 END)
  + (CASE WHEN "sessionId" IS NOT NULL THEN 1 ELSE 0 END)
  + (CASE WHEN "offerId" IS NOT NULL THEN 1 ELSE 0 END)
  + (CASE WHEN "locationId" IS NOT NULL THEN 1 ELSE 0 END) = 1
);

-- ProviderLink: entityKind согласован с заполненной колонкой
ALTER TABLE "provider_links" ADD CONSTRAINT "provider_links_entity_kind_match" CHECK (
  ("entityKind" = 'EVENT'::"ProviderEntityKind" AND "eventId" IS NOT NULL AND "admissionProductId" IS NULL AND "sessionId" IS NULL AND "offerId" IS NULL AND "locationId" IS NULL)
  OR
  ("entityKind" = 'ADMISSION'::"ProviderEntityKind" AND "admissionProductId" IS NOT NULL AND "eventId" IS NULL AND "sessionId" IS NULL AND "offerId" IS NULL AND "locationId" IS NULL)
  OR
  ("entityKind" = 'SESSION'::"ProviderEntityKind" AND "sessionId" IS NOT NULL AND "eventId" IS NULL AND "admissionProductId" IS NULL AND "offerId" IS NULL AND "locationId" IS NULL)
  OR
  ("entityKind" = 'OFFER'::"ProviderEntityKind" AND "offerId" IS NOT NULL AND "eventId" IS NULL AND "admissionProductId" IS NULL AND "sessionId" IS NULL AND "locationId" IS NULL)
  OR
  ("entityKind" = 'LOCATION'::"ProviderEntityKind" AND "locationId" IS NOT NULL AND "eventId" IS NULL AND "admissionProductId" IS NULL AND "sessionId" IS NULL AND "offerId" IS NULL)
);

-- Partial unique: импортные ключи (sourceRef nullable — без дублей NULL,NULL)
CREATE UNIQUE INDEX "events_source_source_ref_partial_uq" ON "events" ("source", "sourceRef") WHERE "sourceRef" IS NOT NULL;

CREATE UNIQUE INDEX "admission_products_source_source_ref_partial_uq" ON "admission_products" ("source", "sourceRef") WHERE "sourceRef" IS NOT NULL;

CREATE UNIQUE INDEX "locations_source_source_ref_partial_uq" ON "locations" ("source", "sourceRef") WHERE "sourceRef" IS NOT NULL;

-- Витрина: глобальные фильтры по времени / активности (дополнение к составным индексам Prisma)
CREATE INDEX "catalog_sessions_startsAt_idx" ON "catalog_sessions"("startsAt");

CREATE INDEX "catalog_offers_isActive_idx" ON "catalog_offers"("isActive");


