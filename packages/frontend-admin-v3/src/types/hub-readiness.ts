/** Снимок готовности витринного хаба (GET admin * + hubReadiness). */

export type HubReadinessStatus = 'NOT_A_HUB' | 'DRAFT' | 'NEEDS_WORK' | 'READY' | 'BLOCKED';

export type HubReadinessIssue = {
  code: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  title: string;
  description?: string;
  group: string;
};

export type HubReadinessSnapshot = {
  hubType: 'CITY_HUB' | 'VENUE_HUB' | 'LANDING_HUB';
  entityType: 'CITY' | 'VENUE' | 'LANDING';
  entityId: string;
  status: HubReadinessStatus;
  score: number | null;
  isIndexableTarget: boolean;
  isCommercialEntryPoint: boolean;
  issues: HubReadinessIssue[];
  stats: Record<string, number | undefined>;
  urls?: { publicUrl?: string | null; canonicalUrl?: string | null };
};
