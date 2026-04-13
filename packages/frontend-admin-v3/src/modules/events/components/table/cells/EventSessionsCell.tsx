export function EventSessionsCell({ count }: { count?: number | null }) {
  if (count === null || count === undefined) return <span className="text-muted-foreground">—</span>;
  return <span className="tabular-nums text-muted-foreground">{count}</span>;
}

