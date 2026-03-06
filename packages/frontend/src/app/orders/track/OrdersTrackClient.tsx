'use client';

import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle,
  ChevronRight,
  Clock,
  HelpCircle,
  Info,
  Loader2,
  MapPin,
  Package,
  Phone,
  Search,
  XCircle,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// ─── Types ────────────────────────────────────

interface TrackingItem {
  id: string;
  status: string;
  quantity: number;
  priceSnapshot: number;
  confirmedAt: string | null;
  event: {
    title: string;
    slug: string;
    imageUrl: string | null;
  } | null;
  offerTitle: string | null;
  meetingPoint?: string | null;
  meetingInstructions?: string | null;
  operationalPhone?: string | null;
  operationalNote?: string | null;
}

interface TrackingResult {
  shortCode: string;
  status: string;
  totalPrice: number | null;
  customerName: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  items: TrackingItem[];
}

// ─── Status Helpers ───────────────────────────

const SESSION_STATUS: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  STARTED: { label: 'Создан', color: 'text-blue-600 bg-blue-50', icon: Clock },
  VALIDATED: { label: 'Проверен', color: 'text-blue-600 bg-blue-50', icon: Clock },
  REDIRECTED: { label: 'Перенаправлен', color: 'text-amber-600 bg-amber-50', icon: ChevronRight },
  PENDING_CONFIRMATION: { label: 'Ожидает подтверждения', color: 'text-amber-600 bg-amber-50', icon: Clock },
  CONFIRMED: { label: 'Подтверждён', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  AWAITING_PAYMENT: { label: 'Ожидает оплаты', color: 'text-amber-600 bg-amber-50', icon: Clock },
  COMPLETED: { label: 'Завершён', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  EXPIRED: { label: 'Истёк', color: 'text-red-600 bg-red-50', icon: AlertTriangle },
  CANCELLED: { label: 'Отменён', color: 'text-red-600 bg-red-50', icon: XCircle },
};

const REQUEST_STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Ожидает', color: 'text-amber-600 bg-amber-50' },
  CONFIRMED: { label: 'Подтверждён', color: 'text-green-600 bg-green-50' },
  REJECTED: { label: 'Отклонён', color: 'text-red-600 bg-red-50' },
  EXPIRED: { label: 'Истёк', color: 'text-red-600 bg-red-50' },
};

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

function formatPrice(kopecks: number) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(
    kopecks / 100,
  );
}

// ─── Timeline ─────────────────────────────────

const TIMELINE_STEPS = [
  { status: 'STARTED', label: 'Создан' },
  { status: 'VALIDATED', label: 'Проверен' },
  { status: 'PENDING_CONFIRMATION', label: 'Ожидание' },
  { status: 'CONFIRMED', label: 'Подтверждён' },
  { status: 'COMPLETED', label: 'Завершён' },
];

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

