import { cn } from '@/shared/lib/cn';
import type { ReactNode } from 'react';

/** Контейнер панели фильтров (без сетки — добавьте `FilterFieldsGrid` или свою разметку). */
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-0 rounded-lg border bg-card p-4', className)}>{children}</div>
  );
}

/** Поле: подпись сверху, контрол на всю ширину ячейки сетки. */
export function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/**
 * Адаптивная сетка фильтров (1 → 2 → 3 → 4 колонки).
 * Используйте `className` на `FilterField` для `sm:col-span-2` у широкого поиска.
 */
export function FilterFieldsGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

