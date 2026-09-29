export type SourceCategoryMappingDto = {
  id: string;
  source: string;
  externalCategoryNorm: string;
  internalCategory: string;
  createdAt: string;
  updatedAt: string;
};

export type SourceCategoryUnknownDto = {
  id: string;
  source: string;
  externalCategoryRaw: string;
  externalCategoryNorm: string;
  firstSeenAt: string;
  lastSeenAt: string;
  hits: number;
};

export type SupplierIntegrationDto = {
  id: string;
  supplierId: string;
  supplierName: string;
  adapterCode: string;
  adapterName: string | null;
  name: string;
  acquisitionMode: string | null;
  status: string | null;
  environment: string | null;
  syncMode: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  consecutiveErrorCount: number;
  openIssuesCount: number;
  lastRunSummary: string | null;
};

export type SupplierIntegrationRunDto = {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  summary: string | null;
  counters: Record<string, number> | null;
};

export type SupplierIntegrationIssueDto = {
  id: string;
  entityType: string | null;
  severity: string;
  code: string | null;
  title: string;
  resolutionStatus: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Paginated<T> = { items: T[]; total: number; nextCursor?: string | null; hasMore?: boolean };

export type SyncStatusDto = {
  lastSyncAt: string | null;
  events: { total: number; active: number };
  sessions: { total: number; active: number };
  ops: Record<string, unknown>;
};

export type QueueCountsDto = {
  active?: number;
  waiting?: number;
  completed?: number;
  failed?: number;
  delayed?: number;
  paused?: number;
};

export type SyncQueueDetailsDto = {
  counts: QueueCountsDto;
  active: Array<{ id: string | number | null; name: string; attemptsMade: number; processedOn?: number | null; timestamp?: number | null }>;
  completed: Array<{ id: string | number | null; name: string; finishedOn?: number | null; returnvalue?: unknown }>;
  failed: Array<{ id: string | number | null; name: string; failedReason?: string | null; attemptsMade: number; finishedOn?: number | null }>;
};

export type SyncEnqueueDto = {
  success: boolean;
  message?: string;
  jobId: string;
  queued?: boolean;
};

export type SyncProgressDto = {
  jobId: string;
  state: string;
  message?: string;
  timestamp?: number | null;
  processedOn?: number | null;
  finishedOn?: number | null;
  failedReason?: string | null;
  returnvalue?: unknown;
};

export type ImportSourcesModule = {};

