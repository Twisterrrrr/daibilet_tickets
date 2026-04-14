import { adminApi } from '@/api/client';

export type ArticleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type AdminArticleListItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  displayTitle: string;
  displayExcerpt: string;
  city: { id: string; name: string; slug: string } | null;
  status: ArticleStatus;
  publishedAt: string | null;
  updatedAt: string;
};

export type AdminArticleDetail = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImageUrl: string | null;
  city: { id: string; name: string; slug: string } | null;
  relatedLandingIds: string[];
  relatedCollectionIds: string[];
  seo: { title: string | null; description: string | null };
  status: ArticleStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  displayTitle: string;
  displayExcerpt: string;
};

export type PaginatedArticles = {
  items: AdminArticleListItem[];
  total: number;
  nextCursor: string | null;
  hasMore: boolean;
};

export async function fetchAdminArticlesList(params: {
  search?: string;
  cityId?: string;
  status?: ArticleStatus;
  page?: number;
  limit?: number;
  sort?: 'updatedAt' | 'publishedAt' | 'title';
  order?: 'asc' | 'desc';
}): Promise<PaginatedArticles> {
  const sp = new URLSearchParams();
  if (params.search) sp.set('search', params.search);
  if (params.cityId) sp.set('cityId', params.cityId);
  if (params.status) sp.set('status', params.status);
  sp.set('page', String(params.page ?? 1));
  sp.set('limit', String(params.limit ?? 50));
  if (params.sort) sp.set('sort', params.sort);
  if (params.order) sp.set('order', params.order);
  return adminApi.get<PaginatedArticles>(`/admin/articles?${sp.toString()}`);
}

export async function fetchAdminArticle(id: string): Promise<AdminArticleDetail> {
  return adminApi.get<AdminArticleDetail>(`/admin/articles/${id}`);
}

export async function createAdminArticle(body: Record<string, unknown>): Promise<AdminArticleDetail> {
  return adminApi.post<AdminArticleDetail>('/admin/articles', body);
}

export async function patchAdminArticle(id: string, body: Record<string, unknown>): Promise<AdminArticleDetail> {
  return adminApi.patch<AdminArticleDetail>(`/admin/articles/${id}`, body);
}
