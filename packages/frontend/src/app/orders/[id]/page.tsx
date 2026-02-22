'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * /orders/[id] — редирект на трекинг заказа.
 * id может быть shortCode (CS-XXXX) или UUID.
 * Трекинг работает по shortCode: /orders/track?code=CS-XXXX
 */
export default function OrderByIdPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  useEffect(() => {
    if (!id) return;
    router.replace(`/orders/track?code=${encodeURIComponent(id)}`);
  }, [id, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <p className="text-slate-500">Перенаправление...</p>
    </div>
  );
}
