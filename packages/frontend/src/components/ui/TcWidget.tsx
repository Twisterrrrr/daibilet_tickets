/**
 * Компоненты покупки билетов через Ticketscloud.
 * TcWidgetButton — всегда прямая ссылка (GET). tcwidget.js при POST к view widget
 * возвращает PredicateMismatch, поэтому используем href вместо data-tc-event.
 *
 * TcSessionSlot — кликабельная строка сеанса:
 *   - Извлекает TC event ID из tcSessionId (формат "{tcEventId}-{set}")
 *   - По клику открывает виджет сразу на этом конкретном сеансе
 *
 * Токен виджета: NEXT_PUBLIC_TC_WIDGET_TOKEN из .env
 */
'use client';

import { trackWidgetOpen } from '@/lib/analytics';

const TC_TOKEN = process.env.NEXT_PUBLIC_TC_WIDGET_TOKEN;

/**
 * Извлечь TC event ID из tcSessionId.
 * Формат: "{tcEventId}-{setName}", напр. "697689bd5987d16e7f434c2c-main"
 */
function extractTcEventId(tcSessionId: string): string | null {
  if (!tcSessionId) return null;
  const idx = tcSessionId.indexOf('-');
  return idx > 0 ? tcSessionId.substring(0, idx) : tcSessionId;
}

// ────────────────────────────────────────────────────────────────
// TcWidgetButton — основная кнопка покупки
// ────────────────────────────────────────────────────────────────

function getTcWidgetUrl(widgetEventId: string, isMeta: boolean): string {
  return isMeta
    ? `https://ticketscloud.com/v1/services/widget/meta?meta_event=${widgetEventId}`
    : `https://ticketscloud.com/v1/services/widget?event=${widgetEventId}`;
}

export function TcWidgetButton({
  tcEventId,
  tcMetaEventId,
  children,
  compact = false,
}: {
  tcEventId: string;
  tcMetaEventId?: string | null;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  const label = children ?? (compact ? 'Купить' : 'Купить билет');
  const widgetEventId = tcMetaEventId || tcEventId;
  const isMeta = !!tcMetaEventId;

  if (!widgetEventId) return null;

  const sizeClasses = compact
    ? 'rounded-lg px-3.5 py-2 text-sm font-bold'
    : 'rounded-xl px-6 py-3 text-base font-semibold';

  const href = getTcWidgetUrl(widgetEventId, isMeta);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackWidgetOpen(widgetEventId)}
      className={`tc-buy-btn tc-background-yellow flex w-full items-center justify-center gap-1.5 bg-amber-400 text-slate-900 transition-colors hover:bg-amber-500 ${sizeClasses}`}
    >
      {label}
    </a>
  );
}

// ────────────────────────────────────────────────────────────────
// TcSessionSlot — кликабельная строка сеанса → виджет на конкретный слот
// ────────────────────────────────────────────────────────────────

export function TcSessionSlot({
  session,
}: {
  session: {
    id: string;
    tcSessionId?: string;
    startsAt: string;
    availableTickets: number;
    isActive?: boolean;
  };
}) {
  const tcEventId = extractTcEventId(session.tcSessionId ?? '');

  if (!tcEventId || !TC_TOKEN) {
    // Без токена или без ID — рендерим обычную (не кликабельную) строку
    return <SessionRowContent session={session} />;
  }

  const d = new Date(session.startsAt);
  const weekday = d.toLocaleDateString('ru-RU', { weekday: 'short' });
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <button
      type="button"
      data-tc-event={tcEventId}
      data-tc-token={TC_TOKEN}
      onClick={() => trackWidgetOpen(tcEventId)}
      className="tc-session-slot group"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-600 ring-1 ring-slate-200 group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:ring-blue-200">
          {weekday}
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-slate-800">{date}</p>
          <p className="text-xs text-slate-400">{time}</p>
        </div>
      </div>
      {session.availableTickets > 0 ? (
        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
          {session.availableTickets} мест
        </span>
      ) : (
        <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-500">Распродано</span>
      )}
    </button>
  );
}

/** Fallback: статичная строка сеанса (без виджета) */
function SessionRowContent({ session }: { session: { startsAt: string; availableTickets: number } }) {
  const d = new Date(session.startsAt);
  const weekday = d.toLocaleDateString('ru-RU', { weekday: 'short' });
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-xs font-bold text-primary-700">
          {weekday}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">{date}</p>
          <p className="text-xs text-slate-500">{time}</p>
        </div>
      </div>
      {session.availableTickets > 0 ? (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
          {session.availableTickets} мест
        </span>
      ) : (
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-500">Распродано</span>
      )}
    </div>
  );
}
