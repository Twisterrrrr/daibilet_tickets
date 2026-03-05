'use client';

import * as React from 'react';

type ScarcityLevel = 'NONE' | 'LOW' | 'LAST';

type WidgetSession = {
  id: string;
  startsAt: string;
  price?: number | null;
  available: number;
  isActive: boolean;
  isSoldOut: boolean;
  scarcityLevel: ScarcityLevel;
  tags: Array<'SOONEST' | 'BEST_PRICE' | 'POPULAR'>;
};

type WidgetEvent = {
  id: string;
  title: string;
  imageUrl?: string | null;
  priceFrom?: number | null;
  currency: 'RUB';
};

type Props = {
  provider: string;
  eventId: string | null;
  initialError: string | null;
  event: WidgetEvent | null;
  sessions: WidgetSession[] | null;
};

function formatPriceRUB(kopecks?: number | null): string {
  if (!kopecks || kopecks <= 0) return '';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(kopecks / 100);
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SessionPickerClient({ provider, eventId, initialError, event, sessions }: Props) {
  const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null);
  const [qty, setQty] = React.useState<number>(1);
  const [error, setError] = React.useState<string | null>(initialError);
  const [step, setStep] = React.useState<'pick' | 'contacts'>('pick');
  const [buyer, setBuyer] = React.useState({ name: '', email: '', phone: '' });
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (sessions && sessions.length > 0) {
      const firstAvailable = sessions.find((s) => !s.isSoldOut) ?? sessions[0];
      setSelectedSessionId(firstAvailable.id);
      const maxQty = Math.max(1, Math.min(10, firstAvailable.available || 1));
      setQty(Math.min(1, maxQty));
    }
  }, [sessions]);

  if (error && !event) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!event) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
        Загрузка…
      </div>
    );
  }

  const priceLabel = formatPriceRUB(event.priceFrom ?? null);

  const selectedSession = sessions?.find((s) => s.id === selectedSessionId) ?? null;
  const maxQty = selectedSession ? Math.max(1, Math.min(10, selectedSession.available || 1)) : 1;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5">
      <div className="px-4 pb-2 pt-3">
        <div className="mb-1 text-sm font-semibold text-slate-900">{event.title}</div>
        {priceLabel && (
          <div className="mb-2 text-sm text-slate-800">
            от <span className="font-semibold">{priceLabel}</span>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 px-4 pb-3 pt-2">
        {!sessions || sessions.length === 0 ? (
          <div className="text-sm text-slate-500">Ближайших сеансов нет.</div>
        ) : (
          <>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Выберите сеанс
            </div>
            <div className="mb-3 flex flex-col gap-1.5">
              {sessions.map((s) => {
                const disabled = s.isSoldOut || !s.isActive;
                const sessionPriceLabel = formatPriceRUB(s.price ?? null) || priceLabel;
                const isSelected = selectedSessionId === s.id;

                let scarcityText: string | null = null;
                if (!s.isSoldOut) {
                  if (s.scarcityLevel === 'LAST') {
                    scarcityText = `Последние места (${s.available})`;
                  } else if (s.scarcityLevel === 'LOW') {
                    scarcityText = `Осталось ${s.available}`;
                  }
                } else {
                  scarcityText = 'Распродано';
                }

                return (
                  <label
                    key={s.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition ${
                      disabled
                        ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                        : isSelected
                          ? 'border-blue-500 bg-blue-50 text-slate-900'
                          : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="session"
                      value={s.id}
                      disabled={disabled}
                      checked={isSelected}
                      onChange={() => {
                        setSelectedSessionId(s.id);
                        const max = Math.max(1, Math.min(10, s.available || 1));
                        if (qty > max) setQty(max);
                      }}
                      className="h-3 w-3"
                    />
                    <span className="flex-1 truncate">{formatDateTime(s.startsAt)}</span>
                    {sessionPriceLabel && (
                      <span className="ml-2 whitespace-nowrap text-[11px] font-medium text-slate-900">
                        {sessionPriceLabel}
                      </span>
                    )}
                    {scarcityText && (
                      <span
                        className={`ml-2 whitespace-nowrap text-[10px] ${
                          s.isSoldOut || s.scarcityLevel === 'LAST'
                            ? 'text-red-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {scarcityText}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            {selectedSession && !selectedSession.isSoldOut && (
              <div className="mb-3 flex items-center justify-between gap-3 text-xs text-slate-600">
                <span>Количество билетов</span>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                  <button
                    type="button"
                    className="px-1 text-slate-500 hover:text-slate-900"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                  >
                    −
                  </button>
                  <span className="min-w-[1.5rem] text-center font-semibold text-slate-900">
                    {qty}
                  </span>
                  <button
                    type="button"
                    className="px-1 text-slate-500 hover:text-slate-900"
                    onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                    disabled={qty >= maxQty}
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {step === 'contacts' && (
              <div className="mb-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs">
                <input
                  type="text"
                  placeholder="Имя"
                  value={buyer.name}
                  onChange={(e) => setBuyer((b) => ({ ...b, name: e.target.value }))}
                  className="w-full rounded border border-slate-200 px-2 py-1.5"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={buyer.email}
                  onChange={(e) => setBuyer((b) => ({ ...b, email: e.target.value }))}
                  className="w-full rounded border border-slate-200 px-2 py-1.5"
                />
                <input
                  type="tel"
                  placeholder="Телефон"
                  value={buyer.phone}
                  onChange={(e) => setBuyer((b) => ({ ...b, phone: e.target.value }))}
                  className="w-full rounded border border-slate-200 px-2 py-1.5"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-slate-700"
                    onClick={() => setStep('pick')}
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    disabled={submitting || !buyer.name.trim() || !buyer.email.trim() || !buyer.phone.trim()}
                    className="flex-1 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-3 py-1.5 font-medium text-white disabled:opacity-60"
                    onClick={async () => {
                      if (!eventId || !selectedSession) return;
                      setError(null);
                      setSubmitting(true);
                      try {
                        const res = await fetch(`/api/v1/widgets/${encodeURIComponent(provider)}/checkout`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            eventId,
                            sessionId: selectedSession.id,
                            qty,
                            buyer: { name: buyer.name.trim(), email: buyer.email.trim(), phone: buyer.phone.trim() },
                            idempotencyKey: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
                          }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          setError(data?.message || `Ошибка ${res.status}`);
                          return;
                        }
                        const url = data?.redirectUrl;
                        if (url && typeof url === 'string') {
                          if (typeof window !== 'undefined' && window.top) {
                            window.top.location.href = url;
                          } else {
                            window.location.href = url;
                          }
                          return;
                        }
                        setError('Нет ссылки на оплату');
                      } catch {
                        setError('Ошибка сети');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                  >
                    {submitting ? 'Отправка…' : 'Перейти к оплате'}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-2 text-xs text-red-600">
                {error}
              </div>
            )}

            {step === 'pick' && (
              <button
                type="button"
                disabled={!selectedSession || (selectedSession && selectedSession.isSoldOut)}
                className="mt-1 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => setStep('contacts')}
              >
                Купить билеты
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

