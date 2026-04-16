import { RefundRequestStatus } from '@/prisma-client';

/**
 * Статусы TC refund_requests: new | in_progress | approved | rejected
 * @see https://ticketscloud.readthedocs.io/ru/latest/extra/refunds_list.html
 */
export function mapTcRefundStatusToRefundRequestStatus(
  tcStatus: string | undefined,
): RefundRequestStatus | null {
  const s = (tcStatus ?? '').toLowerCase().trim();
  switch (s) {
    case 'new':
      return RefundRequestStatus.CREATED;
    case 'in_progress':
      return RefundRequestStatus.PROCESSING;
    case 'approved':
      return RefundRequestStatus.COMPLETED;
    case 'rejected':
      return RefundRequestStatus.REJECTED;
    default:
      return null;
  }
}
