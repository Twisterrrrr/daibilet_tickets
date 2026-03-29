import type { LucideIcon } from 'lucide-react';
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
  /** Крупная пастельная пиктограмма слева — как в admin-v2 */
  glyph?: ReactNode;
  className?: string;
}) {
  const hasSubheader = Boolean(subtitle || meta);

  return (
    <header
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:justify-between',
        hasSubheader ? 'sm:items-start' : 'sm:items-center',
        className,
      )}
    >
      <div
        className={cn(
          'flex min-w-0 gap-4 sm:gap-5',
          hasSubheader ? 'sm:items-start' : 'sm:items-center',
        )}
      >
        {glyph ? (
          <div className={cn('shrink-0', hasSubheader ? 'pt-0.5' : undefined)}>{glyph}</div>
        ) : null}
        <div className="min-w-0 space-y-1">
          <h1 className="text-h1 text-text-primary">{title}</h1>
          {subtitle ? <p className="max-w-2xl text-body text-text-secondary">{subtitle}</p> : null}
          {meta ? <div className="pt-1 text-small text-text-muted">{meta}</div> : null}
        </div>
      </div>
      {actions ? (
        <div
          className={cn(
            'flex shrink-0 flex-wrap items-center gap-2',
            hasSubheader ? 'sm:pt-1' : undefined,
          )}
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-card border border-border-soft bg-surface shadow-soft',
        title ? 'p-0' : 'p-6',
        className,
      )}
    >
      {title ? (
        <>
          <div className="border-b border-border-soft px-5 py-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-section text-text-primary">{title}</h2>
                {description ? (
                  <p className="mt-1 max-w-2xl text-small text-text-secondary">{description}</p>
                ) : null}
              </div>
              {action ? <div className="shrink-0">{action}</div> : null}
            </div>
          </div>
          <div className="p-6">{children}</div>
        </>
      ) : (
        children
      )}
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-card border border-border-soft bg-surface px-5 py-5 shadow-soft transition-shadow hover:shadow-soft',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label font-medium text-text-muted">{label}</p>
          <p className="mt-2 text-h2 text-text-primary">{value}</p>
          {hint ? <p className="mt-2 text-small text-text-secondary">{hint}</p> : null}
        </div>
        {icon ? <div className="shrink-0 text-text-muted">{icon}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  compact,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Меньше вертикальных отступов — когда пустое состояние не единственный контент блока */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border-soft bg-surface-alt/50 text-center',
        compact ? 'px-5 py-6' : 'px-8 py-16',
      )}
    >
      {Icon ? (
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border-soft bg-surface text-text-muted">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      ) : null}
      <p className="text-section text-text-primary">{title}</p>
      {description ? <p className="max-w-sm text-small text-text-secondary">{description}</p> : null}
    </div>
  );
}

export function ErrorPanel({
  title,
  description,
  onRetry,
}: {
  title: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-card border border-danger/25 bg-danger-soft px-5 py-4 text-danger shadow-soft">
      <p className="font-medium">{title}</p>
      {description ? <p className="mt-1 text-small opacity-90">{description}</p> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex h-10 items-center rounded-control border border-danger/30 bg-surface px-4 text-label font-medium text-danger transition-colors hover:bg-surface-alt"
        >
          Повторить
        </button>
      ) : null}
    </div>
  );
}

export function LoadingBlock({ label = 'Загрузка…' }: { label?: string }) {
  return (
    <div className="rounded-card border border-border-soft bg-surface px-6 py-12 text-center shadow-soft">
      <div
        className="mx-auto mb-4 h-8 w-8 animate-pulse rounded-full bg-surface-alt"
        aria-hidden
      />
      <p className="text-small text-text-muted">{label}</p>
    </div>
  );
}

export function FilterRow({ children, onReset }: { children: ReactNode; onReset?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-border-soft bg-surface px-4 py-2.5 shadow-soft">
      {children}
      {onReset ? (
        <button
          type="button"
          onClick={onReset}
          className="ml-auto text-label font-medium text-accent hover:underline"
        >
          Сбросить
        </button>
      ) : null}
    </div>
  );
}
