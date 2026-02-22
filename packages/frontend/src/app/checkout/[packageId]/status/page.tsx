'use client';

import { formatPrice } from '@daibilet/shared';
import { AlertCircle, ArrowLeft, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface PackageItem {
  id: string;
  type: string;
  qty: number;
  offer?: { event?: { title: string; slug?: string } };
}

interface PackageStatus {
  id: string;
  status: string;
  email: string;
  priceSnapshotJson?: { totalKopecks?: number };
  items: PackageItem[];
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; className: string }> = {
  PAID: { label: 'Оплачено', icon: CheckCircle, className: 'bg-emerald-100 text-emerald-800' },
  LOCKED: { label: 'Ожидание оплаты', icon: Loader2, className: 'bg-amber-100 text-amber-800' },
  CREATED: { label: 'Создан', icon: Loader2, className: 'bg-blue-100 text-blue-800' },
  PENDING: { label: 'В обработке', icon: Loader2, className: 'bg-amber-100 text-amber-800' },
  FAILED: { label: 'Ошибка оплаты', icon: AlertCircle, className: 'bg-red-100 text-red-800' },
  CANCELLED: { label: 'Отменён', icon: AlertCircle, className: 'bg-slate-100 text-slate-700' },
  EXPIRED: { label: 'Истёк', icon: AlertCircle, className: 'bg-slate-100 text-slate-700' },
};

export default function CheckoutStatusPage() {
  const params = useParams();
  const packageId = params?.packageId as string;
  const [data, setData] = useState<PackageStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = () => {
    if (!packageId) return;
    setLoading(true);
    fetch(`${API_URL}/checkout/${packageId}/status`)
      .then((r) => {
        if (!r.ok) throw new Error('Пакет не найден');
        return r.json();
      })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStatus();
    const t = setInterval(fetchStatus, 5000);
    return () => clearInterval(t);
  }, [packageId]);

  if (loading && !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">Пакет не найден</h1>
        <Link href="/events" className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Вернуться в каталог
        </Link>
      </div>
    );
  }

  const config = STATUS_CONFIG[data.status] ?? STATUS_CONFIG.CREATED;
  const totalKopecks = data.priceSnapshotJson?.totalKopecks ?? 0;

  return (
    <div className="container-page py-8 max-w-lg mx-auto">
      <Link
        href={`/checkout/${packageId}`}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900">Статус заказа</h1>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
            {config.icon === Loader2 ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <config.icon className="h-4 w-4" />
            )}
            {config.label}
          </span>
        </div>

        {data.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm py-1">
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

      <div className="mt-6 space-y-3">
        {data.status === 'PAID' && (
          <Link
            href="/orders/track"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-white font-medium"
          >
            Отследить заказ
          </Link>
        )}
        {(data.status === 'LOCKED' || data.status === 'CREATED') && (
          <button
            onClick={fetchStatus}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-6 py-3 font-medium"
          >
            <RefreshCw className="h-4 w-4" />
            Обновить статус
          </button>
        )}
        {(data.status === 'FAILED' || data.status === 'EXPIRED') && (
          <Link
            href="/help"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-6 py-3 font-medium"
          >
            Связаться с поддержкой
          </Link>
        )}
        <Link href="/events" className="flex w-full items-center justify-center text-sm text-slate-500 hover:text-slate-700">
          Вернуться в каталог
        </Link>
      </div>
    </div>
  );
}
