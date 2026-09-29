import { api } from '@/shared/api/client';
import type {
  ExternalOrderDetailDto,
  ExternalOrderLinkDto,
  ExternalRefundRequestDto,
  ExternalRefundRequestReason,
  ExternalRefundRequestStatus,
  Paginated,
  TicketProviderCode,
} from '@/modules/external-orders/types';

export type ListExternalOrdersQuery = {
  page?: number;
  limit?: number;
  provider?: TicketProviderCode;
  status?: string;
  integrationState?: string;
  /** Подстрока `externalOrderId`; при полном UUID — также `id` ссылки (сервер). */
  search?: string;
  /** `true` | `false` — строкой в query, как на бэке */
  hasRefundRequests?: string;
  refundPending?: string;
};

export async function listExternalOrders(query: ListExternalOrdersQuery): Promise<Paginated<ExternalOrderLinkDto>> {
  const qs = new URLSearchParams();
  qs.set('page', String(query.page ?? 1));
  qs.set('limit', String(query.limit ?? 50));
  if (query.provider) qs.set('provider', query.provider);
  if (query.status) qs.set('status', query.status);
  if (query.integrationState) qs.set('integrationState', query.integrationState);
  if (query.search?.trim()) qs.set('search', query.search.trim());
  if (query.hasRefundRequests) qs.set('hasRefundRequests', query.hasRefundRequests);
  if (query.refundPending) qs.set('refundPending', query.refundPending);
  return api<Paginated<ExternalOrderLinkDto>>(`/admin/external-orders?${qs.toString()}`);
}

export async function getExternalOrderDetail(id: string): Promise<ExternalOrderDetailDto> {
  return api<ExternalOrderDetailDto>(`/admin/external-orders/${encodeURIComponent(id)}`);
}

export async function createExternalRefundRequest(
  externalOrderId: string,
  body: {
    reason?: ExternalRefundRequestReason;
    reasonNote?: string;
    amount?: number;
    currency?: string;
    assignedToAdminId?: string;
  },
): Promise<ExternalRefundRequestDto> {
  return api<ExternalRefundRequestDto>(`/admin/external-orders/${encodeURIComponent(externalOrderId)}/refund-requests`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function patchExternalRefundRequest(
  id: string,
  body: {
    status?: ExternalRefundRequestStatus;
    reason?: ExternalRefundRequestReason;
    reasonNote?: string;
    amount?: number | null;
    currency?: string;
    assignedToAdminId?: string;
    unassign?: boolean;
  },
): Promise<ExternalRefundRequestDto> {
  return api<ExternalRefundRequestDto>(`/admin/external-refund-requests/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
