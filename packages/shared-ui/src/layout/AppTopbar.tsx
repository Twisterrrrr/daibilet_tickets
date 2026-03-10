import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface AppTopbarProps {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
}

/**
 * Simple horizontal top bar with left/right slots.
 */
export function AppTopbar({ left, right, className }: AppTopbarProps) {
  return (
    <div
      className={clsx(
        'flex items-center justify-between gap-4 px-4 py-2.5 text-sm text-slate-700',
        className,
      )}
    >
      <div className="flex items-center gap-2">{left}</div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  );
}

