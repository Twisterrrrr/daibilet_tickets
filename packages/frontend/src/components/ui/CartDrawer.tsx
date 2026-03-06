'use client';

import { formatPrice } from '@daibilet/shared';
import { ArrowRight, Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { type CartItem, useCart } from '@/lib/cart';

/** Скрыта до унификации платежей (OpenQuestions §4) */
export function CartIcon() {
  return null;
}

function CartDrawerContent({ onClose }: { onClose: () => void }) {
  const { items, itemCount, totalPrice, removeItem, updateQuantity, clearCart } = useCart();

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-slate-700" />
          <h2 className="text-lg font-bold text-slate-900">Корзина</h2>
          {itemCount > 0 && (
            <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
              {itemCount}
            </span>
          )}
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
          <ShoppingCart className="h-12 w-12 text-slate-300" />
          <p className="mt-3 text-base font-medium text-slate-600">Корзина пуста</p>
          <p className="mt-1 text-sm text-slate-400">Добавьте события, которые хотите посетить</p>
          <Link
            href="/events"
            onClick={onClose}
            className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
          >
            Перейти в каталог
          </Link>
        </div>
      ) : (
        <>
          {/* Items list */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {items.map((item) => (
              <CartItemCard
                key={item.offerId}
                item={item}
                onRemove={() => removeItem(item.offerId)}
                onQuantityChange={(qty) => updateQuantity(item.offerId, qty)}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Итого:</span>
              <span className="text-xl font-bold text-slate-900">{formatPrice(totalPrice)}</span>
            </div>

            <Link
              href="/checkout"
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-base font-medium text-white transition hover:bg-primary-700"
            >
              Оформить
              <ArrowRight className="h-4 w-4" />
            </Link>

            <button
              onClick={() => {
                clearCart();
                onClose();
              }}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition"
            >
              Очистить корзину
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function CartItemCard({
  item,
  onRemove,
  onQuantityChange,
}: {
  item: CartItem;
  onRemove: () => void;
  onQuantityChange: (qty: number) => void;
}) {
  const typeLabel = item.purchaseType === 'REQUEST' ? 'Заявка' : item.purchaseType === 'REDIRECT' ? 'Партнёр' : 'Билет';

  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3">
      {/* Image */}
      {item.imageUrl ? (
        <Image
          src={item.imageUrl}
          alt={item.eventTitle || ''}
          width={64}
          height={64}
          className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 flex-shrink-0">
          <span className="text-2xl opacity-40">🎫</span>
        </div>
      )}

      {/* Details */}
      <div className="flex flex-1 flex-col min-w-0">
        <Link
          href={`/events/${item.eventSlug}`}
          className="text-sm font-medium text-slate-900 line-clamp-2 hover:text-primary-600 transition"
        >
          {item.eventTitle}
        </Link>

        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-xs text-slate-400">{typeLabel}</span>
          {item.badge && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
              {item.badge}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-sm font-semibold text-slate-900">{formatPrice(item.priceFrom * item.quantity)}</span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onQuantityChange(item.quantity - 1)}
              className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
            <button
              onClick={() => onQuantityChange(item.quantity + 1)}
              className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100"
            >
              <Plus className="h-3 w-3" />
            </button>
            <button
              onClick={onRemove}
              className="ml-1 flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// No-op references to keep these components considered "used" by ESLint/TS,
// при этом CartIcon остаётся заглушкой без изменения поведения.
void CartDrawerContent;
void CartItemCard;
