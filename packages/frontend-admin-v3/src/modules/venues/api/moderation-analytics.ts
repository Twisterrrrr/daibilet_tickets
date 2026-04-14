import { adminApi } from '@/api/client';

export type VenueModerationHintAcceptanceBreakdown = {
  total: number;
  accepted: number;
  rejected: number;
  overridden: number;
};

export type VenueModerationMetricsDto = {
  volume: { draftsTotal: number; moderatedTotal: number };
  counts: { approvedTotal: number; rejectedTotal: number; mergedTotal: number };
  rates: { approveRate: number; rejectRate: number; mergeRate: number };
  decisionHints: {
    totalWithHint: number;
    byHint: {
      MERGE_RECOMMENDED: number;
      APPROVE_AS_NEW: number;
      NEEDS_REVIEW: number;
      REJECT_RECOMMENDED: number;
    };
  };
  hintAcceptance: {
    MERGE_RECOMMENDED: VenueModerationHintAcceptanceBreakdown;
    APPROVE_AS_NEW: VenueModerationHintAcceptanceBreakdown;
    REJECT_RECOMMENDED: VenueModerationHintAcceptanceBreakdown;
  };
  sourceQuality: Array<{
    importSource: string;
    total: number;
    approveRate: number;
    rejectRate: number;
    mergeRate: number;
    needsReviewRate: number;
    avgConfidence: number;
  }>;
  rejectReasonsDetailed: Array<{ reasonCode: string; count: number; share: number }>;
  throughput: {
    timeToFirstDecisionAvgMs: number | null;
    timeToFirstDecisionP50Ms: number | null;
    timeToFirstDecisionP95Ms: number | null;
  };
  warnings: { slugCollisionRate: number; staleStateRate: number };
};

export type VenueModerationSourcesResponseDto = {
  sources: Array<{
    importSource: string;
    total: number;
    approved: number;
    rejected: number;
    merged: number;
    needsReview: number;
    avgConfidence: number;
    topRejectReasons: Array<{ reasonCode: string; count: number }>;
  }>;
};

export type VenueImportSourceFilter = 'TICKETSCLOUD' | 'TEPLOHOD' | '';

export async function fetchModerationMetrics(params: {
  from?: string;
  to?: string;
  importSource?: VenueImportSourceFilter;
}): Promise<VenueModerationMetricsDto> {
  const sp = new URLSearchParams();
  if (params.from) sp.set('from', params.from);
  if (params.to) sp.set('to', params.to);
  if (params.importSource) sp.set('importSource', params.importSource);
  const q = sp.toString();
  return adminApi.get<VenueModerationMetricsDto>(`/admin/venues/moderation-metrics${q ? `?${q}` : ''}`);
}

export async function fetchModerationSources(params: {
  from?: string;
  to?: string;
  importSource?: VenueImportSourceFilter;
}): Promise<VenueModerationSourcesResponseDto> {
  const sp = new URLSearchParams();
  if (params.from) sp.set('from', params.from);
  if (params.to) sp.set('to', params.to);
  if (params.importSource) sp.set('importSource', params.importSource);
  const q = sp.toString();
  return adminApi.get<VenueModerationSourcesResponseDto>(`/admin/venues/moderation-sources${q ? `?${q}` : ''}`);
}
