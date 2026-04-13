import type { AdminEventSummary } from '@/modules/events/api/summary';

export type EventRowItem = {
  id: string;
  slug: string;
  title: string;
  imageThumb?: string | null;

  cityName?: string | null;
  venueName?: string | null;

  supplierSource?: 'MANUAL' | 'TICKETSCLOUD' | 'TEPLOHOD' | string | null;

  nextDate?: string | null;
  hasFutureSlots?: boolean | null;

  priceFrom?: number | null;

  publishStatus?: string | null;
  isPast?: boolean;
  isArchived?: boolean;
  isActive?: boolean;

  hasOverride?: boolean;

  issueCount?: number;
  warningCount?: number;
  readinessStatus?: AdminEventSummary['readiness']['status'] | null;
  readinessScore?: number | null;
  issues?: Array<{ code: string; label: string; severity: 'warning' | 'error' }>;

  sessionsCount?: number | null;

  sectionsDerived?: Array<{ slug: string; name: string }>;
  subcategoriesCanonical?: Array<{ id: string; slug: string; name: string; isActive?: boolean }>;
};

