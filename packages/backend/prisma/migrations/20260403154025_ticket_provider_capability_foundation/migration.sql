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

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "defaultProvider" "TicketProviderCode";

-- CreateTable
CREATE TABLE "event_provider_links" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "provider" "TicketProviderCode" NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "syncMode" "ProviderSyncMode" NOT NULL DEFAULT 'PULL',
    "status" "ProviderLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "configJson" JSONB,
    "rawSnapshotJson" JSONB,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_provider_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_session_provider_links" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "provider" "TicketProviderCode" NOT NULL,
    "externalSessionId" TEXT NOT NULL,
    "syncMode" "ProviderSyncMode" NOT NULL DEFAULT 'PULL',
    "status" "ProviderLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "configJson" JSONB,
    "rawSnapshotJson" JSONB,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_session_provider_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_order_links" (
    "id" UUID NOT NULL,
    "provider" "TicketProviderCode" NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "status" "ExternalOrderStatus" NOT NULL DEFAULT 'OPEN',
    "integrationState" "ExternalIntegrationState" NOT NULL DEFAULT 'CREATED',
    "payloadJson" JSONB,
    "lastError" TEXT,
    "checkoutSessionId" UUID,
    "packageId" UUID,
    "packageItemId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_order_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_tickets" (
    "id" UUID NOT NULL,
    "externalOrderLinkId" UUID NOT NULL,
    "provider" "TicketProviderCode" NOT NULL,
    "externalTicketId" TEXT NOT NULL,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_tickets_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE INDEX "event_provider_links_eventId_idx" ON "event_provider_links"("eventId");

-- CreateIndex
CREATE INDEX "event_provider_links_eventId_isPrimary_idx" ON "event_provider_links"("eventId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "event_provider_links_provider_externalEventId_key" ON "event_provider_links"("provider", "externalEventId");

-- CreateIndex
CREATE INDEX "event_session_provider_links_sessionId_idx" ON "event_session_provider_links"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "event_session_provider_links_provider_externalSessionId_key" ON "event_session_provider_links"("provider", "externalSessionId");

-- CreateIndex
CREATE INDEX "external_order_links_checkoutSessionId_idx" ON "external_order_links"("checkoutSessionId");

-- CreateIndex
CREATE INDEX "external_order_links_packageId_idx" ON "external_order_links"("packageId");

-- CreateIndex
CREATE INDEX "external_order_links_packageItemId_idx" ON "external_order_links"("packageItemId");

-- CreateIndex
CREATE INDEX "external_order_links_integrationState_idx" ON "external_order_links"("integrationState");

-- CreateIndex
CREATE UNIQUE INDEX "external_order_links_provider_externalOrderId_key" ON "external_order_links"("provider", "externalOrderId");

-- CreateIndex
CREATE INDEX "external_tickets_externalOrderLinkId_idx" ON "external_tickets"("externalOrderLinkId");

-- CreateIndex
CREATE UNIQUE INDEX "external_tickets_provider_externalTicketId_key" ON "external_tickets"("provider", "externalTicketId");

-- CreateIndex
CREATE INDEX "provider_webhook_logs_provider_receivedAt_idx" ON "provider_webhook_logs"("provider", "receivedAt");

-- CreateIndex
CREATE INDEX "provider_account_configs_provider_environment_idx" ON "provider_account_configs"("provider", "environment");

-- AddForeignKey
ALTER TABLE "event_provider_links" ADD CONSTRAINT "event_provider_links_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_session_provider_links" ADD CONSTRAINT "event_session_provider_links_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "event_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_order_links" ADD CONSTRAINT "external_order_links_checkoutSessionId_fkey" FOREIGN KEY ("checkoutSessionId") REFERENCES "checkout_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_order_links" ADD CONSTRAINT "external_order_links_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_order_links" ADD CONSTRAINT "external_order_links_packageItemId_fkey" FOREIGN KEY ("packageItemId") REFERENCES "package_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_tickets" ADD CONSTRAINT "external_tickets_externalOrderLinkId_fkey" FOREIGN KEY ("externalOrderLinkId") REFERENCES "external_order_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
