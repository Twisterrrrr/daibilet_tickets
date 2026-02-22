'use client';

import { formatPrice } from '@daibilet/shared';
import { ArrowLeft, Loader2, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface PackageItem {
  id: string;
  type: string;
  qty: number;
  offer?: { event?: { title: string } };
}

interface PackageStatus {
  id: string;
  status: string;
  email: string;
  priceSnapshotJson?: { totalKopecks?: number; lineItems?: unknown[] };
  items: PackageItem[];
}

export default function CheckoutPackagePage() {
  const params = useParams();
  const packageId = params?.packageId as string;
  const [data, setData] = useState<PackageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!packageId) return;
    fetch(`${API_URL}/checkout/${packageId}/status`)
      .then((r) => {
        if (!r.ok) throw new Error('Пакет не найден');
        return r.json();
      })
      .then(setData)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [packageId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">Ошибка</h1>
        <p className="mt-2 text-slate-600">{error ?? 'Пакет не найден'}</p>
        <Link href="/events" className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Вернуться в каталог
        </Link>
      </div>
    );
  }

  const totalKopecks = data.priceSnapshotJson?.totalKopecks ?? 0;
  const isLocked = data.status === 'LOCKED' || data.status === 'CREATED';
  const isPaid = data.status === 'PAID';

  return (
    <div className="min-h-[60vh] pb-24">
      <div className="container-page py-6 max-w-lg mx-auto">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Link>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              isPaid ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'
            }`}
          >
            {isPaid ? '✓' : 1}
          </div>
          <span className="text-sm font-medium text-slate-700">Оформление</span>
          <div className="flex-1 h-px bg-slate-200" />
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              isPaid ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
            }`}
          >
            {isPaid ? '✓' : 2}
          </div>
          <span className="text-sm font-medium text-slate-700">Оплата</span>
        </div>

        {/* Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <h1 className="text-lg font-bold text-slate-900">
            {isPaid ? 'Оплачено' : isLocked ? 'Ожидание оплаты' : 'Заказ'}
          </h1>
          {data.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-slate-700">
                {item.offer?.event?.title ?? 'Событие'} × {item.qty}
              </span>
            </div>
          ))}
          <div className="border-t pt-3 flex justify-between font-semibold">
            <span>Итого:</span>
            <span>{formatPrice(totalKopecks)}</span>
          </div>
        </div>

        {/* CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 safe-area-pb max-w-lg mx-auto">
          {isPaid && (
            <Link
              href={`/checkout/${packageId}/status`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-white font-medium"
            >
              Перейти к заказу
            </Link>
          )}
          {isLocked && (
            <p className="text-center text-sm text-slate-500">
              Ссылка на оплату была отправлена на {data.email}. Проверьте почту или перейдите на страницу статуса.
            </p>
          )}
          {!isPaid && !isLocked && (
            <Link
              href="/help"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-6 py-3 font-medium"
            >
              Связаться с поддержкой
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
