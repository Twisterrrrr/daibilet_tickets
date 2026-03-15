'use client';

import type { AccountOrderListItem, AccountOrdersResponse } from '@/lib/api';
import { Loader2, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { getStoredToken } from '@/lib/user-auth';
import { useUserAuth } from '@/hooks/useUserAuth';

const STATUS_LABEL: Record<string, string> = {
  STARTED: 'Создан',
  VALIDATED: 'Проверен',
  REDIRECTED: 'Перенаправлен',
  PENDING_CONFIRMATION: 'Ожидает подтверждения',
  CONFIRMED: 'Подтверждён',
  AWAITING_PAYMENT: 'Ожидает оплаты',
  COMPLETED: 'Завершён',
  EXPIRED: 'Истёк',
  CANCELLED: 'Отменён',
};

const PAYMENT_LABEL: Record<string, string> = {
  PENDING: 'Ожидает',
  PROCESSING: 'В обработке',
  PAID: 'Оплачен',
  FAILED: 'Ошибка',
  CANCELLED: 'Отменён',
  REFUNDED: 'Возврат',
};

function formatPrice(kopecks: number | null) {
  if (kopecks == null) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(kopecks / 100);
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function AccountOrdersPage() {
  const { token } = useUserAuth();
  const [res, setRes] = useState<AccountOrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = token ?? getStoredToken();
    if (!t) return;
    setLoading(true);
    api
      .accountOrders(t, { page, limit: 10 })
      .then(setRes)
      .catch(() => setError('Не удалось загрузить заказы'))
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
      <h1 className="text-2xl font-bold text-slate-900">Мои заказы</h1>

      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <Ticket className="mx-auto h-14 w-14 text-slate-300" />
          <p className="mt-4 text-slate-600">У вас пока нет заказов</p>
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
            {items.map((order: AccountOrderListItem) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">Заказ {order.shortCode}</p>
                      <p className="text-sm text-slate-500">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {PAYMENT_LABEL[order.paymentStatus] ?? order.paymentStatus}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                    <span>{formatPrice(order.totalAmount)}</span>
                    <span>
                      {order.itemsPreview.length} поз.
                    </span>
                    {order.trackUrl && (
                      <span className="text-primary-600">Трекинг</span>
                    )}
                  </div>
                </Link>
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
