import { api } from '@/shared/api/client';
import type { Paginated, SubcategoryDto, TagDto } from '@/modules/taxonomy/types';

export async function listTags(params: { category?: string; search?: string; page?: number; limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.category) qs.set('category', params.category);
  if (params.search) qs.set('search', params.search);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const q = qs.toString();
  return api<Paginated<TagDto>>(`/admin/tags${q ? `?${q}` : ''}`);
}

export type CreateAdminTagBody = {
  slug: string;
  name: string;
  category: 'THEME' | 'AUDIENCE' | 'SEASON' | 'SPECIAL';
  code?: string;
  tagKind: 'STRUCTURAL' | 'POPULAR';
  structuralGroup?: 'THEME' | 'AUDIENCE' | 'FORMAT';
  nameEn?: string;
  description?: string;
  heroImage?: string;
  metaTitle?: string;
  metaDescription?: string;
};

export async function createTag(body: CreateAdminTagBody): Promise<TagDto> {
  return api<TagDto>(`/admin/tags`, { method: 'POST', body: JSON.stringify(body) });
}

export async function listEventPrimarySubcategories(
  params: { includeInactive?: boolean; withUsage?: boolean; /** Prisma `EventCategory` */ eventCategory?: string } = {},
) {
  const qs = new URLSearchParams();
  qs.set('layer', 'PRIMARY');
  qs.set('forEntity', 'event');
  if (params.eventCategory) qs.set('type', params.eventCategory);
  if (params.includeInactive) qs.set('includeInactive', '1');
  if (params.withUsage) qs.set('withUsage', '1');
  return api<SubcategoryDto[]>(`/admin/subcategories?${qs.toString()}`);
}

export async function listEventSecondarySubcategories(params: { includeInactive?: boolean; withUsage?: boolean } = {}) {
  const qs = new URLSearchParams();
  qs.set('layer', 'SECONDARY');
  qs.set('forEntity', 'event');
  if (params.includeInactive) qs.set('includeInactive', '1');
  if (params.withUsage) qs.set('withUsage', '1');
  return api<SubcategoryDto[]>(`/admin/subcategories?${qs.toString()}`);
}

