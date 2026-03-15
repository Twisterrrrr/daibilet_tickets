'use client';

import type { AccountPurchasesResponse, PurchaseListItem, PurchaseDisplayType } from '@/lib/api';
import { ExternalLink, Loader2, QrCode, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { getStoredToken } from '@/lib/user-auth';
import { useUserAuth } from '@/hooks/useUserAuth';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatEventDate(iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

const CARD_STYLE: Record<
  PurchaseDisplayType,
  { border: string; bg: string; badge: string; icon: 'ticket' | 'voucher' | 'clock' | 'payment' }
> = {
  INTERNAL_TICKET: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/50',
    badge: 'bg-emerald-100 text-emerald-800',
    icon: 'ticket',
  },
  EXTERNAL_VOUCHER: {
    border: 'border-amber-200',
    bg: 'bg-amber-50/50',
    badge: 'bg-amber-100 text-amber-800',
    icon: 'voucher',
  },
  BOOKING_CONFIRMATION: {
    border: 'border-blue-200',
    bg: 'bg-blue-50/50',
    badge: 'bg-blue-100 text-blue-800',
    icon: 'ticket',
  },
  AWAITING_PAYMENT: {
    border: 'border-orange-200',
    bg: 'bg-orange-50/50',
    badge: 'bg-orange-100 text-orange-800',
    icon: 'payment',
  },
  MANUAL_CONFIRMATION: {
    border: 'border-slate-200',
    bg: 'bg-slate-50/50',
    badge: 'bg-slate-100 text-slate-700',
    icon: 'clock',
  },
};

function PurchaseCard({ item }: { item: PurchaseListItem }) {
  const style = CARD_STYLE[item.purchaseType];
  const eventDateStr = formatEventDate(item.eventDate);

  return (
    <div
      className={`rounded-xl border-2 ${style.border} ${style.bg} p-5 transition-shadow hover:shadow-md`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{item.eventTitle}</p>
          <p className="mt-0.5 text-sm text-slate-500">
            Покупка: {formatDate(item.purchaseDate)}
            {eventDateStr && (
              <span className="ml-2 text-slate-600"> • Событие: {eventDateStr}</span>
            )}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-700">{item.shortCode}</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${style.badge}`}>
          {item.displayStatus}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {item.primaryAction && (
          item.primaryAction.url.startsWith('http') ? (
            <a
              href={item.primaryAction.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {item.primaryAction.label}
            </a>
          ) : (
            <Link
              href={item.primaryAction.url}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
            >
              {item.purchaseType === 'INTERNAL_TICKET' ? (
                <QrCode className="h-3.5 w-3.5" />
              ) : (
                <Ticket className="h-3.5 w-3.5" />
              )}
              {item.primaryAction.label}
            </Link>
          )
        )}
        {item.secondaryAction && (
          item.secondaryAction.url.startsWith('http') ? (
            <a
              href={item.secondaryAction.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {item.secondaryAction.label}
            </a>
          ) : (
            <Link
              href={item.secondaryAction.url}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {item.secondaryAction.label}
            </Link>
          )
        )}
        {!item.primaryAction && !item.secondaryAction && (
          <Link
            href={`/account/orders/${item.purchaseId}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Подробнее
          </Link>
        )}
        <Link
          href={`/account/orders/${item.purchaseId}`}
          className="ml-auto text-sm text-slate-500 underline hover:text-slate-700"
        >
          Детали заказа
        </Link>
      </div>
    </div>
  );
}

export default function AccountPurchasesPage() {
  const { token } = useUserAuth();
  const [res, setRes] = useState<AccountPurchasesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = token ?? getStoredToken();
    if (!t) return;
    setLoading(true);
    api
      .accountPurchases(t, { page, limit: 10 })
      .then(setRes)
      .catch(() => setError('Не удалось загрузить покупки'))
      .finally(() => setLoading(false));
  }, [token, page]);

  if (loading && !res) {
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

  const items = res?.items ?? [];
  const total = res?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Мои покупки</h1>
      <p className="text-slate-600">
        Все ваши заказы и бронирования: билеты нашей платформы и покупки через партнёров.
      </p>

      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <Ticket className="mx-auto h-14 w-14 text-slate-300" />
          <p className="mt-4 text-slate-600">У вас пока нет покупок</p>
          <Link
            href="/events"
            className="mt-4 inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Смотреть каталог
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.purchaseId}>
                <PurchaseCard item={item} />
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Назад
              </button>
              <span className="flex items-center px-3 py-1.5 text-sm text-slate-600">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Вперёд
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
