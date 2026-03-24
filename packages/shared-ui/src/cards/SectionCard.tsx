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
    <section className={clsx('rounded-[10px] border border-border/80 bg-white shadow-none', className)}>
      {(title || headerRight) && (
        <div className="flex items-start justify-between gap-3 border-b border-border/70 px-3.5 py-2.5 sm:px-4">
          <div>
            {title ? <h2 className="text-sm font-semibold text-slate-900">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
          </div>
          {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
        </div>
      )}
      <div className="px-3.5 py-3.5 sm:px-4 sm:py-4">{children}</div>
    </section>
  );
}

