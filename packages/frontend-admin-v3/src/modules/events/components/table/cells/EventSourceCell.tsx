import { Badge } from '@/components/ui/badge';

function label(source: string | null | undefined): string {
  const s = String(source || '').toUpperCase();
  if (s === 'TICKETSCLOUD') return 'TC';
  if (s === 'TEPLOHOD') return 'TEP';
  if (!s || s === 'MANUAL') return '—';
  return s;
}

export function EventSourceCell({
  source,
  supplierName,
}: {
  source?: string | null;
  /** Оператор события (если задан) */
  supplierName?: string | null;
}) {
  const l = label(source);
  return (
    <div className="flex flex-col items-center gap-1">
      {l === '—' ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <Badge variant="outline" className="font-mono text-[11px]">
          {l}
        </Badge>
      )}
      {supplierName ? (
        <span className="max-w-[140px] truncate text-[11px] text-muted-foreground" title={supplierName}>
          {supplierName}
        </span>
      ) : null}
    </div>
  );
}

