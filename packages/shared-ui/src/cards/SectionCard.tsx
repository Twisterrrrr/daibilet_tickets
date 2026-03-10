import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface SectionCardProps {
  title?: ReactNode;
  description?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, description, headerRight, children, className }: SectionCardProps) {
  return (
    <section className={clsx('rounded-xl border bg-white shadow-sm', className)}>
      {(title || headerRight) && (
        <div className="flex items-start justify-between gap-4 border-b px-4 py-3">
          <div>
            {title ? <h2 className="text-sm font-semibold text-slate-900">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
          </div>
          {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
        </div>
      )}
      <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </section>
  );
}

