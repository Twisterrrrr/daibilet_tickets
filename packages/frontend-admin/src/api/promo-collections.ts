import { adminApi } from './client';

export type PromoSelectionMode = 'MANUAL' | 'AUTO';
export type PromoCollectionContentType = 'EVENTS' | 'VENUES';
export type PromoCollectionItemType = 'EVENT' | 'VENUE';
export type PromoSortMode = 'POPULAR' | 'RATING' | 'SOONEST' | 'RANDOM';

export interface PromoCollection {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  selectionMode: PromoSelectionMode;
  contentType: PromoCollectionContentType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { items: number; blocks: number };
  items?: PromoCollectionItem[];
  rule?: PromoCollectionRule;
}

export interface PromoCollectionItem {
  id: string;
  collectionId: string;
  itemType: PromoCollectionItemType;
  eventId: string | null;
  venueId: string | null;
  sortOrder: number;
  event?: { id: string; slug: string; title: string; imageUrl?: string | null } | null;
  venue?: { id: string; slug: string; title: string; imageUrl?: string | null } | null;
}

export interface PromoCollectionRule {
  id: string;
  collectionId: string;
  citySlug: string | null;
  categorySlug: string | null;
  tagSlugs: string[];
  isKids: boolean | null;
  isIndoor: boolean | null;
  sortMode: PromoSortMode;
  limit: number;
  onlyActive: boolean;
  onlyBookable: boolean;
}

export interface PromoCollectionFormData {
  slug: string;
  title: string;
  description?: string;
  selectionMode: PromoSelectionMode;
  contentType: PromoCollectionContentType;
  isActive?: boolean;
}

export interface PromoCollectionRuleFormData {
  citySlug?: string | null;
  categorySlug?: string | null;
  tagSlugs?: string[];
  isKids?: boolean | null;
  isIndoor?: boolean | null;
  sortMode?: PromoSortMode;
  limit?: number;
  onlyActive?: boolean;
  onlyBookable?: boolean;
}

export const promoCollectionsApi = {
  list: () => adminApi.get<PromoCollection[]>('/admin/promo-collections'),
  get: (id: string) => adminApi.get<PromoCollection>(`/admin/promo-collections/${id}`),
  create: (data: PromoCollectionFormData) =>
    adminApi.post<PromoCollection>('/admin/promo-collections', data),
  update: (id: string, data: Partial<PromoCollectionFormData>) =>
    adminApi.patch<PromoCollection>(`/admin/promo-collections/${id}`, data),
  delete: (id: string) => adminApi.delete<{ success: boolean }>(`/admin/promo-collections/${id}`),
  listItems: (id: string) => adminApi.get<PromoCollectionItem[]>(`/admin/promo-collections/${id}/items`),
  addItem: (id: string, data: { itemType: PromoCollectionItemType; eventId?: string; venueId?: string; sortOrder?: number }) =>
    adminApi.post<PromoCollectionItem>(`/admin/promo-collections/${id}/items`, data),
  updateItem: (id: string, itemId: string, data: { sortOrder?: number }) =>
    adminApi.patch<PromoCollectionItem>(`/admin/promo-collections/${id}/items/${itemId}`, data),
  removeItem: (id: string, itemId: string) =>
    adminApi.delete<{ success: boolean }>(`/admin/promo-collections/${id}/items/${itemId}`),
  getRule: (id: string) => adminApi.get<PromoCollectionRule | null>(`/admin/promo-collections/${id}/rule`),
  upsertRule: (id: string, data: PromoCollectionRuleFormData) =>
    adminApi.put<PromoCollectionRule>(`/admin/promo-collections/${id}/rule`, data),
  preview: (id: string) =>
    adminApi.get<{ id: string; slug: string; title: string }[]>(`/admin/promo-collections/${id}/preview`),
};
