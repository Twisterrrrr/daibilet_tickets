import type { ReactNode } from 'react';

/** Секция в духе Admin V2 `SectionCard`: заголовок, описание, опциональный слот справа */
export function DashboardSectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-card p-5 shadow-soft">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-section tracking-tight text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-small text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </div>
  );
}
