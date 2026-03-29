import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

import { Button } from './button';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick?: () => void };
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border-soft bg-surface-alt/50 px-8 py-16 text-center',
        className,
      )}
    >
      {Icon ? (
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border-soft bg-surface text-text-muted">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      ) : null}
      <p className="text-section text-text-primary">{title}</p>
      {description ? <p className="max-w-sm text-small text-text-secondary">{description}</p> : null}
      {action ? (
        <Button type="button" variant="secondary" className="mt-2" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyStateInline({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-border-soft bg-surface-alt/40 px-6 py-8 text-center">
      <p className="text-body text-text-secondary">{title}</p>
      {children}
    </div>
  );
}
