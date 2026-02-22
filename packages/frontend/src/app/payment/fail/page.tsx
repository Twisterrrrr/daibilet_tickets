'use client';

import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function FailContent() {
  const params = useSearchParams();
  const packageId = params.get('packageId') ?? params.get('package_id');

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <AlertCircle className="h-8 w-8 text-red-600" />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Ошибка оплаты</h1>
      <p className="mt-2 text-slate-600 text-center">
        Не удалось завершить платёж. Попробуйте ещё раз или свяжитесь с поддержкой.
      </p>
      {packageId ? (
        <Link
          href={`/checkout/${packageId}`}
          className="mt-6 inline-flex items-center justify-center rounded-xl border border-slate-200 px-6 py-3 font-medium hover:bg-slate-50"
        >
          Вернуться к заказу
        </Link>
      ) : (
        <Link
          href="/events"
          className="mt-6 inline-flex items-center justify-center rounded-xl border border-slate-200 px-6 py-3 font-medium hover:bg-slate-50"
        >
          Вернуться в каталог
        </Link>
      )}
      <Link href="/help" className="mt-4 text-sm text-slate-500 hover:text-slate-700">
        Связаться с поддержкой
      </Link>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center">Загрузка...</div>}>
      <FailContent />
    </Suspense>
  );
}
