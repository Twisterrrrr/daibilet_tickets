import { adminApi } from '@/api/client';

export type SubcategoryUsage = {
  eventsCount: number;
  venuesCount: number;
};

export type AdminSubcategoryRow = {
  id: string;
  slug: string;
  code: string;
  nameRu: string;
  type: string;
  layer: string;
  sortOrder: number;
  isActive: boolean;
  isLandingEnabled: boolean;
  landingMode: string;
  landingTopicKey: string | null;
  parentId: string | null;
  parent?: { id: string; slug: string; nameRu: string } | null;
  children?: Array<{ id: string; slug: string; nameRu: string; isActive: boolean }> | null;
  usage?: SubcategoryUsage;
  updatedAt?: string;
  createdAt?: string;
};

export async function fetchAdminSubcategories(params: {
  forEntity?: 'event' | 'venue';
  layer?: 'PRIMARY' | 'SECONDARY';
  includeInactive?: boolean;
  withUsage?: boolean;
}) {
  const sp = new URLSearchParams();
  if (params.forEntity) sp.set('forEntity', params.forEntity);
  if (params.layer) sp.set('layer', params.layer);
  if (params.includeInactive) sp.set('includeInactive', 'true');
  if (params.withUsage) sp.set('withUsage', '1');
  return adminApi.get<AdminSubcategoryRow[]>(`/admin/subcategories?${sp.toString()}`);
}

export async function fetchAdminSubcategory(id: string, withUsage: boolean) {
  const sp = new URLSearchParams();
  if (withUsage) sp.set('withUsage', '1');
  return adminApi.get<AdminSubcategoryRow>(`/admin/subcategories/${id}?${sp.toString()}`);
}

export async function createAdminSubcategory(dto: {
  slug: string;
  code: string;
  nameRu: string;
  type: string;
  layer?: string;
  parentId?: string | null;
  isActive?: boolean;
  isLandingEnabled?: boolean;
  landingMode?: string;
  landingTopicKey?: string | null;
  sortOrder?: number;
}) {
  return adminApi.post<AdminSubcategoryRow>('/admin/subcategories', dto);
}

export async function updateAdminSubcategory(id: string, dto: Partial<Omit<Parameters<typeof createAdminSubcategory>[0], 'code'>> & { code?: string }) {
  return adminApi.patch<AdminSubcategoryRow>(`/admin/subcategories/${id}`, dto);
}

export async function fetchAdminSubcategoryUsage(id: string, params: { entityType: 'EVENT' | 'VENUE'; page: number; limit: number }) {
  const sp = new URLSearchParams();
  sp.set('entityType', params.entityType);
  sp.set('page', String(params.page));
  sp.set('limit', String(params.limit));
  return adminApi.get<{
    entityType: 'EVENT' | 'VENUE';
    items: Array<{ id: string; title: string; slug: string }>;
    total: number;
    page: number;
    pages: number;
  }>(`/admin/subcategories/${id}/usage?${sp.toString()}`);
}

