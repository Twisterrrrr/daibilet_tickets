import { adminApi } from '@/api/client';

export type VenueAdminSummary = {
  id: string;
  storefront: {
    activeEventsCount: number;
    eventsWithFutureSlotsCount: number;
    avgEventRating: number | null;
    readyRatio: number | null;
    readyDataQuality: 'FULL' | 'PARTIAL' | 'FROM_OVERRIDE_ONLY';
    isFeatured: boolean;
  };
  content: {
    hasVenueTemplateData: boolean;
    sectionKeys?: string[];
  };
  relatedEvents: Array<{
    id: string;
    slug: string;
    title: string;
    category: string | null;
    readinessStatus: 'READY' | 'NEEDS_WORK' | 'BLOCKED' | 'UNKNOWN';
    storefrontVisibility: 'VISIBLE' | 'HIDDEN' | 'SUPPRESSED';
    rating: number | null;
    reviewCount: number;
    adminUrlPath: string;
    publicUrlPath: string;
  }>;
  truncated?: boolean;
};

export async function getVenueAdminSummary(venueId: string): Promise<VenueAdminSummary> {
  return adminApi.get<VenueAdminSummary>(`/admin/venues/${venueId}/summary`);
}
