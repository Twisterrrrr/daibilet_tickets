export function LoadingState({ label = 'Загрузка…' }: { label?: string }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-3 h-2 w-40 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-2 w-64 animate-pulse rounded bg-muted" />
    </div>
  );
}

