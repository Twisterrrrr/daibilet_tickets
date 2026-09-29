'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';

interface TepCheckoutContainerProps {
  tepEventId?: string | number | null;
  externalEventId?: string | null;
  deeplink?: string | null;
  label?: string;
  className?: string;
}

export function TepCheckoutContainer({
  tepEventId,
  externalEventId,
  deeplink,
  label = 'Купить билет',
  className,
}: TepCheckoutContainerProps) {
  const [open, setOpen] = useState(false);

  const numericEventId =
    tepEventId != null
      ? String(tepEventId)
      : externalEventId
        ? String(externalEventId).replace(/^tep-/, '')
        : null;

  const widgetSrc = numericEventId
    ? `/widgets/teplohod?eventId=${encodeURIComponent(numericEventId)}&layout=compact&theme=light`
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          'flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3.5 text-base font-medium text-white transition hover:bg-primary-700'
        }
      >
        {label}
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
                {widgetSrc ? (
                  <iframe
                    title="Teplohod tickets widget"
                    src={widgetSrc}
                    className="h-[520px] w-full rounded-xl bg-white"
                  />
                ) : (
                  <div className="py-10 text-center text-sm text-slate-600">
                    Не удалось открыть виджет: не найден teplohod eventId.
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

