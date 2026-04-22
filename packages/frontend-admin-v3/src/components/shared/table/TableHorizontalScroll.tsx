import { cn } from '@/shared/lib/cn';
import type { ReactNode } from 'react';

/** Обёртка для широких таблиц: горизонтальный скролл + лёгкий градиент справа на узких экранах. */
export function TableHorizontalScroll({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  /** Классы для внутреннего `overflow-x-auto` (например `p-2`). */
  innerClassName?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <span className="sr-only">
        Таблицу можно прокручивать горизонтально при узком экране.
      </span>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-10 max-md:bg-gradient-to-l max-md:from-card max-md:to-transparent md:hidden"
        aria-hidden
      />
      <div className={cn('overflow-x-auto', innerClassName)}>{children}</div>
    </div>
  );
}
