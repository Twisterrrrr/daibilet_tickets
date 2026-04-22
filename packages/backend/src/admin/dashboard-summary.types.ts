/** Ответ GET /admin/dashboard/summary — операционная сводка витрины (Admin V3). */

export type DashboardHealthMetrics = {
  hubs: {
    total: number;
    ready: number;
    needsWork: number;
    blocked: number;
  };
  catalog: {
    totalEvents: number;
    activeEvents: number;
    withIssues: number;
  };
  venues: {
    total: number;
    unresolvedDuplicates: number;
    missingData: number;
  };
  seo: {
    totalIssues: number;
    errors: number;
    warnings: number;
  };
};

export type DashboardActivityMetrics = {
  traffic: { visits: number; pageViews: number };
  catalog: { eventViews: number; landingViews: number; collectionViews: number };
  conversions: { checkoutStarted: number; checkoutCompleted: number };
};

export type DashboardContentMetrics = {
  articles: { total: number; published: number; withoutSeo: number };
  landings: { total: number; published: number; emptyResults: number };
  collections: { total: number; published: number; empty: number };
  indexability: { indexablePages: number; nonIndexablePages: number };
};

export type DashboardOperationsMetrics = {
  tickets: { open: number; inProgress: number; highPriority: number };
  chat: { openConversations: number };
  reviews: { pending: number; negative: number };
};

export type DashboardAttentionSource = 'SEO_AUDIT' | 'HUB' | 'CATALOG' | 'SUPPORT';

export type DashboardAttentionItem = {
  entityType: string;
  entityId: string;
  title: string;
  issue: string;
  severity: 'ERROR' | 'WARNING';
  source: DashboardAttentionSource;
  url: string;
};

export type DashboardSummaryResponse = {
  health: DashboardHealthMetrics;
  activity: DashboardActivityMetrics;
  content: DashboardContentMetrics;
  operations: DashboardOperationsMetrics;
  attention: DashboardAttentionItem[];
  meta: {
    generatedAt: string;
    cacheTtlSeconds: number;
    servedFromCache: boolean;
    hubCitiesEvaluated: number;
    /** Доп. hub-сущности (не входят в ready/needs/blocked по городам). */
    hubVenuePageHubCount?: number;
    hubLandingHubCount?: number;
    activityNote?: string;
  };
};
