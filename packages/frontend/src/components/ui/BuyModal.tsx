'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Calendar,
  Ticket,
  ExternalLink,
  Shield,
  Minus,
  Plus,
  ChevronDown,
  MapPin,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { formatPrice } from '@daibilet/shared';

// ========================
// Типы
// ========================

interface PriceItem {
  name: string;
  price: number;
  setId: string;
  amount: number;
  amountVacant: number;
}

interface Session {
  id: string;
  startsAt: string;
  endsAt?: string;
  availableTickets: number;
  isActive: boolean;
  prices: PriceItem[];
}

type EventSource = 'TC' | 'TEPLOHOD';

type CheckoutState = 'select' | 'loading' | 'success' | 'error';

interface BuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  eventImage: string | null;
  tcEventId: string;
  source: EventSource;
  sessions: Session[];
  address?: string | null;
  venueName?: string | null;
  priceFrom: number | null;
}

// ========================
// Хелперы
// ========================

function formatSessionDate(dateStr: string) {
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
    time: d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    weekday: d.toLocaleDateString('ru-RU', { weekday: 'short' }),
    full: d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      weekday: 'long',
    }),
  };
}

function getSourceLabel(source: EventSource): string {
  return source === 'TEPLOHOD' ? 'teplohod.info' : 'Дайбилет';
}

function getTepBuyUrl(tcEventId: string): string {
  const tepId = tcEventId.replace('tep-', '');
  return `https://teplohod.info/event/${tepId}`;
}

// ========================
// Компоненты
// ========================

