import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface LoadingStateProps {
  label?: string;
  icon?: ReactNode;
  className?: string;
}

export function LoadingState({ label = 'Загрузка...', icon, className }: LoadingStateProps) {
  return (
    <div className={clsx('flex items-center justify-center py-12 text-sm text-slate-500', className)}>
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
        {icon}
        <span>{label}</span>
      </div>
    </div>
  );
}

