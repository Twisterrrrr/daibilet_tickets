export type DashboardCardSignal = {
  key: string;
  label: string;
  value: number | string | null;
  href?: string;
  tone?: 'default' | 'warning' | 'danger';
  note?: string;
};

export type DashboardBlock = {
  id: 'catalog-readiness' | 'landing-traffic-engine' | 'import-health' | 'external-orders-feed';
  title: string;
  description?: string;
  signals: DashboardCardSignal[];
};

export type DashboardAggregation = {
  generatedAt: string;
  blocks: DashboardBlock[];
  partial: boolean;
  warnings: string[];
};

export type DashboardSummaryDto = {
  health?: {
    catalog?: { totalEvents: number; activeEvents: number; withIssues?: number };
  };
  content?: {
    landings?: { total: number; published: number; emptyResults?: number };
    collections?: { total: number; published: number; empty?: number };
  };
  meta?: { generatedAt: string; servedFromCache?: boolean };
};

export type SeoAuditSummaryDto = {
  totals?: Record<string, number>;
  byEntityType?: Record<string, { total: number; withIssues: number }>;
  bySeverity?: Record<string, number>;
};

export type ImportedSalesDashboardDto = {
  events: {
    total: number;
    published: number;
    missingCategory: number | null;
    missingVenue: number | null;
    missingPurchaseLink: number | null;
    readyToPublish: number | null;
  };
  landings: {
    total: number;
    published: number;
    missingSeo: number | null;
    withoutMatchedEvents: number | null;
    city: number | null;
    multiCity: number | null;
  };
  imports: {
    openIssues: number | null;
    staleSources: number | null;
  };
  externalOrders: {
    recent: number | null;
    confirmed: number | null;
    pending: number | null;
    cancelled: number | null;
  };
  seo: {
    landingIssues: number | null;
  };
};

export type DashboardModule = {};

