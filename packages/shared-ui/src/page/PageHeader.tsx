import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  breadcrumbs?: ReactNode;
  className?: string;
}

/**
 * Shared page header: title, subtitle, actions, optional meta/breadcrumbs.
 */
export function PageHeader({ title, subtitle, actions, meta, breadcrumbs, className }: PageHeaderProps) {
  return (
    <div className={clsx('mb-6 space-y-3 sm:mb-8', className)}>
      {breadcrumbs ? <div className="text-xs text-slate-500">{breadcrumbs}</div> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
          {subtitle ? <p className="text-sm text-slate-500 sm:text-base">{subtitle}</p> : null}
          {meta ? <div className="pt-1 text-xs text-slate-500">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

