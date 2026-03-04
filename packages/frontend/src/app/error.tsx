'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.warn('Page error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <h2 className="mb-3 text-2xl font-bold text-slate-800">Что-то пошло не так</h2>
      <p className="mb-6 text-slate-500">Произошла ошибка при загрузке страницы.</p>
      <button
        onClick={reset}
        className="rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-primary-700"
      >
        Попробовать снова
      </button>
    </div>
  );
}
