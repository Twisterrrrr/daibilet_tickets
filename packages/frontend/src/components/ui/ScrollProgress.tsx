'use client';

import { useEffect, useState } from 'react';

/**
 * Тонкая полоса прогресса прочтения страницы. Показывается только на мобильных.
 */
export function ScrollProgress() {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const p = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
      setPercent(p);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (percent <= 0) return null;

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[100] h-0.5 bg-slate-200 md:hidden"
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full bg-primary-600 transition-[width] duration-150" style={{ width: `${percent}%` }} />
    </div>
  );
}
