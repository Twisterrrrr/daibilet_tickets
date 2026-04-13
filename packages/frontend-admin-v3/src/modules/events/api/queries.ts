import { adminApi } from '@/api/client';

export type AdminEventListItem = {
  id: string;
  title: string;
  category: string;
  source: string;
  rating: number | null;
  isActive: boolean;
  updatedAt: string;
  city?: { name: string; slug: string };
  _count?: { sessions?: number; tags?: number; offers?: number };
  override?: { isHidden?: boolean; editorStatus?: string | null } | null;
  sectionsDerived?: Array<{ slug: 'events' | 'excursions' | 'museums' | 'activities' | 'entertainment'; name: string }>;
  subcategoriesCanonical?: Array<{ id: string; slug: string; name: string; isActive?: boolean }>;
  lastSessionAt?: string | null;
  isPast?: boolean;
  isArchived?: boolean;
  isIndexable?: boolean;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pages: number;
  nextCursor?: string | null;
  hasMore?: boolean;
};

export type AdminEventsListParams = {
  q?: string;
  city?: string;
  category?: string;
  source?: string;
  active?: 'true' | 'false';
  hidden?: 'true' | 'false';
  section?: 'events' | 'excursions' | 'museums' | 'activities' | 'entertainment';
  subcategory?: string;
  hasNoSubcategory?: 'true' | 'false';
  hasMultipleSubcategories?: 'true' | 'false';
  isPast?: 'true' | 'false';
  isArchived?: 'true' | 'false';
  isIndexable?: 'true' | 'false';
  pastDays?: number;
  sortBy?: 'updatedAt' | 'title' | 'city' | 'source';
  sortDir?: 'asc' | 'desc';
  page: number;
  limit: number;
};

export async function fetchAdminEventsList(params: AdminEventsListParams) {
  const sp = new URLSearchParams();
  if (params.q) sp.set('search', params.q);
  if (params.city) sp.set('city', params.city);
  if (params.category) sp.set('category', params.category);
  if (params.source) sp.set('source', params.source);
  if (params.active) sp.set('active', params.active);
  if (params.hidden) sp.set('hidden', params.hidden);
  if (params.section) sp.set('section', params.section);
  if (params.subcategory) sp.set('subcategory', params.subcategory);
  if (params.hasNoSubcategory) sp.set('hasNoSubcategory', params.hasNoSubcategory);
  if (params.hasMultipleSubcategories) sp.set('hasMultipleSubcategories', params.hasMultipleSubcategories);
  if (params.isPast) sp.set('isPast', params.isPast);
  if (params.isArchived) sp.set('isArchived', params.isArchived);
  if (params.isIndexable) sp.set('isIndexable', params.isIndexable);
  if (params.pastDays) sp.set('pastDays', String(params.pastDays));
  if (params.sortBy) sp.set('sortBy', params.sortBy);
  if (params.sortDir) sp.set('sortDir', params.sortDir);
  sp.set('page', String(params.page));
  sp.set('limit', String(params.limit));

  return adminApi.get<PaginatedResult<AdminEventListItem>>(`/admin/events?${sp.toString()}`);
}

