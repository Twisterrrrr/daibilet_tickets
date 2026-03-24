import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface FilterBarProps {
  children: ReactNode;
  onReset?: () => void;
  onApply?: () => void;
  className?: string;
  sticky?: boolean;
  resetLabel?: ReactNode;
  applyLabel?: ReactNode;
}

export function FilterBar({
  children,
  onReset,
  onApply,
  className,
  sticky = false,
  resetLabel = 'Сбросить',
  applyLabel = 'Применить',
}: FilterBarProps) {
  return (
    <div
      className={clsx(
        'rounded-[10px] border border-border/80 bg-white p-2.5 sm:p-3',
        sticky && 'sticky top-2 z-10',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
      {(onReset || onApply) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {onReset ? (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-8 items-center rounded-md border px-2.5 text-sm text-muted-foreground hover:bg-muted"
            >
              {resetLabel}
            </button>
          ) : null}
          {onApply ? (
            <button
              type="button"
              onClick={onApply}
              className="inline-flex h-8 items-center rounded-md bg-primary px-2.5 text-sm text-primary-foreground hover:bg-primary/90"
            >
              {applyLabel}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

