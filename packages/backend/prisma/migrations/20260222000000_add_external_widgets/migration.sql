-- CreateEnum
CREATE TYPE "ExternalWidgetProviderKind" AS ENUM ('TEPLOHOD');

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

-- CreateIndex
CREATE UNIQUE INDEX "external_widget_providers_kind_key" ON "external_widget_providers"("kind");

-- CreateIndex
CREATE INDEX "external_widget_providers_isActive_idx" ON "external_widget_providers"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "external_widgets_providerId_externalId_key" ON "external_widgets"("providerId", "externalId");

-- CreateIndex
CREATE INDEX "external_widgets_providerId_idx" ON "external_widgets"("providerId");

-- CreateIndex
CREATE INDEX "external_widgets_isActive_idx" ON "external_widgets"("isActive");

-- CreateIndex
CREATE INDEX "external_widgets_updatedAt_idx" ON "external_widgets"("updatedAt");

-- AddForeignKey
ALTER TABLE "external_widgets" ADD CONSTRAINT "external_widgets_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "external_widget_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
