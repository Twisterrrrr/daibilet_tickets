import type { Metadata } from 'next';
import { Suspense } from 'react';

import { OrdersTrackClient } from './OrdersTrackClient';

export const metadata: Metadata = {
  title: 'Отслеживание заказа',
  description: 'Проверьте статус вашего заказа по коду из email-подтверждения.',
};

export default function OrderTrackPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <OrdersTrackClient />
    </Suspense>
  );
}
