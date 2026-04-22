import { adminApi } from '@/api/client';

export type AdminCollectionListRow = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  city: { id: string; name: string; slug: string } | null;
  sourceType: string;
  status: string;
  itemsCount?: number;
  publishedAt?: string | null;
  updatedAt: string;
};

type ListApi = {
  items: AdminCollectionListRow[];
  total: number;
  nextCursor?: string | null;
  hasMore?: boolean;
};

export async function fetchAdminCollectionsList(params: {
  search?: string;
  city?: string;
  status?: string;
  sourceType?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: AdminCollectionListRow[]; total: number }> {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.city) q.set('city', params.city);
  if (params.status) q.set('status', params.status);
  if (params.sourceType) q.set('sourceType', params.sourceType);
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  const res = await adminApi.get<ListApi>(`/admin/collections?${q.toString()}`);
  return { items: res.items ?? [], total: res.total ?? 0 };
}

export type AdminCollectionItem = {
  id: string;
  collectionId: string;
  eventId: string;
  sortOrder: number;
  isPinned: boolean;
  isExcluded: boolean;
  createdAt: string;
  event: {
    id: string;
    title: string;
    slug: string | null;
    isActive: boolean;
    source?: string | null;
    priceFrom?: string | number | null;
    city?: { id: string; name: string; slug: string } | null;
  };
};

export type AdminCollectionDetail = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  heroImage?: string | null;
  cityId?: string | null;
  city?: { id: string; name: string; slug: string } | null;
  status: string;
  sourceType: string;
  selectionBasis: string;
  isActive?: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  publishedAt?: string | null;
  updatedAt: string;
  version: number;
  pinnedEventIds?: string[];
  excludedEventIds?: string[];
  queryConfig?: unknown | null;
  items?: AdminCollectionItem[];
  // legacy + normalized tag filters
  filterTags?: string[];
  tagFilters?: Array<{
    tagId: string;
    position: number;
    tag: { id: string; slug: string; name: string; isActive?: boolean; isDeleted?: boolean };
  }>;
};

export type AdminCollectionTagFilterUpsert = { tagId: string; position?: number };

export async function fetchAdminCollectionDetail(id: string): Promise<AdminCollectionDetail> {
  return adminApi.get<AdminCollectionDetail>(`/admin/collections/${encodeURIComponent(id)}`);
}

export async function patchAdminCollection(
  id: string,
  body: Partial<
    Pick<
      AdminCollectionDetail,
      | 'slug'
      | 'title'
      | 'subtitle'
      | 'description'
      | 'heroImage'
      | 'cityId'
      | 'status'
      | 'sourceType'
      | 'selectionBasis'
      | 'isActive'
      | 'metaTitle'
      | 'metaDescription'
      | 'queryConfig'
      | 'filterTags'
    > & { tagFilters?: AdminCollectionTagFilterUpsert[] }
  > & { version: number },
): Promise<AdminCollectionDetail> {
  return adminApi.patch<AdminCollectionDetail>(`/admin/collections/${encodeURIComponent(id)}`, body);
}

export async function publishAdminCollection(id: string, version: number): Promise<AdminCollectionDetail> {
  return patchAdminCollection(id, { status: 'ACTIVE', isActive: true, version });
}

export async function unpublishAdminCollection(id: string, version: number): Promise<AdminCollectionDetail> {
  return patchAdminCollection(id, { status: 'DRAFT', isActive: false, version });
}

export async function addAdminCollectionItem(id: string, eventId: string): Promise<AdminCollectionItem> {
  return adminApi.post<AdminCollectionItem>(`/admin/collections/${encodeURIComponent(id)}/items`, { eventId });
}

export async function removeAdminCollectionItem(id: string, itemId: string): Promise<{ success: true }> {
  return adminApi.delete<{ success: true }>(
    `/admin/collections/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}`,
  );
}

export async function reorderAdminCollectionItems(
  id: string,
  itemIdsInOrder: string[],
): Promise<{ success: true }> {
  return adminApi.patch<{ success: true }>(`/admin/collections/${encodeURIComponent(id)}/items/reorder`, {
    itemIdsInOrder,
  });
}

export type ResolvedCollectionItemsResponse = {
  total: number;
  items: Array<{
    eventId: string;
    title: string;
    slug: string | null;
    isActive: boolean;
    priceFrom?: string | number | null;
  }>;
};

export async function fetchAdminCollectionResolvedItems(id: string, limit = 50): Promise<ResolvedCollectionItemsResponse> {
  return adminApi.get<ResolvedCollectionItemsResponse>(
    `/admin/collections/${encodeURIComponent(id)}/resolved-items?limit=${encodeURIComponent(String(limit))}`,
  );
}
