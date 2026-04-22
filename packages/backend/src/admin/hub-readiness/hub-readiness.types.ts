/**
 * Единый read-model слой «витринного хаба» поверх City / Venue / Landing (без отдельной сущности Hub).
 */

export type HubType = 'CITY_HUB' | 'VENUE_HUB' | 'LANDING_HUB';

export type HubReadinessStatus = 'NOT_A_HUB' | 'DRAFT' | 'NEEDS_WORK' | 'READY' | 'BLOCKED';

export type HubIssueSeverity = 'INFO' | 'WARNING' | 'ERROR';

export type HubIssueCode = string;

export type HubIssueGroup =
  | 'SEO'
  | 'CONTENT'
  | 'CATALOG'
  | 'STRUCTURE'
  | 'LINKING'
  | 'PUBLICATION'
  | 'PROMO';

export type HubReadinessIssue = {
  code: HubIssueCode;
  severity: HubIssueSeverity;
  title: string;
  description?: string;
  group: HubIssueGroup;
};

export type HubReadinessSnapshot = {
  hubType: HubType;
  entityType: 'CITY' | 'VENUE' | 'LANDING';
  entityId: string;

  status: HubReadinessStatus;
  /** 0..100; для NOT_A_HUB может быть null */
  score: number | null;

  isIndexableTarget: boolean;
  isCommercialEntryPoint: boolean;

  issues: HubReadinessIssue[];

  stats: {
    eventsCount?: number;
    activeEventsCount?: number;
    relatedCollectionsCount?: number;
    relatedArticlesCount?: number;
    promoBlocksCount?: number;
    childLandingsCount?: number;
    resolvedEventsCount?: number;
  };

  urls?: {
    publicUrl?: string | null;
    canonicalUrl?: string | null;
  };
};
