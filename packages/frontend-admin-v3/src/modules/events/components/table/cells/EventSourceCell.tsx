import { Badge } from '@/components/ui/badge';

function label(source: string | null | undefined): string {
  const s = String(source || '').toUpperCase();
  if (s === 'TICKETSCLOUD') return 'TC';
  if (s === 'TEPLOHOD') return 'TEP';
  if (!s || s === 'MANUAL') return '—';
  return s;
}

export function EventSourceCell({ source }: { source?: string | null }) {
  const l = label(source);
  if (l === '—') return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant="outline" className="font-mono text-[11px]">
      {l}
    </Badge>
  );
}

