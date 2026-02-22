'use client';

import { CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SuccessContent() {
  const params = useSearchParams();
  const packageId = params.get('packageId') ?? params.get('package_id');

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle className="h-8 w-8 text-emerald-600" />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Оплата прошла успешно</h1>
      <p className="mt-2 text-slate-600 text-center">
        Спасибо за заказ! Подтверждение отправлено на вашу почту.
      </p>
      {packageId ? (
        <Link
          href={`/checkout/${packageId}/status`}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-white font-medium hover:bg-emerald-700"
        >
          Перейти к заказу
        </Link>
      ) : (
        <Link
          href="/orders/track"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-white font-medium hover:bg-emerald-700"
        >
          Отследить заказ
        </Link>
      )}
      <Link href="/events" className="mt-4 text-sm text-slate-500 hover:text-slate-700">
        Вернуться в каталог
      </Link>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center">Загрузка...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
