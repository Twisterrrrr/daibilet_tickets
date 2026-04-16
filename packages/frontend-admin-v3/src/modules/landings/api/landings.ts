import { adminApi } from '@/api/client';
import type { HubReadinessSnapshot } from '@/types/hub-readiness';

export type AdminLandingType = 'HUB' | 'CITY' | 'MULTI_CITY';
export type AdminLandingEventSourceType = 'AUTO_QUERY' | 'PRIMARY_COLLECTION' | 'MIXED';
export type AdminLandingStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export type AdminLandingListRow = {
  id: string;
  title: string;
  slug: string;
  landingType: AdminLandingType;
  status: AdminLandingStatus;
  eventSourceType: AdminLandingEventSourceType;
  isActive: boolean;
  isIndexable: boolean;
  updatedAt: string;
  version: number;
  city: { slug: string; name: string } | null;
  parentLanding: { id: string; slug: string; title: string; landingType: AdminLandingType } | null;
};

export type AdminLandingDetail = AdminLandingListRow & {
  cityId: string | null;
  parentLandingId: string | null;
  childLandings: Array<{
    id: string;
    title: string;
    slug: string;
    landingType: AdminLandingType;
    status: AdminLandingStatus;
    isActive: boolean;
    isIndexable: boolean;
    city: { slug: string; name: string } | null;
  }>;

  // content
  subtitle: string | null;
  heroText: string | null;
  legalText: string | null;
  templateType: 'GENERIC_CARDS' | 'COMPARISON_TABLE' | 'HYBRID' | 'SEASONAL_EVENT';

  // content blocks (legacy JSON fields)
  howToChoose: unknown[] | null;
  infoBlocks: unknown[] | null;
  faq: unknown[] | null;
  reviews: unknown[] | null;
  stats: Record<string, unknown> | null;
  relatedLinks: unknown[] | null;
  seasonalPayload: Record<string, unknown> | null;

  // selection (legacy + new)
  filterTag: string;
  filterTagId?: string | null;
  filterTagRef?: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    isDeleted?: boolean;
  } | null;
  additionalFilters: Record<string, unknown> | null;
  collectionId: string | null;
  selectionMode: 'COLLECTION' | 'CUSTOM';
  queryConfig: Record<string, unknown> | null;

  // SEO
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;

  relatedArticleIds: string[];
  relatedCollectionIds: string[];

  hubReadiness?: HubReadinessSnapshot;
};

export type AdminLandingResolvedEventsResponse = {
  items: Array<{
    id: string;
    slug: string | null;
    title: string;
    city: { id: string; slug: string; name: string } | null;
    isActive: boolean;
    priceFrom: string | null;
    nextSessionAt: string | null;
  }>;
  total: number;
};

export async function fetchAdminLandingsList(params: {
  search?: string;
  city?: string;
  landingType?: AdminLandingType;
  status?: AdminLandingStatus;
  eventSourceType?: AdminLandingEventSourceType;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.city) qs.set('city', params.city);
  if (params.landingType) qs.set('landingType', params.landingType);
  if (params.status) qs.set('status', params.status);
  if (params.eventSourceType) qs.set('eventSourceType', params.eventSourceType);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return adminApi.get<{ items: AdminLandingListRow[]; total: number }>(`/admin/landings${query}`);
}

export async function fetchAdminLandingDetail(id: string) {
  return adminApi.get<AdminLandingDetail>(`/admin/landings/${encodeURIComponent(id)}`);
}

export async function patchAdminLanding(id: string, body: Partial<AdminLandingDetail> & { version: number }) {
  return adminApi.patch<AdminLandingDetail>(`/admin/landings/${encodeURIComponent(id)}`, body);
}

export async function createAdminLanding(body: Partial<AdminLandingDetail>) {
  return adminApi.post<AdminLandingDetail>('/admin/landings', body);
}

export async function deleteAdminLanding(id: string) {
  return adminApi.delete<{ success: true }>(`/admin/landings/${encodeURIComponent(id)}`);
}

export async function fetchAdminLandingResolvedEvents(id: string) {
  return adminApi.get<AdminLandingResolvedEventsResponse>(`/admin/landings/${encodeURIComponent(id)}/resolved-events`);
}

