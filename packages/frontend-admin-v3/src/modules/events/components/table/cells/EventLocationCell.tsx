export function EventLocationCell({
  cityName,
  venueName,
}: {
  cityName?: string | null;
  venueName?: string | null;
}) {
  return (
    <div className="min-w-0 text-center">
      <div className="truncate">{cityName || '—'}</div>
      <div className="mt-0.5 truncate text-xs text-muted-foreground">{venueName || '—'}</div>
    </div>
  );
}

