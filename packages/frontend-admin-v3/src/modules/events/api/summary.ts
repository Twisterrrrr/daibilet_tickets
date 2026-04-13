import { adminApi } from '@/api/client';

export type AdminEventSummary = {
  id: string;
  readiness: {
    status: 'READY' | 'NEEDS_WORK' | 'BLOCKED';
    score: number;
    classificationSource: 'LINKS' | 'LEGACY_ENUM' | 'NONE';
    classificationNeedsReview: boolean;
    checklist: {
      hasImage: boolean;
      hasDescription: boolean;
      hasFutureSlots: boolean;
      hasPrice: boolean;
      hasVenue: boolean;
      hasCategory: boolean;
      hasAge: boolean;
    };
    issues: { code: string; message: string; severity: 'warning' | 'error' }[];
  };
  integration: {
    source: string;
    lastSyncAt: string | null;
    syncStatus: 'OK' | 'WARNING' | 'ERROR';
    hasDuplicates: boolean;
  };
  operations?: {
    nextSessionAt: string | null;
  };
};

export async function fetchAdminEventSummary(id: string) {
  return adminApi.get<AdminEventSummary>(`/admin/events/${id}/summary`);
}

