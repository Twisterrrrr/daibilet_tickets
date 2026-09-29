import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { DataTableShell, EmptyState, PageHeader, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MapPin, Search as SearchIcon, X } from 'lucide-react';
import { listCities } from '@/modules/cities/api/cities';
import type { CityListItemDto, Paginated } from '@/modules/cities/types';
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue';

function statusFromCity(row: CityListItemDto): 'draft' | 'ready' | 'live' | 'paused' | 'incomplete' | 'error' {
  if (!row.isActive) return 'draft';
  if (row.readinessStatus === 'READY') return 'live';
  if (row.readinessStatus === 'NEEDS_WORK') return 'incomplete';
  if (row.readinessStatus === 'BLOCKED') return 'error';
  return 'paused';
}

export function CitiesPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';

  const update = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (!v) next.delete(k);
    else next.set(k, v);
    setParams(next, { replace: true });
  };
  const reset = () => setParams(new URLSearchParams(), { replace: true });

  const [data, setData] = React.useState<Paginated<CityListItemDto> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const debouncedQ = useDebouncedValue(q, 350);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await listCities({ page: 1, limit: 50, search: debouncedQ.trim() ? debouncedQ.trim() : undefined });
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
  }, [debouncedQ]);

  const rows = data?.items ?? [];
  const showEmpty = !loading && !error && data !== null && rows.length === 0;

  return (
    <>
      <PageHeader
        title="Города"
        description="Хабы спроса. Каждый город — редакционная поверхность, которая ловит интент уровня города."
        actions={
          <Button size="sm" variant="outline" disabled>
            Новый город (later)
          </Button>
        }
      />

      <Card className="mb-3 border-border p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative w-full lg:w-96">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => update('q', e.target.value)}
              placeholder="Поиск городов…"
              className="h-9 border-border bg-background pl-8 text-sm"
            />
          </div>
          {q ? (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={reset}>
              <X className="mr-1 h-3.5 w-3.5" /> Сбросить
            </Button>
          ) : null}
        </div>
      </Card>

      {error ? <div className="mb-3 text-sm text-destructive">{error}</div> : null}

      <DataTableShell
        columns={['Город', 'Статус', 'Событий', 'Площадок', 'Лендингов', 'SEO']}
        loading={loading}
        empty={
          showEmpty ? (
            <EmptyState
              icon={MapPin}
              title="Города не найдены"
              description="Измените поиск или проверьте, что каталог синхронизирован."
            />
          ) : null
        }
      >
        {rows.map((c) => (
          <tr key={c.id} className="border-b border-border/60 hover:bg-secondary/40">
            <td className="px-4 py-3">
              <Link to={`/admin-v4/cities/${c.id}`} className="font-medium hover:underline">
                {c.name}
              </Link>
              <div className="mt-1 font-mono text-[11px] text-muted-foreground">{c.slug}</div>
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={statusFromCity(c)} label={c.isActive ? 'опубликован' : 'черновик'} />
            </td>
            <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{c.stats?.eventsCount ?? '—'}</td>
            <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{c.stats?.venuesCount ?? '—'}</td>
            <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{c.stats?.landingsCount ?? '—'}</td>
            <td className="px-4 py-3">
              <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                {c.flags?.hasSeo ? 'ok' : 'missing'}
              </Badge>
            </td>
          </tr>
        ))}
      </DataTableShell>
    </>
  );
}

