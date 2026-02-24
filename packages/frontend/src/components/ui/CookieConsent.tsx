'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'daibilet-cookie-consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) setVisible(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white p-4 shadow-lg sm:left-4 sm:right-auto sm:bottom-4 sm:max-w-md sm:rounded-xl sm:border"
      role="dialog"
      aria-label="Согласие на использование cookie"
    >
      <p className="text-sm text-slate-700">
        Сайт использует cookie для работы, статистики и персонализации. Подробнее — в{' '}
        <Link href="/legal#cookies" className="text-primary-600 underline hover:text-primary-700">
          Правовой информации
        </Link>
        .
      </p>
      <button
        onClick={handleAccept}
        className="mt-3 w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 sm:w-auto"
      >
        Принять
      </button>
    </div>
  );
}
