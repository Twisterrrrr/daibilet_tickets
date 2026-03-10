import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface StickyFormActionsProps {
  children: ReactNode;
  className?: string;
}

export function StickyFormActions({ children, className }: StickyFormActionsProps) {
  return (
    <div
      className={clsx(
        'sticky bottom-0 left-0 right-0 z-10 -mx-4 mt-6 border-t bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>
    </div>
  );
}

