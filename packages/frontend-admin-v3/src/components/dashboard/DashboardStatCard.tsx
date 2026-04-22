import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

/** Карточка метрики как в Admin V2 `StatCard`: подпись, крупное значение, подсказка, иконка справа */
export function DashboardStatCard({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/80 bg-card px-5 py-5 shadow-soft transition-shadow hover:shadow-md',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-small font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-h2 tabular-nums text-foreground">{value}</p>
          {hint ? <p className="mt-2 text-small text-muted-foreground">{hint}</p> : null}
        </div>
        {icon ? <div className="shrink-0 text-muted-foreground/45 [&_svg]:h-5 [&_svg]:w-5">{icon}</div> : null}
      </div>
    </div>
  );
}
