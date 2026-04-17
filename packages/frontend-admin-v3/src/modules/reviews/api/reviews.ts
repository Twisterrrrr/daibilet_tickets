import { adminApi } from '@/api/client';

export type AdminReviewRow = {
  id: string;
  rating: number;
  status: string;
  authorName?: string | null;
  authorEmail?: string | null;
  text?: string | null;
  adminComment?: string | null;
  createdAt: string;
  event?: { id: string; title: string; slug: string } | null;
  venue?: { id: string; title: string; slug: string } | null;
};

export type Paginated<T> = { items: T[]; total: number; page: number; pages: number };

export async function fetchAdminReviews(params: { page: number; limit: number; status?: string; eventId?: string }) {
  const sp = new URLSearchParams();
  sp.set('page', String(params.page));
  sp.set('limit', String(params.limit));
  if (params.status) sp.set('status', params.status);
  if (params.eventId) sp.set('eventId', params.eventId);
  return adminApi.get<Paginated<AdminReviewRow> & { pendingCount?: number }>(`/admin/reviews?${sp.toString()}`);
}

export async function approveAdminReview(id: string) {
  return adminApi.patch(`/admin/reviews/${encodeURIComponent(id)}/approve`, {});
}

export async function rejectAdminReview(id: string, adminComment?: string) {
  return adminApi.patch(`/admin/reviews/${encodeURIComponent(id)}/reject`, { adminComment });
}

export async function deleteAdminReview(id: string) {
  return adminApi.delete(`/admin/reviews/${encodeURIComponent(id)}`);
}

export type SupplierResponseRow = {
  id: string;
  status: string;
  text: string;
  createdAt: string;
  reviewId: string;
  supplierId?: string | null;
};

export async function fetchAdminSupplierResponses(params: { page: number; limit: number }) {
  const sp = new URLSearchParams();
  sp.set('page', String(params.page));
  sp.set('limit', String(params.limit));
  return adminApi.get<Paginated<SupplierResponseRow>>(`/admin/reviews/supplier-responses?${sp.toString()}`);
}

export async function approveSupplierResponse(id: string) {
  return adminApi.patch(`/admin/reviews/supplier-responses/${encodeURIComponent(id)}/approve`, {});
}

export async function rejectSupplierResponse(id: string, moderationComment: string) {
  return adminApi.patch(`/admin/reviews/supplier-responses/${encodeURIComponent(id)}/reject`, { moderationComment });
}

export type DisputeRow = {
  id: string;
  status: string;
  createdAt: string;
  reviewId: string;
};

export async function fetchAdminReviewDisputes(params: { page: number; limit: number }) {
  const sp = new URLSearchParams();
  sp.set('page', String(params.page));
  sp.set('limit', String(params.limit));
  return adminApi.get<Paginated<DisputeRow>>(`/admin/reviews/disputes?${sp.toString()}`);
}

export async function resolveReviewDispute(id: string, data: { status: string; decisionComment?: string }) {
  return adminApi.patch(`/admin/reviews/disputes/${encodeURIComponent(id)}/resolve`, data);
}

