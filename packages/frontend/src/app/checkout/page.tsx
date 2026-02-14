import type { Metadata } from 'next';
import { CheckoutClient } from './CheckoutClient';
import { CheckoutErrorBoundary } from '@/components/CheckoutErrorBoundary';

export const metadata: Metadata = {
  title: 'Оформление заказа — Дайбилет',
  description: 'Оформление билетов и заявок',
};

export default function CheckoutPage() {
  return (
    <CheckoutErrorBoundary>
      <CheckoutClient />
    </CheckoutErrorBoundary>
  );
}
