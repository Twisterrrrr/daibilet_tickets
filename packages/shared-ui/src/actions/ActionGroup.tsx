import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface ActionGroupProps {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'between';
}

export function ActionGroup({ children, className, align = 'right' }: ActionGroupProps) {
  const justify =
    align === 'left' ? 'justify-start' : align === 'between' ? 'justify-between' : 'justify-end';
  return (
    <div className={clsx('flex flex-wrap items-center gap-2', justify, className)}>{children}</div>
  );
}

