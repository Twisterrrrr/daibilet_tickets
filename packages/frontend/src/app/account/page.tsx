'use client';

import type { AccountSummary } from '@/lib/api';
import { Heart, Loader2, Ticket, User } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { getStoredToken } from '@/lib/user-auth';
import { useUserAuth } from '@/hooks/useUserAuth';

export default function AccountDashboardPage() {
  const { token } = useUserAuth();
  const [data, setData] = useState<AccountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = token ?? getStoredToken();
    if (!t) {
      setLoading(false);
      return;
    }
    api
      .accountMe(t)
      .then(setData)
      .catch(() => setError('Не удалось загрузить данные'))
      .finally(() => setLoading(false));
  }, [token]);

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
        <p className="font-medium text-red-900">{error ?? 'Нет данных'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Личный кабинет</h1>
        <p className="mt-1 text-slate-600">
          Здравствуйте, {data.user.name || data.user.email}!
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/account/purchases"
          className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100">
            <Ticket className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{data.ordersCount}</p>
            <p className="text-sm text-slate-500">Покупок</p>
          </div>
        </Link>
        <Link
          href="/account/tickets"
          className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
            <Ticket className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{data.activeTicketsCount}</p>
            <p className="text-sm text-slate-500">Активных билетов</p>
          </div>
        </Link>
        <Link
          href="/account/favorites"
          className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100">
            <Heart className="h-6 w-6 text-rose-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{data.favoritesCount}</p>
            <p className="text-sm text-slate-500">В избранном</p>
          </div>
        </Link>
      </div>

      <div className="flex flex-wrap gap-4">
        <Link
          href="/account/purchases"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Мои покупки
        </Link>
        <Link
          href="/account/profile"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <User className="h-4 w-4" />
          Профиль
        </Link>
      </div>
    </div>
  );
}
