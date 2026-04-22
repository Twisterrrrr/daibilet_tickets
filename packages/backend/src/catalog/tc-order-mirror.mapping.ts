import { ExternalIntegrationState, ExternalOrderStatus } from '@/prisma-client';

/**
 * Маппинг статуса заказа TC → ExternalOrderLink (агентское зеркало без собственной оплаты на сайте).
 * Статусы TC: executed | in_progress | done | cancelled | expired (см. lifecycle в доке TC).
 */
export function mapTcOrderStatusToMirror(tcStatus: string | undefined): {
  status: ExternalOrderStatus;
  integrationState: ExternalIntegrationState;
} {
  const s = (tcStatus ?? '').toLowerCase();
  switch (s) {
    case 'done':
      return { status: ExternalOrderStatus.CONFIRMED, integrationState: ExternalIntegrationState.CONFIRMED };
    case 'cancelled':
      return { status: ExternalOrderStatus.CANCELLED, integrationState: ExternalIntegrationState.CONFIRMED };
    case 'expired':
      return { status: ExternalOrderStatus.FAILED, integrationState: ExternalIntegrationState.RECONCILE_REQUIRED };
    case 'executed':
    case 'in_progress':
    default:
      return { status: ExternalOrderStatus.OPEN, integrationState: ExternalIntegrationState.AWAITING_CONFIRMATION };
  }
}
