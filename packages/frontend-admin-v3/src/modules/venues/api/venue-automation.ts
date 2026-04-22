import { adminApi } from '@/api/client';

import type { VenueImportSource } from './candidates';

export type VenueAutoDecisionDto =
  | { action: 'AUTO_APPROVE' }
  | { action: 'AUTO_MERGE'; targetVenueId: string }
  | { action: 'NO_AUTO'; reason: string };

export type AutoModerationDryRunResponse = {
  totalEvaluated: number;
  autoApproveCandidates: number;
  autoMergeCandidates: number;
  samples: Array<{
    venueId: string;
    decision: VenueAutoDecisionDto;
    reasons: string[];
    confidenceScore: number | null;
  }>;
};

export type AutoModerationRunResponse = {
  processed: number;
  autoApproved: number;
  autoMerged: number;
  skipped: number;
  errors: string[];
  shadow: boolean;
};

export type ImportSourceTrustRow = {
  importSource: string;
  profile: {
    trustLevel: string;
    autoApproveEnabled: boolean;
    autoMergeEnabled: boolean;
    maxAutoActionsPerDay: number;
    disabled: boolean;
  };
  suggestedTrustLevel: string;
  metrics: {
    rejectRate: number;
    hintAcceptanceMerge: number | null;
    hintAcceptanceApprove: number | null;
    avgConfidence: number;
    totalDecisions: number;
  };
};

export async function fetchImportSourceTrust(): Promise<ImportSourceTrustRow[]> {
  return adminApi.get<ImportSourceTrustRow[]>('/admin/venues/import-source-trust');
}

export async function postAutoModerationDryRun(body: {
  from?: string;
  to?: string;
  importSource?: VenueImportSource;
  limit?: number;
}): Promise<AutoModerationDryRunResponse> {
  return adminApi.post<AutoModerationDryRunResponse>('/admin/venues/auto-moderation/dry-run', body);
}

export async function postAutoModerationRun(body: {
  limit: number;
  importSource?: VenueImportSource;
  onlyHighConfidence?: boolean;
}): Promise<AutoModerationRunResponse> {
  return adminApi.post<AutoModerationRunResponse>('/admin/venues/auto-moderation/run', body);
}
