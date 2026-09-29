export type ImportedSalesDashboardDto = {
  catalogReadiness: {
    readyToPublish: number;
    missingImage: number;
    missingCategory: number;
    missingVenue: number;
    missingPurchaseLink: number;
  };
  importHealth: {
    sourcesOk: number;
    sourcesWarning: number;
    sourcesError: number;
    openIssues: number;
  };
  mappingInbox: {
    unknownCategories: number;
    unknownVenues?: number;
    unknownCities?: number;
    unknownTags?: number;
  };
  externalOrdersFeed: {
    recentCount: number;
    pendingConfirmation: number;
    confirmed: number;
    cancelled: number;
  };
};

export type ImportedSalesEventRow = {
  id: string;
  title: string;
  source: 'TICKETSCLOUD' | 'TEPLOHOD' | 'MANUAL' | 'OTHER';
  cityName?: string | null;
  isPublished: boolean;
  issues: {
    missingImage?: boolean;
    missingVenue?: boolean;
    missingCategory?: boolean;
    missingPurchaseLink?: boolean;
  };
};

export type ImportedSalesEventsListDto = {
  items: ImportedSalesEventRow[];
  total: number;
};

export type ImportSourceRow = {
  id: string;
  provider: 'TICKETSCLOUD' | 'TEPLOHOD';
  status: 'ok' | 'warning' | 'error';
  lastSyncAt?: string | null;
  importedEvents: number;
  publishedEvents: number;
  openIssues: number;
};

export type ExternalOrderRow = {
  id: string;
  provider: 'TICKETSCLOUD' | 'TEPLOHOD';
  externalOrderId: string;
  eventTitle?: string | null;
  status: 'imported_paid' | 'pending_confirmation' | 'confirmed' | 'cancelled' | 'unknown';
  createdAt: string;
};

export type MappingInboxRow = {
  id: string;
  provider: 'TICKETSCLOUD' | 'TEPLOHOD';
  kind: 'category';
  rawValue: string;
  occurrences: number;
  firstSeenAt?: string | null;
  lastSeenAt?: string | null;
};

export type SyncHealthDto = {
  sourcesOk: number;
  sourcesWarning: number;
  sourcesError: number;
  staleSources: number;
  openIssues: number;
  unknownCategoryMappings: number;
};

