import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { DataTableShell, EmptyState, PageHeader, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Layers, Search as SearchIcon, X } from 'lucide-react';
import { listCollections } from '@/modules/collections/api/collections';
import type { CollectionListItemDto, Paginated } from '@/modules/collections/types';
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue';

function statusFromCollection(r: CollectionListItemDto): 'draft' | 'ready' | 'live' | 'paused' | 'incomplete' | 'error' {
  const s = (r.status ?? '').toUpperCase();
  if (s.includes('DRAFT')) return 'draft';
  if (s.includes('ACTIVE')) return 'live';
  if (s.includes('ARCHIVE')) return 'paused';
  if (s.includes('REJECT')) return 'error';
  return 'ready';
}

export function CollectionsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const status = params.get('status') ?? 'all';
  const city = params.get('city') ?? 'all';

  const update = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (!v || v === 'all') next.delete(k);
    else next.set(k, v);
    setParams(next, { replace: true });
  };
  const reset = () => setParams(new URLSearchParams(), { replace: true });

  const [data, setData] = React.useState<Paginated<CollectionListItemDto> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const debouncedQ = useDebouncedValue(q, 350);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await listCollections({
          page: 1,
          limit: 50,
          search: debouncedQ.trim() ? debouncedQ.trim() : undefined,
          status: status !== 'all' ? status : undefined,
          city: city !== 'all' ? city : undefined,
        });
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
  }, [debouncedQ, status, city]);

  const rows = data?.items ?? [];
  const showEmpty = !loading && !error && data !== null && rows.length === 0;

  return (
    <>
      <PageHeader
        title="Коллекции"
        description="Редакторские подборки событий — отдельный контентный слой поверх таксономии."
        actions={
          <Button size="sm" variant="outline" disabled>
            Создать коллекцию (later)
          </Button>
        }
      />

      <Card className="mb-3 border-border p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative w-full lg:w-96">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => update('q', e.target.value)} placeholder="Поиск по названию / slug" className="h-9 border-border bg-background pl-8 text-sm" />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Статус:</span>
            <button type="button" className={`rounded border px-2 py-1 ${status === 'all' ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('status', 'all')}>
              all
            </button>
            <button type="button" className={`rounded border px-2 py-1 ${status === 'DRAFT' ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('status', 'DRAFT')}>
              draft
            </button>
            <button type="button" className={`rounded border px-2 py-1 ${status === 'ACTIVE' ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('status', 'ACTIVE')}>
              active
            </button>
            {(q || status !== 'all' || city !== 'all') && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={reset}>
                <X className="mr-1 h-3.5 w-3.5" /> Сбросить
              </Button>
            )}
          </div>
        </div>
      </Card>

      {error ? <div className="mb-3 text-sm text-destructive">{error}</div> : null}

      <DataTableShell
        columns={['Название', 'URL', 'Город', 'Items', 'Статус']}
        loading={loading}
        empty={showEmpty ? <EmptyState icon={Layers} title="Коллекции не найдены" description="Измените фильтры или создайте коллекцию." /> : null}
      >
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-border/60 hover:bg-secondary/40">
            <td className="px-4 py-3">
              <Link to={`/admin-v4/collections/${r.id}`} className="font-medium hover:underline">
                {r.title}
              </Link>
              <div className="mt-1 text-[11px] text-muted-foreground">
                <span className="font-mono">{r.sourceType ?? '—'}</span>
                {r.selectionBasis ? <span> · {r.selectionBasis}</span> : null}
              </div>
            </td>
            <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{r.slug}</td>
            <td className="px-4 py-3 text-sm text-muted-foreground">{r.city?.name ?? '—'}</td>
            <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{r.itemsCount ?? '—'}</td>
            <td className="px-4 py-3">
              <StatusBadge status={statusFromCollection(r)} label={r.status ?? undefined} />
            </td>
          </tr>
        ))}
      </DataTableShell>
    </>
  );
}

