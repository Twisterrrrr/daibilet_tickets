import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}

/**
 * Shared page header: title, subtitle, actions, optional meta.
 */
export function PageHeader({
  title,
  subtitle,
  primaryAction,
  secondaryActions,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <div className={clsx('mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {subtitle ? <p className="text-sm text-slate-500 sm:text-base">{subtitle}</p> : null}
        {meta ? <div className="pt-1 text-xs text-slate-500">{meta}</div> : null}
      </div>
      {(primaryAction || secondaryActions) && (
        <div className="flex flex-wrap items-center gap-2">
          {secondaryActions}
          {primaryAction}
        </div>
      )}
    </div>
  );
}

