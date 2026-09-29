export type Paginated<T> = { items: T[]; total: number; nextCursor?: string | null; hasMore?: boolean };

// UI enum is intentionally preserved (see `VenuesPage` filter chips).
// We only adapt it for backend query params, without changing backend schema.
export type VenueTypeUi = import('@/lib/venueTypes').VenueTypeId;

export type VenueListItemDto = {
  id: string;
  title: string;
  slug: string | null;
  venueType: VenueTypeUi | string | null;
  city: { id: string; name: string; slug: string } | null;
  lifecycleStatus?: string | null;
  isPublished?: boolean | null;
  readinessStatus?: string | null;
  eventsCount?: number | null;
  displayAddress?: string | null;
  updatedAt?: string | null;
};

export type VenueDetailDto = {
  id: string;
  title: string;
  slug?: string | null;
  city?: { id: string; name: string; slug: string } | null;
  venueType?: VenueTypeUi | string | null;
  venueTypeOtherLabel?: string | null;
  version?: number;
  lifecycleStatus?: string | null;
  isActive?: boolean | null;
  isPublished?: boolean | null;
  displayAddress?: string | null;
  readiness?: { status?: string; keySignals?: string[] } | Record<string, unknown>;
  hubReadiness?: Record<string, unknown>;
  events?: Array<{ id: string; slug: string; title: string; priceFrom?: number | null; isPermanent?: boolean | null; dateMode?: string | null }>;
  offers?: Array<{ id: string; source: string; purchaseType?: string | null; priceFrom?: number | null; status?: string | null }>;
};

export type PatchVenueBody = {
  version: number;
  venueType?: VenueTypeUi;
  venueTypeOtherLabel?: string | null;
};

export type VenuesModule = {};

