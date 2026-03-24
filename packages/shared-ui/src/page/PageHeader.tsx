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
    <div className={clsx('mb-4 space-y-2.5 sm:mb-5', className)}>
      {breadcrumbs ? <div className="text-xs text-muted-foreground">{breadcrumbs}</div> : null}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
          {subtitle ? <div className="text-sm text-muted-foreground">{subtitle}</div> : null}
          {meta ? <div className="pt-0.5 text-xs text-muted-foreground">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center justify-end gap-1.5">{actions}</div> : null}
      </div>
    </div>
  );
}

