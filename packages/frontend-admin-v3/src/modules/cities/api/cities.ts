import { adminApi } from '@/api/client';

export type AdminCityListItem = {
  id: string;
  slug: string;
  name: string;
  isActive?: boolean;
  isFeatured?: boolean;
  _count?: { events?: number; venues?: number; landingPages?: number; comboPages?: number };
};

export type PaginatedCities = {
  items: AdminCityListItem[];
  total: number;
  nextCursor: string | null;
  hasMore: boolean;
};

export type AdminCityDetail = AdminCityListItem & {
  description?: string | null;
  heroImage?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  timezone?: string | null;
  version?: number;
  lat?: unknown;
  lng?: unknown;
  createdAt?: string;
  updatedAt?: string;
  _count?: AdminCityListItem['_count'] & { packages?: number };
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
  version?: number;
};

export async function fetchAdminCitiesList(params: { search?: string; limit?: number; page?: number }) {
  const sp = new URLSearchParams();
  if (params.search) sp.set('search', params.search);
  sp.set('limit', String(params.limit ?? 100));
  if (params.page && params.page > 1) sp.set('page', String(params.page));
  return adminApi.get<PaginatedCities>(`/admin/cities?${sp.toString()}`);
}

export async function fetchAdminCity(id: string) {
  return adminApi.get<AdminCityDetail>(`/admin/cities/${id}`);
}

export async function patchAdminCity(id: string, body: PatchCityBody) {
  return adminApi.patch<AdminCityDetail>(`/admin/cities/${id}`, body);
}
