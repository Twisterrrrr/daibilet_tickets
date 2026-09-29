import { api } from '@/shared/api/client';
import type { Paginated, RefundRequestAdminRowDto } from '@/modules/refunds/types';

export type ListRefundRequestsQuery = {
  page?: number;
  limit?: number;
  status?: string;
};

export async function listRefundRequests(
  query: ListRefundRequestsQuery,
): Promise<Paginated<RefundRequestAdminRowDto>> {
  const qs = new URLSearchParams();
  if (query.status?.trim()) qs.set('status', query.status.trim());
  qs.set('page', String(query.page ?? 1));
  qs.set('limit', String(query.limit ?? 25));
  return api<Paginated<RefundRequestAdminRowDto>>(`/admin/refunds/requests?${qs.toString()}`);
}

