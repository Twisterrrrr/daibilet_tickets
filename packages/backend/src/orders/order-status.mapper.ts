import { Injectable } from '@nestjs/common';

import type { CheckoutSession, OrderStatus, PaymentIntent } from '@/prisma-client';

@Injectable()
export class OrderStatusMapper {
  mapCheckout(session: CheckoutSession, paymentIntent?: PaymentIntent | null): OrderStatus {
    if (!paymentIntent) {
      return 'PENDING';
    }

    if (paymentIntent.status === 'PAID') return 'PAID';
    if (paymentIntent.status === 'FAILED') return 'FAILED';
    if (paymentIntent.status === 'CANCELLED') return 'CANCELLED';

    return 'PENDING';
  }

  // Узкий маппинг для TicketsCloud-миррора; конкретные поля будут уточняться по мере интеграции.
  mapTc(order: unknown): OrderStatus {
    const o = (order ?? {}) as Record<string, unknown>;
    const isPaid = 'isPaid' in o ? Boolean(o.isPaid) : false;
    const isCancelled = 'isCancelled' in o ? Boolean(o.isCancelled) : false;

    if (isPaid) return 'PAID';
    if (isCancelled) return 'CANCELLED';
    return 'PENDING';
  }

  // Письмо с билетом/ваучером от teplohod.info трактуем как уже оплаченное.
  // Тип intentionally слабый, чтобы не тянуть сюда format-парсер.
  mapTeplohod(_parsed: unknown): OrderStatus {
    return 'PAID';
  }
}

