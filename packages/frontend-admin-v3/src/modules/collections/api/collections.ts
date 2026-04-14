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
  page?: number;
  limit?: number;
}): Promise<{ items: AdminCollectionListRow[]; total: number }> {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.city) q.set('city', params.city);
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  const res = await adminApi.get<ListApi>(`/admin/collections?${q.toString()}`);
  return { items: res.items ?? [], total: res.total ?? 0 };
}
