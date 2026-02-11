/**
 * Кнопка покупки билета через Ticketscloud.
 * Скрипт tcwidget.js подключён глобально в layout.tsx.
 * По клику на кнопку с data-tc-event скрипт открывает модалку TC.
 */
'use client';

import { trackWidgetOpen } from '@/lib/analytics';

const TC_TOKEN =
  'eyJhbGciOiJIUzI1NiIsImlzcyI6InRpY2tldHNjbG91ZC5ydSIsInR5cCI6IkpXVCJ9.eyJwIjoiNjhiNjA1ODk2NWExMTlkOWRkYTU5NzI5In0.NfLxwobFNxE5HDzcS1Xh9Faf4NmmoOJ0teg7HJnQEZc';

export function TcWidgetButton({ tcEventId }: { tcEventId: string }) {
  if (!tcEventId) return null;

  return (
    <button
      type="button"
      data-tc-event={tcEventId}
      data-tc-token={TC_TOKEN}
      onClick={() => trackWidgetOpen(tcEventId)}
      className="tc-background-yellow flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold"
    >
      Купить билет
    </button>
  );
}
