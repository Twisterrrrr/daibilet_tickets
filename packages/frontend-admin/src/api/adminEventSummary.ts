import { adminApi } from '@/api/client';

export type EventAdminSummary = {
  id: string;
  readiness: {
    status: 'READY' | 'NEEDS_WORK' | 'BLOCKED';
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
  promotion: {
    tier: 'NONE' | 'POPULAR' | 'TOP';
    manualBoost: number;
    helpText?: string;
  };
  operations: {
    nextSessionAt: string | null;
    futureSessionsCount: number;
    capacity: { total: number; sold: number; available: number };
  };
  commercial: {
    last30dOrders: number;
    conversionRate: number | null;
    refundsRate: number | null;
    dataQuality?: string;
    note?: string;
  };
  integration: {
    source: string;
    lastSyncAt: string | null;
    syncStatus: 'OK' | 'WARNING' | 'ERROR';
    hasDuplicates: boolean;
  };
};

export async function getEventAdminSummary(eventId: string): Promise<EventAdminSummary> {
  return adminApi.get<EventAdminSummary>(`/admin/events/${eventId}/summary`);
}
