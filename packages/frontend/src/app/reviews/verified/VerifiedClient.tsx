'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';

function VerifiedContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message') || 'Email подтверждён! Отзыв отправлен на модерацию.';

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <CheckCircle className="mx-auto h-16 w-16 text-emerald-500" />
      <h1 className="mt-6 text-2xl font-bold text-slate-900">Спасибо!</h1>
      <p className="mt-3 text-sm text-slate-600">{message}</p>
      <a
        href="/"
        className="mt-8 inline-block rounded-lg bg-primary-600 px-6 py-3 text-sm font-medium text-white hover:bg-primary-700 transition"
      >
        На главную
      </a>
    </div>
  );
}

export default function VerifiedClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      }
    >
      <VerifiedContent />
    </Suspense>
  );
}
