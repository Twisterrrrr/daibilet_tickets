import { api } from '@/shared/api/client';
import { toVenueTypeQuery } from '@/modules/venues/adapters/venue-type';
import type { Paginated, PatchVenueBody, VenueDetailDto, VenueListItemDto, VenueTypeUi } from '@/modules/venues/types';

export type ListVenuesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  venueType?: VenueTypeUi;
  lite?: boolean;
};

export async function listVenues(query: ListVenuesQuery): Promise<Paginated<VenueListItemDto>> {
  const qs = new URLSearchParams();
  qs.set('page', String(query.page ?? 1));
  qs.set('limit', String(query.limit ?? 50));
  if (query.search) qs.set('search', query.search);
  if (query.city) qs.set('city', query.city);
  if (query.venueType) qs.set('venueType', toVenueTypeQuery(query.venueType));
  if (query.lite) qs.set('lite', '1');
  return api<Paginated<VenueListItemDto>>(`/admin/venues?${qs.toString()}`);
}

export async function getVenue(id: string): Promise<VenueDetailDto> {
  return api<VenueDetailDto>(`/admin/venues/${id}`);
}

export async function patchVenue(id: string, body: PatchVenueBody): Promise<VenueDetailDto> {
  return api<VenueDetailDto>(`/admin/venues/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}