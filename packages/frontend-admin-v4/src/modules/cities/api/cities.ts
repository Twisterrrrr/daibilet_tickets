import { api } from '@/shared/api/client';
import type { CityDetailDto, CityListItemDto, Paginated } from '@/modules/cities/types';

export type ListCitiesQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

export async function listCities(query: ListCitiesQuery): Promise<Paginated<CityListItemDto>> {
  const qs = new URLSearchParams();
  qs.set('page', String(query.page ?? 1));
  qs.set('limit', String(query.limit ?? 50));
  if (query.search) qs.set('search', query.search);
  return api<Paginated<CityListItemDto>>(`/admin/cities?${qs.toString()}`);
}

export async function getCity(id: string): Promise<CityDetailDto> {
  return api<CityDetailDto>(`/admin/cities/${id}`);
}

export type PatchCityBody = {
  name?: string;
  description?: string | null;
  heroImage?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  isActive?: boolean;
  isFeatured?: boolean;
  version?: number;
};export async function patchCity(id: string, body: PatchCityBody): Promise<CityDetailDto> {
  return api<CityDetailDto>(`/admin/cities/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}