export type RefundRequestAdminRowDto = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
  createdByType: string;
  fulfillmentItemId: string;
  checkoutSessionId: string;
  fulfillmentStatus: string;
  paymentIntentStatus: string;
};

export type Paginated<T> = { items: T[]; total: number; page: number; pages: number };

