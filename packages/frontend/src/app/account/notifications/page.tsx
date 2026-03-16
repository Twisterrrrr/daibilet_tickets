'use client';

import { Bell, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { getStoredToken } from '@/lib/user-auth';
import { useUserAuth } from '@/hooks/useUserAuth';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  meta: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationsResponse = {
  items: NotificationItem[];
  total: number;
  page: number;
  totalPages: number;
};

const TYPE_FILTERS: { label: string; value: string | null }[] = [
  { label: 'Все', value: null },
  { label: 'Споры по отзывам', value: 'REVIEW_DISPUTE_MESSAGE' },
  { label: 'Поддержка', value: 'SUPPORT_REPLY' },
  { label: 'Заказы и билеты', value: 'ORDER_STATUS_CHANGED' },
];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AccountNotificationsPage() {
  const { token } = useUserAuth();
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [type, setType] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    const t = token ?? getStoredToken();
    if (!t) return;
    setLoading(true);
    api
      .getAccountNotifications(t, { type: type ?? undefined, page, limit: 20 })
      .then(setData)
      .catch(() => setError('Не удалось загрузить уведомления'))
      .finally(() => setLoading(false));
  }, [token, page, type]);

  const handleMarkAllRead = async () => {
    const t = token ?? getStoredToken();
    if (!t) return;
    setMarkingAll(true);
    try {
      await api.markAllNotificationsRead(t);
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((n) => ({ ...n, isRead: true })),
            }
          : prev,
      );
    } catch {
      // swallow, можно добавить toast
    } finally {
      setMarkingAll(false);
    }
  };

  if (loading && !data) {
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

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-50 p-2 text-primary-600">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Уведомления</h1>
            <p className="text-sm text-slate-600">
              Все важные события по вашему аккаунту: споры по отзывам, поддержка, заказы.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleMarkAllRead}
          disabled={markingAll || items.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {markingAll && <Loader2 className="h-4 w-4 animate-spin" />}
          Отметить всё прочитанным
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => {
          const active = type === f.value;
          return (
            <button
              key={f.label}
              type="button"
              onClick={() => {
                setPage(1);
                setType(f.value);
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                active
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <Bell className="mx-auto h-14 w-14 text-slate-300" />
          <p className="mt-4 text-slate-600">Уведомлений пока нет</p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((n) => (
              <li key={n.id}>
                <div
                  className={`flex items-start gap-3 rounded-lg px-3 py-2 ${
                    n.isRead ? 'bg-white' : 'bg-slate-50'
                  }`}
                >
                  <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary-500 opacity-80" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-sm ${
                          n.isRead ? 'font-normal text-slate-800' : 'font-semibold text-slate-900'
                        }`}
                      >
                        {n.title}
                      </p>
                      <span className="whitespace-nowrap text-xs text-slate-500">
                        {formatDateTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{n.body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
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

