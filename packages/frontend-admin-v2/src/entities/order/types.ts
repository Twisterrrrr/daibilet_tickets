export type OrderStatus = 'pending' | 'paid' | 'refunded' | 'cancelled';

export interface OrderEntity {
  id: string;
  code: string;
  status: OrderStatus;
  amount: number;
  currency: string;
  buyerName: string;
  buyerEmail: string;
  eventTitle: string;
  supplierName: string;
  createdAt: string;
  updatedAt: string;
}
