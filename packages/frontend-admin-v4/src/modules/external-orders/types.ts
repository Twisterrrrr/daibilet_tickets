// Backend expects provider as Prisma enum (case-sensitive).
// For external orders endpoints we must use canonical codes, otherwise filters break.
export type TicketProviderCode = 'TICKETS_CLOUD' | 'TEPLOHOD';

export type ExternalOrderStatus = string;
export type ExternalIntegrationState = string;

export type ExternalOrderLinkDto = {
  id: string;
  provider: TicketProviderCode;
  status: ExternalOrderStatus;
  integrationState: ExternalIntegrationState;
  createdAt: string;
  externalOrderId: string | null;
  eventTitle: string | null;
  eventDateLabel: string | null;
  refundRequestsCount?: number;
  hasPendingRefundRequests?: boolean;
};

export type ExternalRefundRequestStatus =
  | 'REQUESTED'
  | 'IN_REVIEW'
  | 'PROVIDER_CONTACTED'
  | 'APPROVED_MANUAL'
  | 'REJECTED'
  | 'COMPLETED'
  | 'CANCELED';

export type ExternalRefundRequestReason = 'OTHER' | 'CUSTOMER_REQUEST' | 'PROVIDER_CANCELED' | 'DUPLICATE' | 'WRONG_DATE';

export type ExternalRefundRequestDto = {
  id: string;
  externalOrderLinkId: string;
  status: ExternalRefundRequestStatus;
  reason: ExternalRefundRequestReason;
  reasonNote: string | null;
  amount: number | null;
  currency: string;
  createdByAdminId: string | null;
  assignedToAdminId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExternalTicketDto = {
  id: string;
  provider: TicketProviderCode;
  externalTicketId: string;
  createdAt: string;
  payload: unknown | null;
};

export type ExternalOrderDetailDto = {
  id: string;
  provider: TicketProviderCode;
  externalOrderId: string;
  status: ExternalOrderStatus;
  integrationState: ExternalIntegrationState;
  createdAt: string;
  updatedAt: string;
  lastError: string | null;
  payload: unknown | null;
  checkoutSessionId: string | null;
  packageId: string | null;
  packageItemId: string | null;
  tickets: ExternalTicketDto[];
  refundRequests: ExternalRefundRequestDto[];
};

export type Paginated<T> = { items: T[]; total: number; nextCursor?: string | null; hasMore?: boolean };

export type ExternalOrdersModule = {};

