-- Supplier integrations (admin-managed configs) — MVP
-- NOTE: created manually (no DB available for prisma migrate dev).

CREATE TABLE IF NOT EXISTS "supplier_integrations" (
  "id" UUID NOT NULL,
  "operatorId" UUID NOT NULL,
  "adapterCode" TEXT NOT NULL,
  "adapterName" TEXT,
  "name" TEXT NOT NULL,
  "acquisitionMode" TEXT,
  "status" TEXT,
  "environment" TEXT,
  "syncMode" TEXT,
  "connectionJson" JSONB,
  "mappingJson" JSONB,
  "capabilitiesJson" JSONB,
  "healthJson" JSONB,
  "lastSuccessAt" TIMESTAMP(3),
  "lastErrorAt" TIMESTAMP(3),
  "consecutiveErrorCount" INTEGER NOT NULL DEFAULT 0,
  "openIssuesCountCached" INTEGER NOT NULL DEFAULT 0,
  "lastRunSummaryCached" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "supplier_integrations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "supplier_integrations_operatorId_idx" ON "supplier_integrations"("operatorId");
CREATE INDEX IF NOT EXISTS "supplier_integrations_adapterCode_idx" ON "supplier_integrations"("adapterCode");

ALTER TABLE "supplier_integrations"
  ADD CONSTRAINT "supplier_integrations_operatorId_fkey"
  FOREIGN KEY ("operatorId") REFERENCES "operators"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "supplier_integration_runs" (
  "id" UUID NOT NULL,
  "integrationId" UUID NOT NULL,
  "status" TEXT NOT NULL,
  "summary" TEXT,
  "countersJson" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "supplier_integration_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "supplier_integration_runs_integrationId_startedAt_idx"
  ON "supplier_integration_runs"("integrationId", "startedAt");

ALTER TABLE "supplier_integration_runs"
  ADD CONSTRAINT "supplier_integration_runs_integrationId_fkey"
  FOREIGN KEY ("integrationId") REFERENCES "supplier_integrations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "supplier_integration_issues" (
  "id" UUID NOT NULL,
  "integrationId" UUID NOT NULL,
  "entityType" TEXT,
  "severity" TEXT NOT NULL,
  "code" TEXT,
  "title" TEXT NOT NULL,
  "resolutionStatus" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "supplier_integration_issues_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "supplier_integration_issues_integrationId_severity_idx"
  ON "supplier_integration_issues"("integrationId", "severity");

ALTER TABLE "supplier_integration_issues"
  ADD CONSTRAINT "supplier_integration_issues_integrationId_fkey"
  FOREIGN KEY ("integrationId") REFERENCES "supplier_integrations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

