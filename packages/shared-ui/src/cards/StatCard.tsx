import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
  className?: string;
}

/**
 * Небольшая KPI-карточка для дашбордов.
 * Используется и в админке, и в кабинете поставщика.
 */
export function StatCard({ label, value, icon, description, className }: StatCardProps) {
  return (
    <div
      className={clsx(
        'flex flex-col justify-between rounded-[10px] border border-border/80 bg-white px-3.5 py-3 shadow-none sm:px-4 sm:py-3.5',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-0.5 text-xl font-semibold text-slate-900 sm:text-2xl">{value}</p>
        </div>
        {icon ? <div className="text-slate-400">{icon}</div> : null}
      </div>
      {description ? <p className="mt-1.5 text-xs text-slate-500">{description}</p> : null}
    </div>
  );
}

