import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Circle, Inbox, Loader2, Lock } from 'lucide-react';

/* ---------- PageHeader ---------- */
export function PageHeader({
  title,
  description,
  actions,
  meta,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- FilterBar ---------- */
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">{children}</div>;
}

/* ---------- QuickFilterBar ---------- */
export function QuickFilterBar({
  items,
  activeId,
  onChange,
}: {
  items: { id: string; label: string; count?: number }[];
  activeId?: string;
  onChange?: (id: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      {items.map((it) => {
        const active = it.id === activeId;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange?.(it.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:bg-secondary',
            )}
          >
            <span>{it.label}</span>
            {typeof it.count === 'number' && (
              <span className={cn('rounded px-1 text-[10px]', active ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground')}>
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- DataTableShell ---------- */
export function DataTableShell({
  columns,
  children,
  empty,
  loading,
}: {
  columns: string[];
  children?: ReactNode;
  empty?: ReactNode;
  loading?: boolean;
}) {
  return (
    <Card className="overflow-hidden border-border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
              {columns.map((c) => (
                <th key={c} className="px-4 py-2.5 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      {loading && <LoadingState />}
      {!loading && empty}
    </Card>
  );
}

/* ---------- StatusBadge ---------- */
type Status = 'draft' | 'ready' | 'live' | 'paused' | 'archived' | 'incomplete' | 'error';
const statusStyles: Record<Status, string> = {
  draft: 'bg-muted text-muted-foreground',
  ready: 'bg-info/10 text-info border border-info/20',
  live: 'bg-success/10 text-success border border-success/20',
  paused: 'bg-warning/10 text-warning-foreground border border-warning/30',
  archived: 'bg-muted text-muted-foreground',
  incomplete: 'bg-warning/10 text-warning-foreground border border-warning/30',
  error: 'bg-destructive/10 text-destructive border border-destructive/20',
};
export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize', statusStyles[status])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label ?? status}
    </span>
  );
}

/* ---------- SourceBadge ---------- */
type Source = 'ticketscloud' | 'teplohod' | 'manual';
const sourceLabel: Record<Source, string> = { ticketscloud: 'Ticketscloud', teplohod: 'Teplohod.info', manual: 'Manual' };
export function SourceBadge({ source }: { source: Source }) {
  return (
    <Badge variant="outline" className="gap-1 border-border font-normal text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      {sourceLabel[source]}
    </Badge>
  );
}

/* ---------- ReadinessChecklist ---------- */
export type ChecklistItem = { id: string; label: string; done: boolean; hint?: string };
export function ReadinessChecklist({ title = 'Readiness', items }: { title?: string; items: ChecklistItem[] }) {
  const done = items.filter((i) => i.done).length;
  return (
    <Card className="border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">
          {done}/{items.length}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id} className="flex items-start gap-2 text-sm">
            {it.done ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" /> : <Circle className="mt-0.5 h-4 w-4 text-muted-foreground" />}
            <div className="min-w-0">
              <div className="text-foreground">{it.label}</div>
              {it.hint && <div className="text-xs text-muted-foreground">{it.hint}</div>}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function SeoChecklist({ items }: { items: ChecklistItem[] }) {
  return <ReadinessChecklist title="SEO" items={items} />;
}

/* ---------- ActionPanel ---------- */
export function ActionPanel({ title = 'Actions', children }: { title?: string; children: ReactNode }) {
  return (
    <Card className="border-border p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="flex flex-col gap-2">{children}</div>
    </Card>
  );
}

/* ---------- EmptyState ---------- */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: any;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-sm font-medium text-foreground">{title}</div>
      {description && <div className="max-w-sm text-xs text-muted-foreground">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* ---------- LoadingState ---------- */
export function LoadingState({ label = 'Загрузка…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

/* ---------- AccessDeniedState ---------- */
export function AccessDeniedState({ title = 'Доступ запрещён', description, requestId }: { title?: string; description?: string; requestId?: string | null }) {
  return (
    <Card className="border-border p-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <Lock className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">{title}</div>
          {description ? <div className="mt-1 text-xs text-muted-foreground">{description}</div> : null}
          {requestId ? <div className="mt-2 font-mono text-[11px] text-muted-foreground">requestId: {requestId}</div> : null}
        </div>
      </div>
    </Card>
  );
}

/* ---------- RequestErrorState (retryable) ---------- */
export function RequestErrorState({
  title = 'Ошибка запроса',
  description,
  requestId,
  onRetry,
}: {
  title?: string;
  description?: string;
  requestId?: string | null;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-border p-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">{title}</div>
          {description ? <div className="mt-1 text-xs text-muted-foreground">{description}</div> : null}
          {requestId ? <div className="mt-2 font-mono text-[11px] text-muted-foreground">requestId: {requestId}</div> : null}
          {onRetry ? (
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={onRetry}>
                Повторить
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

/* ---------- ManagedBySource ---------- */
export function ManagedBySource({ source, children }: { source: Source; children: ReactNode }) {
  return (
    <div className="relative rounded-lg border border-dashed border-border bg-surface-locked p-4">
      <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        Managed by source · {sourceLabel[source]}
      </div>
      <div className="pointer-events-none select-text text-sm text-foreground">{children}</div>
    </div>
  );
}

/* ---------- InfoNote ---------- */
export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-info/20 bg-info/5 p-3 text-xs text-foreground">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 text-info" />
      <div>{children}</div>
    </div>
  );
}

