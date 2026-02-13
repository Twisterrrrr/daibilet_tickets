'use client';

import { useState } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import { useCart, type CartItem } from '@/lib/cart';

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

export function AddToCartButton(props: AddToCartButtonProps) {
  const { addItem, items } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const isInCart = items.some((i) => i.offerId === props.offerId);

  const handleAdd = () => {
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
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  if (justAdded || isInCart) {
    return (
      <button
        disabled
        className={`flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 ${props.className || ''}`}
      >
        <Check className="h-4 w-4" />
        {justAdded ? 'Добавлено!' : 'В корзине'}
      </button>
    );
  }

  return (
    <button
      onClick={handleAdd}
      className={`flex w-full items-center justify-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-medium text-primary-700 transition hover:bg-primary-100 ${props.className || ''}`}
    >
      <ShoppingCart className="h-4 w-4" />
      В корзину
    </button>
  );
}
