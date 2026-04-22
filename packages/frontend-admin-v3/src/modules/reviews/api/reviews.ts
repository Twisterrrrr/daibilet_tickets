import { adminApi } from '@/api/client';

export type ReviewPhotoRow = { id: string; url: string; thumbUrl: string };

export type AdminReviewRow = {
  id: string;
  rating: number;
  title?: string | null;
  status: string;
  authorName?: string | null;
  authorEmail?: string | null;
  text?: string | null;
  isVerified?: boolean;
  helpfulCount?: number;
  voucherCode?: string | null;
  adminComment?: string | null;
  createdAt: string;
  event?: { id: string; title: string; slug: string } | null;
  venue?: { id: string; title: string; slug: string } | null;
  photos?: ReviewPhotoRow[];
};

export type Paginated<T> = { items: T[]; total: number; page: number; pages: number };

export async function fetchAdminReviews(params: {
  page: number;
  limit: number;
  status?: string;
  eventId?: string;
  /** true — без фото (легче). false — полные карточки как в Admin V2. */
  lite?: boolean;
}) {
  const sp = new URLSearchParams();
  sp.set('page', String(params.page));
  sp.set('limit', String(params.limit));
  if (params.lite === true) sp.set('lite', '1');
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
  review: {
    id: string;
    rating: number;
    title?: string | null;
    text: string;
    authorName: string;
    createdAt: string;
    event?: { id: string; title: string; slug: string } | null;
  };
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

export async function rejectSupplierResponse(id: string, moderationComment?: string) {
  return adminApi.patch(`/admin/reviews/supplier-responses/${encodeURIComponent(id)}/reject`, { moderationComment });
}

export type DisputeEvidenceRow = { id: string; storageKey: string; fileName: string; url?: string };

export type DisputeRow = {
  id: string;
  status: string;
  reasonCode: string;
  claimText: string;
  createdAt: string;
  reviewId: string;
  review: {
    id: string;
    rating: number;
    title?: string | null;
    text: string;
    authorName: string;
    createdAt: string;
    status: string;
    event?: { id: string; title: string; slug: string } | null;
  };
  evidence: DisputeEvidenceRow[];
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

