import { cn } from '@/shared/lib/cn';
import type { ReactNode } from 'react';

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
  meta?: ReactNode;
  actions?: ReactNode;
  glyph?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="flex min-w-0 gap-4 sm:items-start sm:gap-5">
        {glyph ? <div className="shrink-0 pt-0.5">{glyph}</div> : null}
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle ? <p className="max-w-2xl text-sm text-muted-foreground">{subtitle}</p> : null}
          {meta ? <div className="pt-1 text-xs text-muted-foreground">{meta}</div> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pt-1">{actions}</div> : null}
    </header>
  );
}

