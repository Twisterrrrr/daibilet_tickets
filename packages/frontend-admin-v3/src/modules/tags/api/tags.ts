import { adminApi } from '@/api/client';

export type AdminTagListItem = {
  id: string;
  slug: string;
  name: string;
  category: string;
  tagKind: string | null;
  structuralGroup: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  version: number;
  updatedAt: string;
  _count?: { events?: number; articleTags?: number };
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pages: number;
  nextCursor?: string | null;
  hasMore?: boolean;
};

export async function fetchAdminTagsList(params: { page: number; limit: number; search?: string; category?: string }) {
  const sp = new URLSearchParams();
  sp.set('page', String(params.page));
  sp.set('limit', String(params.limit));
  if (params.search) sp.set('search', params.search);
  if (params.category) sp.set('category', params.category);
  return adminApi.get<PaginatedResult<AdminTagListItem>>(`/admin/tags?${sp.toString()}`);
}

export async function fetchAdminTag(id: string) {
  return adminApi.get<AdminTagListItem>(`/admin/tags/${encodeURIComponent(id)}`);
}

export async function createAdminTag(data: Partial<AdminTagListItem> & { slug: string; name: string; category: string }) {
  return adminApi.post<AdminTagListItem>('/admin/tags', data);
}

export async function patchAdminTag(id: string, data: Record<string, unknown>) {
  return adminApi.patch<AdminTagListItem>(`/admin/tags/${encodeURIComponent(id)}`, data);
}

export async function deleteAdminTag(id: string) {
  return adminApi.delete<{ success: true }>(`/admin/tags/${encodeURIComponent(id)}`);
}

export async function unlinkTagFromEvents(slug: string) {
  return adminApi.post<{ success: true; deleted: number; message?: string }>('/admin/tags/unlink-from-events', { slug });
}

