'use client';

import { CreditCard, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { type CartItem, useCart } from '@/lib/cart';

interface AddToCartButtonProps {
  eventId: string;
  offerId: string;
  sessionId?: string;
  eventTitle: string;
  eventSlug: string;
  imageUrl?: string;
  priceFrom: number;
  purchaseType: string;
  source: string;
  deeplink?: string;
  badge?: string;
  className?: string;
}

/** Прямой checkout (корзина скрыта до унификации платежей — OpenQuestions §4) */
export function AddToCartButton(props: AddToCartButtonProps) {
  const { addItem } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleBuy = () => {
    const item: CartItem = {
      eventId: props.eventId,
      offerId: props.offerId,
      sessionId: props.sessionId,
      quantity: 1,
      eventTitle: props.eventTitle,
      eventSlug: props.eventSlug,
      imageUrl: props.imageUrl,
      priceFrom: props.priceFrom,
      purchaseType: props.purchaseType,
      source: props.source,
      deeplink: props.deeplink,
      badge: props.badge,
    };
    addItem(item);
    setLoading(true);
    router.push('/checkout');
  };

  return (
    <button
      onClick={handleBuy}
      disabled={loading}
      className={`flex w-full items-center justify-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-medium text-primary-700 transition hover:bg-primary-100 disabled:opacity-70 ${props.className || ''}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
      {loading ? 'Переход...' : 'Купить'}
    </button>
  );
}
