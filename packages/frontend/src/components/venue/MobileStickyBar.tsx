'use client';

import { formatPrice } from '@daibilet/shared';
import { useEffect, useState } from 'react';

interface MobileStickyBarProps {
  priceFrom: number | null;
  ctaHref: string;
  ctaText?: string;
  isExternal?: boolean;
}

/**
 * Sticky bottom bar for mobile.
 * Appears only when the user scrolls past the hero CTA (uses IntersectionObserver).
 * The sentinel element should be rendered in the hero section with id="hero-cta-sentinel".
 */
export function MobileStickyBar({
  priceFrom,
  ctaHref,
  ctaText = 'Купить билет',
  isExternal = false,
}: MobileStickyBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById('hero-cta-sentinel');
    if (!sentinel) {
      // If no sentinel, always show
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show bar when sentinel is NOT visible (scrolled past hero CTA)
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-50 md:hidden
        bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]
        transition-transform duration-300 ease-out
        ${visible ? 'translate-y-0' : 'translate-y-full'}
      `}
    >
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
        <div className="min-w-0">
          {priceFrom ? (
            <>
              <p className="text-[10px] text-gray-500 leading-none">от</p>
              <p className="text-lg font-extrabold text-gray-900 leading-tight">{formatPrice(priceFrom)}</p>
            </>
          ) : (
            <p className="text-sm font-semibold text-gray-700">Билеты доступны</p>
          )}
        </div>
        {isExternal ? (
          <a
            href={ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm
                       hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm shadow-blue-600/20"
          >
            {ctaText}
          </a>
        ) : (
          <a
            href={ctaHref}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm
                       hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm shadow-blue-600/20"
          >
            {ctaText}
          </a>
        )}
      </div>
    </div>
  );
}
