'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';

import { TepWidgetEmbed } from './TepWidget';

interface TepCheckoutContainerProps {
  tepWidgetId?: string | number | null;
  tepEventId?: string | number | null;
  externalEventId?: string | null;
  deeplink?: string | null;
}

export function TepCheckoutContainer({
  tepWidgetId,
  tepEventId,
  externalEventId,
  deeplink,
}: TepCheckoutContainerProps) {
  const [open, setOpen] = useState(false);

  const numericEventId =
    tepEventId != null
      ? String(tepEventId)
      : externalEventId
        ? String(externalEventId).replace(/^tep-/, '')
        : null;

  const _teplohodUrl =
    deeplink ||
    (numericEventId ? `https://teplohod.info/event/${encodeURIComponent(numericEventId)}` : undefined);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3.5 text-base font-medium text-white transition hover:bg-primary-700"
      >
        Купить билет
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="relative w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                aria-label="Закрыть"
              >
                ✕
              </button>
              <div className="min-h-[220px] rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <TepWidgetEmbed
                  tepWidgetId={tepWidgetId}
                  tepEventId={numericEventId ?? undefined}
                  externalEventId={externalEventId ?? null}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

