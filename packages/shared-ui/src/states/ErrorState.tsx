import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface ErrorStateProps {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = 'Что-то пошло не так',
  description = 'Попробуйте обновить страницу или повторить действие позже.',
  action,
  className,
}: ErrorStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50/40 py-10', className)}>
      <p className="text-sm font-semibold text-red-700">{title}</p>
      {description ? <p className="mt-1 text-xs text-red-600">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

