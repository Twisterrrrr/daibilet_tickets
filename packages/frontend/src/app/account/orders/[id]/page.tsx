'use client';

import type { AccountOrderDetail } from '@/lib/api';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { getStoredToken } from '@/lib/user-auth';
import { useUserAuth } from '@/hooks/useUserAuth';

const STATUS_LABEL: Record<string, string> = {
  STARTED: 'Создан',
  VALIDATED: 'Проверен',
  CONFIRMED: 'Подтверждён',
  AWAITING_PAYMENT: 'Ожидает оплаты',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
  EXPIRED: 'Истёк',
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

export default function AccountOrderDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { token } = useUserAuth();
  const [data, setData] = useState<AccountOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const t = token ?? getStoredToken();
    if (!t) return;
    api
      .accountOrderDetail(t, id)
      .then(setData)
      .catch(() => setError('Заказ не найден или доступ запрещён'))
      .finally(() => setLoading(false));
  }, [id, token]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-900">{error ?? 'Заказ не найден'}</p>
        <Link
          href="/account/orders"
          className="mt-4 inline-flex items-center gap-2 text-sm text-primary-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          К списку заказов
        </Link>
      </div>
    );
  }

  const statusLabel = STATUS_LABEL[data.status] ?? data.status;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/account/orders"
          className="rounded-lg p-2 hover:bg-slate-100"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Заказ {data.shortCode}</h1>
          <p className="text-sm text-slate-500">{formatDate(data.createdAt)}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          {statusLabel}
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {data.totalPrice != null && (
            <div>
              <p className="text-slate-500">Сумма</p>
              <p className="font-medium text-slate-900">{formatPrice(data.totalPrice)}</p>
            </div>
          )}
          {data.customerName && (
            <div>
              <p className="text-slate-500">Получатель</p>
              <p className="font-medium text-slate-900">{data.customerName}</p>
            </div>
          )}
          <div>
            <p className="text-slate-500">Создан</p>
            <p className="font-medium text-slate-900">{formatDate(data.createdAt)}</p>
          </div>
          {data.completedAt && (
            <div>
              <p className="text-slate-500">Завершён</p>
              <p className="font-medium text-slate-900">{formatDate(data.completedAt)}</p>
            </div>
          )}
        </div>
      </div>

      {data.items && data.items.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3">
            <h2 className="font-semibold text-slate-900">Состав заказа</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {data.items.map((item) => (
              <li key={item.id} className="flex gap-4 p-4">
                {item.event?.imageUrl && (
                  <div className="relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    <Image
                      src={item.event.imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="112px"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">
                    {item.offerTitle ?? item.event?.title ?? 'Позиция'}
                  </p>
                  <p className="text-sm text-slate-500">
                    Кол-во: {item.quantity}
                    {item.priceSnapshot != null && ` · ${formatPrice(item.priceSnapshot)}`}
                  </p>
                  {item.sessionStartsAt && (
                    <p className="text-sm text-slate-500">
                      Дата: {formatDate(item.sessionStartsAt)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.voucherUrl && (
        <div className="rounded-xl border border-primary-200 bg-primary-50 p-5">
          <p className="font-medium text-primary-900">Билеты / трекинг</p>
          <a
            href={data.voucherUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Открыть трекинг заказа
          </a>
        </div>
      )}
    </div>
  );
}
