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

export interface OrderLineItem {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
  currency: string;
}

/** Расширение списка для карточки заказа (мок / будущий GET /admin/orders/:id). */
export interface OrderDetail extends OrderEntity {
  eventId: string;
  supplierId: string;
  buyerPhone: string;
  paymentMethod: string;
  /** Внешний идентификатор платежа (маскированный). */
  paymentExternalRef: string;
  lineItems: OrderLineItem[];
  internalNote?: string;
}
