import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface FormActionsProps {
  primary?: ReactNode;
  secondary?: ReactNode;
  destructive?: ReactNode;
  align?: 'left' | 'right' | 'between';
  className?: string;
}

export function FormActions({ primary, secondary, destructive, align = 'right', className }: FormActionsProps) {
  const justify =
    align === 'left' ? 'justify-start' : align === 'between' ? 'justify-between' : 'justify-end';

  return (
    <div
      className={clsx(
        'flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center',
        justify,
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {secondary}
        {destructive}
      </div>
      {primary ? <div className="flex flex-wrap items-center gap-2">{primary}</div> : null}
    </div>
  );
}

