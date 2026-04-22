const TABLE_SKELETON_ROWS = 7;

export function LoadingState({
  label = 'Загрузка…',
  variant = 'card',
}: {
  label?: string;
  /** `table` — скелет под широкую таблицу (списки). */
  variant?: 'card' | 'table';
}) {
  if (variant === 'table') {
    return (
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-4 space-y-0">
          <div className="flex gap-3 border-b border-border/80 pb-3">
            <div className="h-3 w-8 shrink-0 animate-pulse rounded bg-muted" />
            <div className="h-3 min-w-0 flex-1 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 shrink-0 animate-pulse rounded bg-muted" />
            <div className="h-3 w-20 shrink-0 animate-pulse rounded bg-muted" />
          </div>
          {Array.from({ length: TABLE_SKELETON_ROWS }, (_, i) => (
            <div key={i} className="flex gap-3 border-b border-border/40 py-3 last:border-0">
              <div className="h-3 w-8 shrink-0 animate-pulse rounded bg-muted" />
              <div className="h-3 min-w-0 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-3 w-24 shrink-0 animate-pulse rounded bg-muted" />
              <div className="h-3 w-16 shrink-0 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-3 h-2 w-40 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-2 w-64 animate-pulse rounded bg-muted" />
    </div>
  );
}
