'use client';

import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

/** T23: Редирект после YooKassa на /checkout/[packageId]?return=success|fail|cancel */
export function CheckoutResultClient() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams.get('session') || searchParams.get('sessionId');
    if (!sessionId) {
      window.location.href = '/events';
      return;
    }
    const returnStatus = searchParams.get('return') || searchParams.get('status') || 'success';
    const normalized = ['success', 'fail', 'cancel'].includes(returnStatus) ? returnStatus : 'success';
    window.location.replace(`/checkout/${sessionId}?return=${normalized}`);
  }, [searchParams]);

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20">
      <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
      <p className="mt-4 text-slate-600">Возвращаемся к заказу...</p>
    </div>
  );
}
