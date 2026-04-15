import { adminApi } from '@/api/client';
import type { HubReadinessSnapshot } from '@/types/hub-readiness';

export type CityAdminReadinessDto = {
  status: 'READY' | 'NEEDS_WORK' | 'BLOCKED';
  score: number;
  blockers: string[];
  warnings: string[];
  keySignals: string[];
};

export type AdminCityRegionRef = { id: string; name: string; slug: string };

export type AdminCityListItem = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  isFeatured?: boolean;
  isPublished?: boolean;
  region: AdminCityRegionRef | null;
  stats: {
    eventsCount: number;
    activeEventsCount: number;
    futureEventsCount: number;
    venuesCount: number;
    activeVenuesCount: number;
    landingsCount: number;
    activeLandingsCount: number;
    comboPagesCount: number;
    collectionsCount: number;
  };
  flags: {
    hasCover: boolean;
    hasDescription: boolean;
    hasSeo: boolean;
  };
  readiness: CityAdminReadinessDto;
  readinessStatus: CityAdminReadinessDto['status'];
  readinessScore: number;
  readinessKeySignals?: string[];
  hubReadiness?: HubReadinessSnapshot;
  isCatalogHub?: boolean;
  catalogHubStatus?: 'DRAFT' | 'ACTIVE' | 'DISABLED';
  updatedAt: string;
  createdAt: string;
  _count?: {
    events?: number;
    venues?: number;
    landingPages?: number;
    comboPages?: number;
    collections?: number;
  };
};

export type PaginatedCities = {
  items: AdminCityListItem[];
  total: number;
  nextCursor: string | null;
  hasMore: boolean;
};

export type AdminCityLandingRef = {
  id: string;
  slug: string;
  title: string;
  status: string;
  isActive: boolean;
  isIndexable: boolean;
  landingType: string;
  updatedAt: string;
};

export type AdminCityDetail = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  heroImage?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  timezone?: string | null;
  version?: number;
  lat?: unknown;
  lng?: unknown;
  isActive?: boolean;
  isFeatured?: boolean;
  createdAt?: string;
  updatedAt?: string;
  region?: AdminCityRegionRef | null;
  regions?: AdminCityRegionRef[];
  hubForRegions?: AdminCityRegionRef[];
  stats?: AdminCityListItem['stats'];
  flags?: AdminCityListItem['flags'];
  readiness?: CityAdminReadinessDto;
  seo?: {
    metaTitle?: string | null;
    metaDescription?: string | null;
    h1Preview?: string;
    publicPath: string;
    indexableHint?: boolean;
  };
  relatedLandings?: AdminCityLandingRef[];
  landingPages?: AdminCityLandingRef[];
  regionLinks?: Array<{ region: AdminCityRegionRef }>;
  _count?: AdminCityListItem['_count'] & { packages?: number; articles?: number };
  hubReadiness?: HubReadinessSnapshot;
  isCatalogHub?: boolean;
  catalogHubStatus?: 'DRAFT' | 'ACTIVE' | 'DISABLED';
};

export type PatchCityBody = {
  name?: string;
  description?: string;
  heroImage?: string;
  lat?: number;
  lng?: number;
  timezone?: string;
  metaTitle?: string;
  metaDescription?: string;
  isFeatured?: boolean;
  isActive?: boolean;
  isCatalogHub?: boolean;
  catalogHubStatus?: 'DRAFT' | 'ACTIVE' | 'DISABLED';
  version?: number;
};

export async function fetchAdminRegionOptions() {
  return adminApi.get<{ items: AdminCityRegionRef[] }>('/admin/cities/region-options');
}

export async function fetchAdminCitiesList(params: {
  search?: string;
  limit?: number;
  page?: number;
  regionId?: string;
  isActive?: boolean;
  readinessStatus?: 'READY' | 'NEEDS_WORK' | 'BLOCKED';
  hasEvents?: boolean;
  hasVenues?: boolean;
  hasLandings?: boolean;
  hasSeo?: boolean;
  hasCombos?: boolean;
  updatedFrom?: string;
  updatedTo?: string;
}) {
  const sp = new URLSearchParams();
  if (params.search) sp.set('search', params.search);
  sp.set('limit', String(params.limit ?? 50));
  if (params.page && params.page > 1) sp.set('page', String(params.page));
  if (params.regionId) sp.set('regionId', params.regionId);
  if (params.isActive === true) sp.set('isActive', 'true');
  if (params.isActive === false) sp.set('isActive', 'false');
  if (params.readinessStatus) sp.set('readinessStatus', params.readinessStatus);
  if (params.hasEvents) sp.set('hasEvents', 'true');
  if (params.hasVenues) sp.set('hasVenues', 'true');
  if (params.hasLandings) sp.set('hasLandings', 'true');
  if (params.hasSeo) sp.set('hasSeo', 'true');
  if (params.hasCombos) sp.set('hasCombos', 'true');
  if (params.updatedFrom) sp.set('updatedFrom', params.updatedFrom);
  if (params.updatedTo) sp.set('updatedTo', params.updatedTo);
  return adminApi.get<PaginatedCities>(`/admin/cities?${sp.toString()}`);
}

export async function fetchAdminCity(id: string) {
  return adminApi.get<AdminCityDetail>(`/admin/cities/${id}`);
}

/** Ответ PATCH — базовая запись города (без readiness); после сохранения перезагрузите detail. */
export async function patchAdminCity(id: string, body: PatchCityBody) {
  return adminApi.patch<Partial<AdminCityDetail> & { id: string }>(`/admin/cities/${id}`, body);
}
