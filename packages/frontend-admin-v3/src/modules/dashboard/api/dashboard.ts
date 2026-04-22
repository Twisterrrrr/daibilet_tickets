import { adminApi } from '@/api/client';

export type DashboardSummary = {
  health: {
    hubs: { total: number; ready: number; needsWork: number; blocked: number };
    catalog: { totalEvents: number; activeEvents: number; withIssues: number };
    venues: { total: number; unresolvedDuplicates: number; missingData: number };
    seo: { totalIssues: number; errors: number; warnings: number };
  };
  activity: {
    traffic: { visits: number; pageViews: number };
    catalog: { eventViews: number; landingViews: number; collectionViews: number };
    conversions: { checkoutStarted: number; checkoutCompleted: number };
  };
  content: {
    articles: { total: number; published: number; withoutSeo: number };
    landings: { total: number; published: number; emptyResults: number };
    collections: { total: number; published: number; empty: number };
    indexability: { indexablePages: number; nonIndexablePages: number };
  };
  operations: {
    tickets: { open: number; inProgress: number; highPriority: number };
    chat: { openConversations: number };
    reviews: { pending: number; negative: number };
  };
  attention: Array<{
    entityType: string;
    entityId: string;
    title: string;
    issue: string;
    severity: 'ERROR' | 'WARNING';
    source: string;
    url: string;
  }>;
  meta: {
    generatedAt: string;
    cacheTtlSeconds: number;
    servedFromCache: boolean;
    hubCitiesEvaluated: number;
    hubVenuePageHubCount?: number;
    hubLandingHubCount?: number;
    activityNote?: string;
  };
};

export async function fetchDashboardSummary(nocache?: boolean) {
  const sp = nocache ? '?nocache=1' : '';
  return adminApi.get<DashboardSummary>(`/admin/dashboard/summary${sp}`);
}
