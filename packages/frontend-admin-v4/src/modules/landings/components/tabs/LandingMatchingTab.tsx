import * as React from 'react';
import { Link } from 'react-router-dom';

import { DataTableShell, EmptyState } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getLandingResolvedEvents } from '@/modules/landings/api/landings';
import type { LandingResolvedEventsDto } from '@/modules/landings/types';
import { CalendarClock, Hash } from 'lucide-react';

export type LandingMatchingTabProps = {
  landingId: string;
};

export function LandingMatchingTab(props: LandingMatchingTabProps) {
  const { landingId } = props;
  const [data, setData] = React.useState<LandingResolvedEventsDto | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!landingId) return;
      setLoading(true);
      setError('');
      try {
        const res = await getLandingResolvedEvents(landingId);
        if (!cancelled) setData(res);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [landingId]);

  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const empty = !loading && !error && total === 0;

  return (
    <Card className="border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Подбор событий (resolved)</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-mono">GET /admin/landings/:id/resolved-events</span> — выдача по фильтрам лендинга (CITY: этот город; MULTI_CITY: объединение дочерних).
          </div>
        </div>
        <Badge variant="outline" className="border-border font-mono font-normal">
          total: {loading ? '…' : total}
        </Badge>
      </div>

      {error ? <div className="mt-3 text-sm text-destructive">{error}</div> : null}

      <div className="mt-3">
        <DataTableShell
          columns={['Событие', 'Город', 'Цена от', 'Ближайшая сессия']}
          loading={loading}
          empty={empty ? <EmptyState icon={Hash} title="Событий не найдено" description="Проверьте filterTag, город и сезонные фильтры лендинга." /> : null}
        >
          {items.map((e) => (
            <tr key={e.id} className="border-b border-border/60 hover:bg-secondary/40">
              <td className="px-4 py-3">
                <Link to={`/admin-v4/events/${e.id}`} className="font-medium hover:underline">
                  {e.title}
                </Link>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">{e.slug ?? '—'}</div>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{e.city?.name ?? '—'}</td>
              <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{e.priceFrom ?? '—'}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {e.nextSessionAt ? (
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {new Date(e.nextSessionAt).toLocaleString('ru-RU')}
                  </span>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </DataTableShell>
      </div>
    </Card>
  );
}
