'use client';

import type { AccountReviewItem } from '@/lib/api.types';
import { Loader2, MessageCircle, Star } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { getStoredToken } from '@/lib/user-auth';
import { useUserAuth } from '@/hooks/useUserAuth';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

function getStatusLabel(status: AccountReviewItem['status']) {
  if (status === 'APPROVED') return 'Опубликован';
  if (status === 'PENDING' || status === 'PENDING_EMAIL') return 'На модерации';
  if (status === 'REJECTED') return 'Отклонён';
  return 'Скрыт';
}

function ReviewCard({ item }: { item: AccountReviewItem }) {
  const router = useRouter();
  const created = formatDate(item.createdAt);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900">
            {item.eventTitle}
          </h2>
          {item.cityName && (
            <p className="mt-0.5 text-xs text-slate-500">{item.cityName}</p>
          )}
        </div>
        <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span>{item.rating.toFixed(1)}</span>
        </div>
      </header>

      <p className="mt-2 line-clamp-4 text-sm text-slate-700">{item.text}</p>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{created}</span>
        <div className="flex items-center gap-2">
          <span>{getStatusLabel(item.status)}</span>
          {item.hasDispute && (
            <button
              type="button"
              onClick={() => router.push(`/account/reviews/${item.id}/dispute`)}
              className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
            >
              Спор
              {item.unreadDisputeMessagesCount > 0 && (
                <span className="ml-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-semibold text-white">
                  +{item.unreadDisputeMessagesCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function AccountReviewsPage() {
  const { token } = useUserAuth();
  const [data, setData] = useState<{
    items: AccountReviewItem[];
    total: number;
    page: number;
    totalPages: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = token ?? getStoredToken();
    if (!t) return;
    setLoading(true);
    api
      .getAccountReviews(t, { page, limit: 10 })
      .then(setData)
      .catch(() => setError('Не удалось загрузить отзывы'))
      .finally(() => setLoading(false));
  }, [token, page]);

  if (loading && !data) {
    return (
      <div className="flex min-height-[40vh] items-center justify-center">
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

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2">
        <div className="rounded-lg bg-primary-50 p-2 text-primary-600">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Мои отзывы</h1>
          <p className="text-sm text-slate-600">
            Здесь собраны все ваши отзывы по событиям. Отображается статус
            модерации и наличие споров.
          </p>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <MessageCircle className="mx-auto h-14 w-14 text-slate-300" />
          <p className="mt-4 text-slate-600">У вас пока нет отзывов</p>
          <Link
            href="/events"
            className="mt-4 inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Смотреть события
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.id}>
                <ReviewCard item={item} />
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

