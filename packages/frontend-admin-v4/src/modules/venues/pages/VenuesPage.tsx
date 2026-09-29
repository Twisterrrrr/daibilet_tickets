import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { DataTableShell, EmptyState, PageHeader, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Building2, Search as SearchIcon, X } from 'lucide-react';

import { listVenues } from '@/modules/venues/api/venues';
import type { Paginated, VenueListItemDto, VenueTypeUi } from '@/modules/venues/types';
import { VENUE_TYPES, venueTypeLabel } from '@/lib/venueTypes';
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue';

function statusFromVenue(row: VenueListItemDto): 'draft' | 'ready' | 'live' | 'paused' | 'incomplete' | 'error' {
  if (row.lifecycleStatus === 'DRAFT') return 'draft';
  if (row.isPublished) return 'live';
  if (row.readinessStatus === 'READY') return 'ready';
  if (row.readinessStatus === 'NEEDS_WORK') return 'incomplete';
  return 'paused';
}

function venueLifecycleLabelRu(s?: string | null): string {
  const u = String(s ?? '')
    .trim()
    .toUpperCase();
  if (!u) return '—';
  if (u === 'DRAFT') return 'Черновик';
  if (u === 'PUBLISHED' || u === 'PUBLISH' || u === 'LIVE' || u === 'ACTIVE') return 'Опубликовано';
  if (u === 'ARCHIVED') return 'Архив';
  return String(s);
}

function readinessLabelRu(s?: string | null): string {
  const u = String(s ?? '')
    .trim()
    .toUpperCase();
  if (!u) return '—';
  if (u === 'READY') return 'Готово';
  if (u === 'NEEDS_WORK') return 'Нужна доработка';
  if (u === 'BLOCKED') return 'Заблокировано';
  return String(s);
}

export function VenuesPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const venueType = params.get('venueType') ?? 'all';

  const update = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (!v || v === 'all') next.delete(k);
    else next.set(k, v);
    setParams(next, { replace: true });
  };

  const reset = () => setParams(new URLSearchParams(), { replace: true });

  const [data, setData] = React.useState<Paginated<VenueListItemDto> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const debouncedQ = useDebouncedValue(q, 350);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await listVenues({
          page: 1,
          limit: 50,
          search: debouncedQ.trim() ? debouncedQ.trim() : undefined,
          venueType: venueType !== 'all' ? (venueType as VenueTypeUi) : undefined,
          lite: true,
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
  }, [debouncedQ, venueType]);

  const rows = data?.items ?? [];
  const showEmpty = !loading && !error && data !== null && rows.length === 0;

  return (
    <>
      <PageHeader
        title="Площадки"
        description="Сущности каталога и SEO-хабы. Каждая площадка — контентная страница, ловящая брендовый спрос."
        actions={
          <Button size="sm" variant="outline" disabled>
            Новая площадка (later)
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
              placeholder="Поиск по названию, городу, адресу…"
              className="h-9 border-border bg-background pl-8 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Тип:</span>
            <button type="button" className={`rounded border px-2 py-1 ${venueType === 'all' ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('venueType', 'all')}>
              Все
            </button>
            {VENUE_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`rounded border px-2 py-1 ${venueType === t.id ? 'bg-secondary' : 'border-border hover:bg-secondary'}`}
                onClick={() => update('venueType', t.id)}
              >
                {t.label}
              </button>
            ))}
            {(q || venueType !== 'all') && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={reset}>
                <X className="mr-1 h-3.5 w-3.5" /> Сбросить
              </Button>
            )}
          </div>
        </div>
      </Card>

      {error ? <div className="mb-3 text-sm text-destructive">{error}</div> : null}

      <DataTableShell
        columns={['Название', 'Тип', 'Город', 'Адрес', 'Событий', 'Статус', 'Готовность']}
        loading={loading}
        empty={
          showEmpty ? (
            <EmptyState icon={Building2} title="Площадок не найдено" description="Измените фильтры или проверьте, что каталог синхронизирован." />
          ) : null
        }
      >
        {rows.map((v) => (
          <tr key={v.id} className="border-b border-border/60 hover:bg-secondary/40">
            <td className="px-4 py-3">
              <Link to={`/admin-v4/venues/${v.id}`} className="font-medium hover:underline">
                {v.title}
              </Link>
              {v.slug ? <div className="mt-1 font-mono text-[11px] text-muted-foreground">{v.slug}</div> : null}
            </td>
            <td className="px-4 py-3">
              <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                {venueTypeLabel(v.venueType)}
              </Badge>
            </td>
            <td className="px-4 py-3 text-sm text-muted-foreground">{v.city?.name ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-muted-foreground">{v.displayAddress ?? '—'}</td>
            <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{v.eventsCount ?? '—'}</td>
            <td className="px-4 py-3">
              <StatusBadge status={statusFromVenue(v)} label={venueLifecycleLabelRu(v.lifecycleStatus)} />
            </td>
            <td className="px-4 py-3 text-xs text-muted-foreground">{readinessLabelRu(v.readinessStatus)}</td>
          </tr>
        ))}
      </DataTableShell>
    </>
  );
}

