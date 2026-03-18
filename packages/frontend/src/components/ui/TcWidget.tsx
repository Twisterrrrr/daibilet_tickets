/**
 * Компоненты покупки билетов через Ticketscloud.
 * TcWidgetButton — кнопка, которая открывает overlay-виджет через tcwidget.js.
 *
 * TcSessionSlot — кликабельная строка сеанса:
 *   - Извлекает TC event ID из tcSessionId (формат "{tcEventId}-main")
 *   - По клику открывает overlay-виджет сразу на этом конкретном eventId
 *
 * Токен виджета: NEXT_PUBLIC_TC_WIDGET_TOKEN из .env
 */
'use client';

import { useRef } from 'react';

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

  const eventId = tcEventId || tcMetaEventId || '';
  // Скрытая техническая кнопка, к которой tcwidget.js привяжет свой обработчик.
  const hiddenButtonRef = useRef<HTMLButtonElement | null>(null);

  if (!eventId) return null;

  // Для интеграции с официальным tcwidget.js нужно отдать data-* атрибуты,
  // а сам скрипт повесит обработчики и откроет модалку.
  const sizeClasses = compact
    ? 'rounded-md px-3.5 py-2 text-sm font-semibold'
    : 'rounded-md px-6 py-3 text-base font-semibold';

  return (
    <>
      {/* Наша видимая кнопка с нужным стилем */}
      <button
        type="button"
        className={`flex w-full items-center justify-center gap-1.5 bg-amber-400 text-slate-900 shadow-sm transition-colors hover:bg-amber-500 ${sizeClasses}`}
        onClick={() => {
          trackWidgetOpen(eventId);
          // Проксируем клик на скрытую кнопку, чтобы tcwidget.js открыл модалку.
          hiddenButtonRef.current?.click();
        }}
      >
        {label}
      </button>

      {/* Невидимая кнопка-триггер для tcwidget.js */}
      <button
        ref={hiddenButtonRef}
        type="button"
        data-tc-event={eventId}
        data-tc-token={TC_TOKEN}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0, padding: 0, margin: 0 }}
        aria-hidden="true"
        tabIndex={-1}
      >
        Купить билет
      </button>
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// TcSessionSlot — кликабельная строка сеанса → overlay-виджет (tcwidget.js)
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
  // Всегда инициализируем ref, чтобы соблюдать порядок вызова хуков.
  const hiddenTriggerRef = useRef<HTMLButtonElement | null>(null);

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
    <>
      {/* Видимый слот с нашим стилем, без data-tc-* */}
      <button
        type="button"
        className="tc-session-slot"
        onClick={() => {
          trackWidgetOpen(tcEventId);
          hiddenTriggerRef.current?.click();
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-xs text-slate-600">
            {weekday}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-slate-800">{date}</p>
            <p className="text-xs text-slate-400">{time}</p>
          </div>
        </div>
        {session.availableTickets > 0 ? (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-600">
            {session.availableTickets} мест
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-500">Распродано</span>
        )}
      </button>

      {/* Невидимый триггер для tcwidget.js */}
      <button
        ref={hiddenTriggerRef}
        type="button"
        data-tc-event={tcEventId}
        data-tc-token={TC_TOKEN}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0, padding: 0, margin: 0 }}
        aria-hidden="true"
        tabIndex={-1}
      >
        {date} {time}
      </button>
    </>
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
