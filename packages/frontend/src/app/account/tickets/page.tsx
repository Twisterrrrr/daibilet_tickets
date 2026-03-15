'use client';

import type { AccountTicketItem } from '@/lib/api';
import { Loader2, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { getStoredToken } from '@/lib/user-auth';
import { useUserAuth } from '@/hooks/useUserAuth';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function AccountTicketsPage() {
  const { token } = useUserAuth();
  const [items, setItems] = useState<AccountTicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = token ?? getStoredToken();
    if (!t) return;
    api
      .accountTickets(t)
      .then(setItems)
      .catch(() => setError('Не удалось загрузить билеты'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-900">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Мои билеты</h1>

      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <Ticket className="mx-auto h-14 w-14 text-slate-300" />
          <p className="mt-4 text-slate-600">Нет активных билетов</p>
          <p className="mt-1 text-sm text-slate-500">
            Оплаченные заказы появятся здесь
          </p>
          <Link
            href="/events"
            className="mt-6 inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Смотреть каталог
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((ticket, i) => (
            <li
              key={`${ticket.orderId}-${ticket.eventSlug}-${i}`}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{ticket.eventTitle}</p>
                  <p className="text-sm text-slate-500">
                    Заказ {ticket.shortCode}
                    {ticket.sessionStartsAt && ` · ${formatDate(ticket.sessionStartsAt)}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={ticket.trackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
                  >
                    Открыть трекинг
                  </a>
                  {ticket.externalPaymentUrl && (
                    <a
                      href={ticket.externalPaymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Оплата
                    </a>
                  )}
                </div>
              </div>
              {ticket.eventSlug && (
                <Link
                  href={`/events/${ticket.eventSlug}`}
                  className="mt-3 inline-block text-sm text-primary-600 hover:underline"
                >
                  Страница события →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
