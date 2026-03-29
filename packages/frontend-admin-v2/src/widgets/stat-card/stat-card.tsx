import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

export function StatCard({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-card border border-border-soft bg-surface px-5 py-5 transition-shadow hover:shadow-soft',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-label text-text-muted">{label}</p>
          <p className="mt-2 text-h2 text-text-primary">{value}</p>
          {hint ? <p className="mt-2 text-small text-text-secondary">{hint}</p> : null}
        </div>
        {icon ? <div className="text-text-muted">{icon}</div> : null}
      </div>
    </div>
  );
}
