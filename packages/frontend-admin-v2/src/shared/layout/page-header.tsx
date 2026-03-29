import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

export function PageHeader({
  title,
  subtitle,
  actions,
  meta,
  glyph,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  /** Крупная пастельная пиктограмма слева от заголовка */
  glyph?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="flex min-w-0 gap-4 sm:items-start sm:gap-5">
        {glyph ? <div className="shrink-0 pt-0.5">{glyph}</div> : null}
        <div className="min-w-0 space-y-1">
          <h1 className="text-h1 text-text-primary">{title}</h1>
          {subtitle ? <p className="max-w-2xl text-body text-text-secondary">{subtitle}</p> : null}
          {meta ? <div className="pt-1 text-small text-text-muted">{meta}</div> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pt-1">{actions}</div> : null}
    </header>
  );
}
