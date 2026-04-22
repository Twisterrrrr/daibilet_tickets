import { adminApi } from '@/api/client';

export type ModerationQueueItem = {
  id: string;
  title: string;
  slug: string;
  moderationStatus: string;
  createdAt: string;
  city?: { id: string; name: string } | null;
  operator?: { id: string; name: string; trustLevel: number; companyName?: string | null } | null;
  _count?: { offers?: number };
};

export type ModerationQueueResponse = {
  items: ModerationQueueItem[];
  total: number;
  page: number;
  pages: number;
  sortBy: string;
};

export async function fetchAdminModerationQueue(params: { status?: string; page: number; limit: number; sortBy?: string }) {
  const sp = new URLSearchParams();
  sp.set('page', String(params.page));
  sp.set('limit', String(params.limit));
  if (params.status) sp.set('status', params.status);
  if (params.sortBy) sp.set('sortBy', params.sortBy);
  return adminApi.get<ModerationQueueResponse>(`/admin/moderation/queue?${sp.toString()}`);
}

export async function fetchAdminModerationCount() {
  return adminApi.get<{ pending: number }>('/admin/moderation/count');
}

export async function approveAdminModerationEvent(id: string) {
  return adminApi.post(`/admin/moderation/${encodeURIComponent(id)}/approve`, {});
}

export async function rejectAdminModerationEvent(id: string, reason: string) {
  return adminApi.post(`/admin/moderation/${encodeURIComponent(id)}/reject`, { reason });
}

