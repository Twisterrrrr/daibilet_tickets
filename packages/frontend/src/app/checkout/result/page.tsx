import { Suspense } from 'react';

import { CheckoutResultClient } from './CheckoutResultClient';

export default function CheckoutResultPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20">
          <div className="h-12 w-12 animate-pulse rounded-full bg-slate-200" />
          <p className="mt-4 text-slate-600">Возвращаемся к заказу...</p>
        </div>
      }
    >
      <CheckoutResultClient />
    </Suspense>
  );
}
