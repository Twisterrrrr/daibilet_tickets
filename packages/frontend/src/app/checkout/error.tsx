'use client';

import { useEffect } from 'react';

export default function CheckoutError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.warn('Checkout error:', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
      <h3 className="mb-2 text-lg font-bold text-red-800">Ошибка оформления заказа</h3>
      <p className="mb-4 text-sm text-red-600">Платёж временно недоступен. Попробуйте ещё раз.</p>
      <button
        onClick={reset}
        className="rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700"
      >
        Попробовать снова
      </button>
    </div>
  );
}
