'use client';

import {
  AlertTriangle,
  ArrowLeft,
  CalendarCheck,
  CheckCircle,
  ChevronRight,
  Clock,
  ExternalLink,
  HelpCircle,
  Loader2,
  MapPin,
  Package,
  Phone,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

const SESSION_STATUS: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  STARTED: { label: 'Создан', color: 'text-blue-600 bg-blue-50', icon: Clock },
  VALIDATED: { label: 'Проверен', color: 'text-blue-600 bg-blue-50', icon: Clock },
  REDIRECTED: { label: 'Перенаправлен', color: 'text-amber-600 bg-amber-50', icon: ChevronRight },
  PENDING_CONFIRMATION: { label: 'Ожидает подтверждения', color: 'text-amber-600 bg-amber-50', icon: Clock },
  CONFIRMED: { label: 'Подтверждён', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  AWAITING_PAYMENT: { label: 'Ожидает оплаты', color: 'text-amber-600 bg-amber-50', icon: Clock },
  COMPLETED: { label: 'Завершён', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  CANCELLED: { label: 'Отменён', color: 'text-red-600 bg-red-50', icon: XCircle },
  EXPIRED: { label: 'Истёк', color: 'text-red-600 bg-red-50', icon: AlertTriangle },
};

const STATUS_ORDER: Record<string, number> = {
  STARTED: 0,
  VALIDATED: 1,
  REDIRECTED: 2,
  PENDING_CONFIRMATION: 2,
  CONFIRMED: 3,
  AWAITING_PAYMENT: 3,
  COMPLETED: 4,
  EXPIRED: -1,
  CANCELLED: -1,
};

function OrderTimeline({ status }: { status: string }) {
  const currentIndex = STATUS_ORDER[status] ?? 0;
  const isTerminalBad = status === 'EXPIRED' || status === 'CANCELLED';
  const steps = [
    { status: 'STARTED', label: 'Создан' },
    { status: 'VALIDATED', label: 'Проверен' },
    { status: 'PENDING_CONFIRMATION', label: 'Подтверждение' },
    { status: 'CONFIRMED', label: 'Подтверждён' },
    { status: 'COMPLETED', label: 'Завершён' },
  ];

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-4">
      {steps.map((step, i) => {
        const isActive = currentIndex >= i && !isTerminalBad;
        const isCurrent = currentIndex === i && !isTerminalBad;
        return (
          <div key={step.status} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  isActive
                    ? isCurrent
                      ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                      : 'bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {isActive && !isCurrent ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`mt-1 text-[10px] ${isActive ? 'text-slate-900 font-medium' : 'text-slate-400'}`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-8 sm:w-12 h-0.5 mx-1 mt-[-12px] ${
                  currentIndex > i && !isTerminalBad ? 'bg-emerald-400' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr));
}

function formatPrice(kopecks: number) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(kopecks / 100);
}

interface OrderItem {
  id: string;
  status?: string;
  quantity: number;
  priceSnapshot?: number;
  event?: { title?: string; slug?: string; imageUrl?: string | null };
  offerTitle?: string;
  meetingPoint?: string | null;
  meetingInstructions?: string | null;
  operationalPhone?: string | null;
  operationalNote?: string | null;
}

interface OrderData {
  shortCode: string;
  status: string;
  totalPrice?: number | null;
  customerName?: string | null;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string | null;
  expiresAt?: string | null;
  voucherUrl?: string | null;
  items?: OrderItem[];
}

/** PR-5 (C3): Страница трекинга заказа по id (UUID или shortCode) — статус, состав, сумма, таймлайн, ваучер */
export default function OrderPage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`${API_URL}/orders/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Не найден'))))
      .then(setData)
      .catch(() => setError('Заказ не найден'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container-page py-12">
        <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="font-medium text-red-900">{error || 'Заказ не найден'}</p>
          <Link href="/orders/track" className="mt-4 inline-flex items-center gap-2 text-sm text-red-800 hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Отследить по коду
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = SESSION_STATUS[data.status] || SESSION_STATUS.STARTED;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="container-page py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/events" className="rounded-lg p-2 hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Заказ {data.shortCode}</h1>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {statusInfo.label}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <OrderTimeline status={data.status} />
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-sm">
            {data.totalPrice != null && (
              <div>
                <p className="text-slate-500">Сумма</p>
                <p className="font-medium text-slate-900">{formatPrice(data.totalPrice)}</p>
              </div>
            )}
            {data.customerName && (
              <div>
                <p className="text-slate-500">Клиент</p>
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
          <div className="mt-6 rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-sm text-slate-900">Состав заказа</h3>
            </div>
            <ul className="divide-y divide-slate-100">
              {data.items.map((item) => (
                <li key={item.id} className="p-4">
                  <div className="flex gap-4">
                    {item.event?.imageUrl ? (
                      <img
                        src={item.event.imageUrl}
                        alt=""
                        className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <CalendarCheck className="h-6 w-6 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/events/${item.event?.slug || '#'}`}
                        className="font-medium text-sm text-slate-900 hover:text-primary-600 line-clamp-1"
                      >
                        {item.event?.title || item.offerTitle || 'Событие'}
                      </Link>
                      <p className="text-xs text-slate-500">
                        × {item.quantity} — {formatPrice((item.priceSnapshot ?? 0) * item.quantity)}
                      </p>
                    </div>
                  </div>
                  {(item.meetingPoint ||
                    item.meetingInstructions ||
                    item.operationalPhone ||
                    item.operationalNote) && (
                    <div className="mt-3 ml-0 sm:ml-18 p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-1.5">
                      <p className="text-xs font-semibold text-blue-800 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Как добраться
                      </p>
                      {item.meetingPoint && (
                        <p className="text-xs text-blue-700">
                          <span className="font-medium">Место встречи:</span> {item.meetingPoint}
                        </p>
                      )}
                      {item.meetingInstructions && (
                        <p className="text-xs text-blue-700">
                          <span className="font-medium">Инструкция:</span> {item.meetingInstructions}
                        </p>
                      )}
                      {item.operationalPhone && (
                        <p className="text-xs text-blue-700 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <a href={`tel:${item.operationalPhone}`} className="underline">
                            {item.operationalPhone}
                          </a>
                        </p>
                      )}
                      {item.operationalNote && (
                        <p className="text-xs text-blue-700">{item.operationalNote}</p>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.voucherUrl && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
              <h3 className="font-semibold text-emerald-900">Ваучер готов</h3>
            </div>
            <a
              href={data.voucherUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <ExternalLink className="h-4 w-4" />
              Открыть ваучер
            </a>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/help" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600">
            <HelpCircle className="h-4 w-4" />
            Есть вопросы?
          </Link>
        </div>
      </div>
    </div>
  );
}
