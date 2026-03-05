 "use client";

/**
 * Виджет покупки билетов через teplohod.info.
 *
 * Скрипт widget.js подключён глобально в layout.tsx (strategy="lazyOnload").
 * Он ищет элементы с классом "teplohod-info-wrapper" и рендерит
 * встроенный виджет покупки билетов внутри них.
 *
 * data-id — числовой ID виджета агента на teplohod.info
 * data-event-id — числовой ID события (из events?compact)
 * data-lang — локаль (ru-RU)
 *
 * Поскольку скрипт инициализируется при загрузке и может не найти
 * элементы, добавленные позже (SPA-навигация), перезагружаем скрипт
 * при монтировании компонента. MutationObserver скрывает виджет,
 * если teplohod вернул «нет расписания» (deleted-block / closed).
 */

import { useEffect, useRef, useState } from 'react';

/**
 * CSS-переопределение для кнопки виджета teplohod.info.
 * Приводим к стилистике сайта: primary-600 (#2563eb), rounded-xl, shadow.
 */
const TEP_BUTTON_CSS = `
.teplohod-info-wrapper .ti-tickets-event-tickets-buy {
  display: flex !important;
  width: 100% !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 0.5rem !important;
  border-radius: 0.75rem !important;
  background: #2563eb !important;
  padding: 0.875rem 1.5rem !important;
  font-size: 1rem !important;
  line-height: 1.5rem !important;
  font-weight: 600 !important;
  font-family: Inter, system-ui, -apple-system, sans-serif !important;
  color: #fff !important;
  text-decoration: none !important;
  box-shadow: 0 10px 15px -3px rgb(37 99 235 / 0.25) !important;
  transition: background 0.15s, box-shadow 0.15s, transform 0.1s !important;
  border: none !important;
  cursor: pointer !important;
}
.teplohod-info-wrapper .ti-tickets-event-tickets-buy:hover {
  background: #1d4ed8 !important;
  box-shadow: 0 20px 25px -5px rgb(37 99 235 / 0.30) !important;
}
.teplohod-info-wrapper .ti-tickets-event-tickets-buy:active {
  transform: scale(0.98) !important;
}
.teplohod-info-wrapper .ti-tickets-widget {
  max-width: 100% !important;
}
.teplohod-info-wrapper #deleted-block {
  display: none !important;
}
.teplohod-info-wrapper .ti-tickets-event-tickets-buy-closed {
  display: none !important;
}
`;

/**
 * Глобальный ID виджета агента на teplohod.info.
 * Используется как data-id для всех событий.
 */
const GLOBAL_TEP_WIDGET_ID = '14208';

/**
 * Извлечь числовой ID teplohod-события из externalEventId.
 * Формат: "tep-{id}", напр. "tep-1291" → "1291"
 */
function extractTepId(externalEventId: string): string | null {
  if (!externalEventId) return null;
  const match = externalEventId.match(/^tep-(\d+)$/);
  return match ? match[1] : externalEventId;
}

/**
 * ID для data-id виджета teplohod.info.
 * Приоритет: tepWidgetId (виджет из админки) → tepEventId → externalEventId (tep-123).
 */
export function TepWidgetEmbed({
  tepWidgetId,
  tepEventId,
  externalEventId,
}: {
  tepWidgetId?: string | number | null;
  tepEventId?: string | number | null;
  externalEventId?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);
  // Числовой ID события Teplohod (из compact JSON / tcEventId)
  const eventId =
    tepEventId != null
      ? String(tepEventId)
      : externalEventId
        ? extractTepId(externalEventId)
        : null;

  useEffect(() => {
    if (!eventId || !containerRef.current) return;

    const container = containerRef.current;

    const timer = setTimeout(() => {
      const existing = document.querySelector('script[src*="teplohod.info/v1/widget/widget.js"]');
      if (existing) {
        const script = document.createElement('script');
        script.src = 'https://api.teplohod.info/v1/widget/widget.js';
        script.defer = true;
        document.body.appendChild(script);
        script.onload = () => script.remove();
      }
    }, 100);

    const observer = new MutationObserver(() => {
      const deleted = container.querySelector('#deleted-block');
      const closed = container.querySelector('.ti-tickets-event-tickets-buy-closed');
      if (deleted || closed) {
        setHidden(true);
        observer.disconnect();
      }
    });
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [eventId]);

  if (!eventId || hidden) return null;

  return (
    <div className="mt-4">
      <style dangerouslySetInnerHTML={{ __html: TEP_BUTTON_CSS }} />
      <div
        ref={containerRef}
        data-lang="ru-RU"
        data-id={tepWidgetId ? String(tepWidgetId) : GLOBAL_TEP_WIDGET_ID}
        data-event-id={eventId}
        className="teplohod-info-wrapper"
      />
    </div>
  );
}