function Timeline({ status }: { status: string }) {
  const currentIndex = STATUS_ORDER[status] ?? 0;
  const isTerminalBad = status === 'EXPIRED' || status === 'CANCELLED';

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-4">
      {TIMELINE_STEPS.map((step, i) => {
        const isActive = currentIndex >= i && !isTerminalBad;
        const isCurrent = currentIndex === i && !isTerminalBad;
        return (
          <div key={step.status} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                  ${
                    isActive
                      ? isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-green-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }
                `}
              >
                {isActive && !isCurrent ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`mt-1 text-[10px] ${isActive ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <div
                className={`w-8 sm:w-12 h-0.5 mx-1 mt-[-12px] ${currentIndex > i && !isTerminalBad ? 'bg-green-400' : 'bg-slate-200'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Component ────────────────────────────────

export function OrdersTrackClient() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackingResult | null>(null);

  async function handleSearch(searchCode: string) {
    const trimmed = searchCode.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/checkout/track/${encodeURIComponent(trimmed)}`);
      if (res.status === 404) {
        setError('Заказ с таким кодом не найден. Проверьте код и попробуйте снова.');
        return;
      }
      if (!res.ok) throw new Error('Ошибка сервера');
      const data = await res.json();
      setResult(data);
    } catch {
      setError('Не удалось загрузить данные. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }

  // Auto-search on load if code in URL
  useEffect(() => {
    if (initialCode) handleSearch(initialCode);
  }, []);

  const statusInfo = result ? SESSION_STATUS[result.status] || SESSION_STATUS.STARTED : null;

  return (
    <div className="min-h-[60vh]">
      {/* Header */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-10 md:py-14">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium mb-3">
            <Package className="h-3.5 w-3.5" />
            Отслеживание заказа
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Статус вашего заказа</h1>
          <p className="mt-2 text-sm text-slate-600">Введите код заказа из email-подтверждения (формат CS-XXXX)</p>

          {/* Search */}
          <form
            className="mt-6 flex gap-2 max-w-md mx-auto"
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(code);
            }}
          >
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="CS-XXXX"
              className="flex-1 px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Найти
            </button>
          </form>
        </div>
      </section>

      {/* Result */}
      <section className="max-w-2xl mx-auto px-4 pb-16">
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Заказ не найден</p>
              <p className="mt-1 text-red-600">{error}</p>
              <Link
                href="/help"
                className="mt-2 inline-flex items-center gap-1 text-red-700 hover:underline font-medium"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                Перейти в Помощь
              </Link>
            </div>
          </div>
        )}

        {result && statusInfo && (
          <div className="mt-6 space-y-4">
            {/* Status card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Заказ</p>
                  <p className="text-lg font-bold text-slate-900">{result.shortCode}</p>
                </div>
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${statusInfo.color}`}
                >
                  <statusInfo.icon className="h-4 w-4" />
                  {statusInfo.label}
                </div>
              </div>

              {/* Timeline */}
              <Timeline status={result.status} />

              {/* Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Создан</p>
                  <p className="font-medium text-slate-900">{formatDate(result.createdAt)}</p>
                </div>
                {result.totalPrice != null && (
                  <div>
                    <p className="text-slate-500 text-xs">Сумма</p>
                    <p className="font-medium text-slate-900">{formatPrice(result.totalPrice)}</p>
                  </div>
                )}
                {result.customerName && (
                  <div>
                    <p className="text-slate-500 text-xs">Клиент</p>
                    <p className="font-medium text-slate-900">{result.customerName}</p>
                  </div>
                )}
                {result.completedAt && (
                  <div>
                    <p className="text-slate-500 text-xs">Завершён</p>
                    <p className="font-medium text-slate-900">{formatDate(result.completedAt)}</p>
                  </div>
                )}
                {result.expiresAt && result.status !== 'COMPLETED' && result.status !== 'CANCELLED' && (
                  <div>
                    <p className="text-slate-500 text-xs">Действует до</p>
                    <p className="font-medium text-slate-900">{formatDate(result.expiresAt)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            {result.items.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                  <h3 className="font-semibold text-sm text-slate-900">Состав заказа</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {result.items.map((item) => {
                    const reqStatus = REQUEST_STATUS[item.status] || REQUEST_STATUS.PENDING;
                    return (
                      <div key={item.id}>
                        <div className="p-4 flex items-center gap-4">
                          {/* Image */}
                            {item.event?.imageUrl ? (
                              <Image
                                src={item.event.imageUrl}
                                alt={item.event.title}
                                width={56}
                                height={56}
                                className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                              />
                            ) : (
                            <div className="w-14 h-14 bg-slate-100 rounded-lg flex-shrink-0 flex items-center justify-center">
                              <CalendarCheck className="h-6 w-6 text-slate-400" />
                            </div>
                          )}

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-slate-900 truncate">
                              {item.event?.title || item.offerTitle || 'Событие'}
                            </p>
                            {item.offerTitle && item.event?.title && (
                              <p className="text-xs text-slate-500 truncate">{item.offerTitle}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-500">× {item.quantity}</span>
                              <span className="text-xs font-medium text-slate-700">
                                {formatPrice(item.priceSnapshot * item.quantity)}
                              </span>
                            </div>
                          </div>

                          {/* Status badge */}
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${reqStatus.color}`}
                          >
                            {reqStatus.label}
                          </span>
                        </div>

                        {/* Operational info — only when confirmed */}
                        {(item.meetingPoint ||
                          item.meetingInstructions ||
                          item.operationalPhone ||
                          item.operationalNote) && (
                          <div className="mx-4 mb-3 p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-1.5">
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
                              <p className="text-xs text-blue-700 flex items-center gap-1">
                                <Info className="h-3 w-3 flex-shrink-0" />
                                {item.operationalNote}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Help link */}
            <div className="text-center pt-2">
              <Link
                href="/help"
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition-colors"
              >
                <HelpCircle className="h-4 w-4" />
                Есть вопросы? Перейти в Помощь
              </Link>
            </div>
          </div>
        )}

        {!result && !error && !loading && (
          <div className="mt-12 text-center text-slate-400">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Введите код заказа для отслеживания</p>
          </div>
        )}
      </section>
    </div>
  );
}
