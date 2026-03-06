'use client';

import * as React from 'react';
import { createTeplohodCheckout } from './actions';

type Session = {
  id: string;
  startIso: string;
  endIso?: string;
  price?: number;
  available?: boolean;
  reasonClosed?: 'SOLD_OUT' | 'PAST' | 'CANCELLED' | 'UNKNOWN';
};

type EventInfo = {
  id: string;
  externalId?: string;
  title: string;
  city?: string;
  imageUrl?: string;
  url: string;
  priceFrom?: number;
  currency?: 'RUB';
};

export type WidgetData = {
  provider: 'TEPLOHOD';
  event: EventInfo;
  sessions: Session[];
  ui: { lang: 'ru' | 'en'; theme: 'light' | 'dark'; layout: 'compact' | 'full' };
};

function formatPrice(kopecks?: number) {
  if (kopecks == null) return '';
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(kopecks / 100);
  } catch {
    return `${Math.round(kopecks / 100)} ₽`;
  }
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

interface Props {
  initialError: string | null;
  initialData: WidgetData | null;
  eventId?: string;
}

export default function TeplohodWidgetClient({ initialError, initialData, eventId }: Props) {
  const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(initialError);
  const [data] = React.useState<WidgetData | null>(initialData);

  React.useEffect(() => {
    if (data?.sessions?.length) {
      const firstAvailable = data.sessions.find((s) => s.available) ?? data.sessions[0];
      setSelectedSessionId(firstAvailable.id);
    }
  }, [data]);

  async function handleBuyClick() {
    if (!data || !eventId) return;

    if (!selectedSessionId) {
      setError('Пожалуйста, выберите сеанс');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const checkoutUrl = await createTeplohodCheckout({
        eventId,
        sessionId: selectedSessionId,
        qty: 1,
        returnUrl: window.location.href,
      });

      if (typeof window !== 'undefined' && window.top) {
        window.top.location.href = checkoutUrl;
      } else {
        window.location.href = checkoutUrl;
      }
    } catch {
      setError('Не удалось перейти к покупке. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }

  if (error && !data) {
    return <div style={{ padding: '12px 0', fontSize: 14, color: '#b91c1c' }}>{error}</div>;
  }

  if (!data) {
    return <div style={{ padding: '12px 0', fontSize: 14, color: '#6b7280' }}>Загрузка…</div>;
  }

  const { event, sessions } = data;
  const priceLabel = event.priceFrom != null ? formatPrice(event.priceFrom) : '';

  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        background: '#ffffff',
        boxShadow: '0 10px 25px rgba(15,23,42,0.06)',
      }}
    >
      <div style={{ padding: '12px 16px 8px' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
          {event.title}
        </div>

        {event.city && (
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{event.city}</div>
        )}

        {priceLabel && (
          <div style={{ fontSize: 14, color: '#111827', marginBottom: 8 }}>
            от <strong>{priceLabel}</strong>
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid #e5e7eb', padding: '8px 16px 12px' }}>
        {sessions.length === 0 ? (
          <div style={{ fontSize: 13, color: '#6b7280' }}>Ближайших сеансов нет.</div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 6 }}>Выберите сеанс:</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
              {sessions.map((s) => {
                const disabled = !s.available;
                return (
                  <label
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.5 : 1,
                    }}
                  >
                    <input
                      type="radio"
                      name="session"
                      value={s.id}
                      disabled={disabled}
                      checked={selectedSessionId === s.id}
                      onChange={() => setSelectedSessionId(s.id)}
                    />
                    <span>{formatDateTime(s.startIso)}</span>
                    {s.price != null && (
                      <span style={{ marginLeft: 'auto', color: '#111827' }}>
                        {formatPrice(s.price)}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            {error && (
              <div style={{ fontSize: 12, color: '#b91c1c', marginBottom: 6 }}>{error}</div>
            )}

            <button
              type="button"
              onClick={handleBuyClick}
              disabled={loading || sessions.length === 0}
              style={{
                width: '100%',
                borderRadius: 9999,
                padding: '9px 16px',
                border: 'none',
                background:
                  'linear-gradient(135deg, #0EA5E9 0%, #2563EB 50%, #4F46E5 100%)',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 600,
                cursor: loading || sessions.length === 0 ? 'not-allowed' : 'pointer',
                opacity: loading || sessions.length === 0 ? 0.7 : 1,
              }}
            >
              {loading ? 'Переход к оплате…' : 'Купить билеты'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