export function BuyModal({
  isOpen,
  onClose,
  eventTitle,
  eventImage,
  tcEventId,
  source = 'TC',
  sessions,
  address,
  venueName,
  priceFrom,
}: BuyModalProps) {
  // Фильтруем только активные будущие сеансы
  const activeSessions = sessions.filter((s) => {
    const d = new Date(s.startsAt);
    return s.isActive && d > new Date() && s.availableTickets > 0;
  });

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    activeSessions[0]?.id || null,
  );
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [sessionDropdownOpen, setSessionDropdownOpen] = useState(false);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>('select');
  const [orderResult, setOrderResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  const selectedSession = activeSessions.find((s) => s.id === selectedSessionId);

  // Закрытие по Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Сброс при открытии/закрытии
  useEffect(() => {
    if (isOpen) {
      setCheckoutState('select');
      setOrderResult(null);
      setErrorMessage('');
      setQuantities({});
    }
  }, [isOpen]);

  // Сброс при смене сеанса
  useEffect(() => {
    setQuantities({});
  }, [selectedSessionId]);

  const updateQty = useCallback((setId: string, delta: number, max: number) => {
    setQuantities((prev) => {
      const current = prev[setId] || 0;
      const next = Math.max(0, Math.min(current + delta, max));
      return { ...prev, [setId]: next };
    });
  }, []);

  // Итого
  const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0);
  const totalPrice = selectedSession
    ? selectedSession.prices.reduce((sum, p) => sum + (quantities[p.setId] || 0) * p.price, 0)
    : 0;

  // Создание заказа в TC
  const handleCheckout = async () => {
    if (source === 'TEPLOHOD') {
      // Для teplohod.info — открыть сайт (пока нет API заказов)
      window.open(getTepBuyUrl(tcEventId), '_blank');
      return;
    }

    // TC: создать заказ через наш API
    const items = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([setId, quantity]) => ({ setId, quantity }));

    if (items.length === 0) return;

    setCheckoutState('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/v1/checkout/tc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: tcEventId,
          items,
          customerEmail: customerEmail || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Не удалось создать заказ');
      }

      setOrderResult(data);
      setCheckoutState('success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Произошла ошибка при создании заказа');
      setCheckoutState('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="relative flex-shrink-0">
          {eventImage && (
            <div className="h-32 overflow-hidden sm:h-40">
              <img
                src={eventImage}
                alt={eventTitle}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50"
          >
            <X className="h-4 w-4" />
          </button>

          <div className={`px-5 ${eventImage ? 'absolute bottom-0 left-0 right-0 pb-4' : 'pt-5'}`}>
            <h2 className={`text-lg font-bold line-clamp-2 ${eventImage ? 'text-white' : 'text-slate-900'}`}>
              {eventTitle}
            </h2>
            {(address || venueName) && (
              <p className={`mt-1 flex items-center gap-1 text-xs ${eventImage ? 'text-white/80' : 'text-slate-500'}`}>
                <MapPin className="h-3 w-3 flex-shrink-0" />
                {venueName}{venueName && address ? ' · ' : ''}{address}
              </p>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* ===== Экран успеха ===== */}
          {checkoutState === 'success' && orderResult && (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                {orderResult.confirmed ? 'Заказ оформлен!' : 'Билеты зарезервированы!'}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Заказ #{orderResult.order.number}
              </p>

              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-left">
                <p className="text-sm font-medium text-slate-700">
                  {orderResult.event.title}
                </p>
                <div className="mt-2 space-y-1">
                  {orderResult.order.tickets.map((t: any) => (
                    <div key={t.id} className="flex justify-between text-sm">
                      <span className="text-slate-500">Билет #{t.number}</span>
                      <span className="font-medium text-slate-700">
                        {formatPrice(t.price)}
                      </span>
                    </div>
                  ))}
                  <div className="mt-2 border-t border-slate-200 pt-2 flex justify-between">
                    <span className="text-sm font-semibold text-slate-700">Итого</span>
                    <span className="text-sm font-bold text-slate-900">
                      {orderResult.order.totalPriceFormatted}
                    </span>
                  </div>
                </div>
              </div>

              {orderResult.confirmed ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-emerald-800">
                        Билеты отправлены на почту
                      </p>
                      <p className="mt-1 text-xs text-emerald-600">
                        Проверьте вашу почту — билеты придут в течение нескольких минут.
                        Если не нашли, проверьте папку «Спам».
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-amber-800">
                        Билеты зарезервированы на 15 минут
                      </p>
                      <p className="mt-1 text-xs text-amber-600">
                        Для завершения покупки свяжитесь с нами.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                className="mt-4 w-full rounded-xl bg-slate-100 px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
              >
                Закрыть
              </button>
            </div>
          )}

          {/* ===== Экран ошибки ===== */}
          {checkoutState === 'error' && (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                Не удалось создать заказ
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {errorMessage}
              </p>
              <button
                onClick={() => setCheckoutState('select')}
                className="mt-4 w-full rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
              >
                Попробовать снова
              </button>
            </div>
          )}

          {/* ===== Загрузка ===== */}
          {checkoutState === 'loading' && (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
              <p className="mt-4 text-sm font-medium text-slate-600">
                Резервируем билеты...
              </p>
            </div>
          )}

          {/* ===== Выбор билетов ===== */}
          {checkoutState === 'select' && (
            <>
              {activeSessions.length === 0 ? (
                <div className="py-8 text-center">
                  <Calendar className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-600">Нет доступных сеансов</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Следите за обновлениями — новые даты появятся скоро
                  </p>
                </div>
              ) : (
                <>
                  {/* Session selector */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Дата и время
                    </label>

                    {activeSessions.length === 1 ? (
                      <div className="mt-2 flex items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-sm font-bold text-primary-700">
                          {formatSessionDate(activeSessions[0].startsAt).weekday}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {formatSessionDate(activeSessions[0].startsAt).full}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatSessionDate(activeSessions[0].startsAt).time}
                            {activeSessions[0].availableTickets > 0 && (
                              <> · <span className="text-emerald-600">{activeSessions[0].availableTickets} мест</span></>
                            )}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative mt-2">
                        <button
                          onClick={() => setSessionDropdownOpen(!sessionDropdownOpen)}
                          className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300"
                        >
                          {selectedSession ? (
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-sm font-bold text-primary-700">
                                {formatSessionDate(selectedSession.startsAt).weekday}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {formatSessionDate(selectedSession.startsAt).full}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {formatSessionDate(selectedSession.startsAt).time}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">Выберите дату</span>
                          )}
                          <ChevronDown
                            className={`h-4 w-4 text-slate-400 transition ${sessionDropdownOpen ? 'rotate-180' : ''}`}
                          />
                        </button>

                        {sessionDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                            {activeSessions.map((session) => {
                              const fmt = formatSessionDate(session.startsAt);
                              const isSelected = session.id === selectedSessionId;
                              return (
                                <button
                                  key={session.id}
                                  onClick={() => {
                                    setSelectedSessionId(session.id);
                                    setSessionDropdownOpen(false);
                                  }}
                                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50 ${
                                    isSelected ? 'bg-primary-50' : ''
                                  }`}
                                >
                                  <div
                                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ${
                                      isSelected
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {fmt.weekday}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-900">{fmt.date}</p>
                                    <p className="text-xs text-slate-500">{fmt.time}</p>
                                  </div>
                                  <span className="text-xs text-emerald-600">
                                    {session.availableTickets} мест
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Ticket types */}
                  {selectedSession && selectedSession.prices.length > 0 && (
                    <div className="mt-5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Билеты
                      </label>
                      <div className="mt-2 space-y-2">
                        {selectedSession.prices.map((priceItem) => {
                          const qty = quantities[priceItem.setId] || 0;
                          const maxQty = Math.min(priceItem.amountVacant, 10);
                          return (
                            <div
                              key={priceItem.setId}
                              className={`flex items-center justify-between rounded-xl border px-4 py-3 transition ${
                                qty > 0
                                  ? 'border-primary-200 bg-primary-50/50'
                                  : 'border-slate-200 bg-white'
                              }`}
                            >
                              <div>
                                <p className="text-sm font-medium text-slate-900">{priceItem.name}</p>
                                <p className="text-sm font-bold text-primary-600">
                                  {formatPrice(priceItem.price)}
                                </p>
                              </div>

                              {/* Quantity controls */}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => updateQty(priceItem.setId, -1, maxQty)}
                                  disabled={qty === 0}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition enabled:hover:bg-slate-100 disabled:opacity-30"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="flex h-8 w-8 items-center justify-center text-sm font-semibold text-slate-900">
                                  {qty}
                                </span>
                                <button
                                  onClick={() => updateQty(priceItem.setId, 1, maxQty)}
                                  disabled={qty >= maxQty}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition enabled:hover:bg-slate-100 disabled:opacity-30"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer — total + CTA */}
        {checkoutState === 'select' && activeSessions.length > 0 && (
          <div className="flex-shrink-0 border-t border-slate-100 bg-white px-5 py-4">
            {totalItems > 0 && (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    Итого ({totalItems}{' '}
                    {totalItems === 1 ? 'билет' : totalItems < 5 ? 'билета' : 'билетов'})
                  </span>
                  <span className="text-xl font-bold text-slate-900">{formatPrice(totalPrice)}</span>
                </div>

                {/* Email для отправки билетов */}
                {source === 'TC' && (
                  <input
                    type="email"
                    placeholder="Email для получения билетов"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                )}
              </>
            )}

            <button
              onClick={handleCheckout}
              disabled={totalItems === 0}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold transition active:scale-[0.98] ${
                totalItems > 0
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700'
                  : 'cursor-not-allowed bg-slate-200 text-slate-400'
              }`}
            >
              <Ticket className="h-5 w-5" />
              {totalItems > 0
                ? source === 'TEPLOHOD'
                  ? 'Перейти на teplohod.info'
                  : `Оформить за ${formatPrice(totalPrice)}`
                : 'Выберите билеты'}
              {source === 'TEPLOHOD' && totalItems > 0 && (
                <ExternalLink className="ml-1 h-3.5 w-3.5 opacity-60" />
              )}
            </button>

            <div className="mt-3 flex items-center justify-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs text-slate-400">
                Безопасная покупка через {getSourceLabel(source)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ========================
// Кнопка, открывающая модалку
// ========================

interface BuyButtonProps {
  eventTitle: string;
  eventImage: string | null;
  tcEventId: string;
  source?: EventSource;
  sessions: Session[];
  address?: string | null;
  venueName?: string | null;
  priceFrom: number | null;
  className?: string;
}

export function BuyButton({
  eventTitle,
  eventImage,
  tcEventId,
  source = 'TC',
  sessions,
  address,
  venueName,
  priceFrom,
  className = '',
}: BuyButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-600/25 transition hover:bg-primary-700 hover:shadow-xl hover:shadow-primary-600/30 active:scale-[0.98] ${className}`}
      >
        <Ticket className="h-5 w-5" />
        Купить билет
      </button>

      <BuyModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        eventTitle={eventTitle}
        eventImage={eventImage}
        tcEventId={tcEventId}
        source={source}
        sessions={sessions}
        address={address}
        venueName={venueName}
        priceFrom={priceFrom}
      />
    </>
  );
}
