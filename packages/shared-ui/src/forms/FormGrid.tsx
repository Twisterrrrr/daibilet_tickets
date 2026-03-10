import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface FormGridProps {
  columns?: 1 | 2 | 3;
  children: ReactNode;
  className?: string;
}

export function FormGrid({ columns = 2, children, className }: FormGridProps) {
  const base =
    columns === 1
      ? 'grid gap-4'
      : columns === 2
      ? 'grid gap-4 sm:grid-cols-2'
      : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3';

  return <div className={clsx(base, className)}>{children}</div>;
}

