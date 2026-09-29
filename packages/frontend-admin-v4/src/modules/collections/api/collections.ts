import { api } from '@/shared/api/client';
import type { CollectionDetailDto, CollectionListItemDto, Paginated } from '@/modules/collections/types';

export type ListCollectionsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  city?: string;
};

export async function listCollections(query: ListCollectionsQuery): Promise<Paginated<CollectionListItemDto>> {
  const qs = new URLSearchParams();
  qs.set('page', String(query.page ?? 1));
  qs.set('limit', String(query.limit ?? 50));
  if (query.search) qs.set('search', query.search);
  if (query.status) qs.set('status', query.status);
  if (query.city) qs.set('city', query.city);
  return api<Paginated<CollectionListItemDto>>(`/admin/collections?${qs.toString()}`);
}

export async function getCollection(id: string): Promise<CollectionDetailDto> {
  return api<CollectionDetailDto>(`/admin/collections/${id}`);
}

