import * as React from 'react';
import { Link, useParams } from 'react-router-dom';

import { DataTableShell, EmptyState, PageHeader, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Layers } from 'lucide-react';
import { getCollection } from '@/modules/collections/api/collections';
import type { CollectionDetailDto } from '@/modules/collections/types';

function statusFromCollection(r: CollectionDetailDto): 'draft' | 'ready' | 'live' | 'paused' | 'incomplete' | 'error' {
  const s = (r.status ?? '').toUpperCase();
  if (s.includes('DRAFT')) return 'draft';
  if (s.includes('ACTIVE')) return 'live';
  if (s.includes('ARCHIVE')) return 'paused';
  if (s.includes('REJECT')) return 'error';
  return 'ready';
}

export function CollectionDetailPage() {
  const { id = '' } = useParams();

  const [data, setData] = React.useState<CollectionDetailDto | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const res = await getCollection(id);
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
  }, [id]);

  const c = data;
  const items = c?.items ?? [];
  const tags = c?.tagFilters?.map((t) => t.tag.slug) ?? c?.filterTags ?? [];

  return (
    <>
      <PageHeader
        title={c ? c.title : 'Коллекция'}
        description={c ? c.slug : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/admin-v4/collections">Назад к списку</Link>
            </Button>
            <Button size="sm" disabled>
              Редактировать (later)
            </Button>
          </div>
        }
      />

      {error ? <div className="mb-3 text-sm text-destructive">{error}</div> : null}

      <Card className="mb-3 border-border p-4">
        <div className="flex flex-wrap items-center gap-2">
          {c ? <StatusBadge status={statusFromCollection(c)} label={c.status ?? undefined} /> : null}
          <Badge variant="outline" className="border-border font-normal text-muted-foreground">
            id: <span className="ml-1 font-mono">{id}</span>
          </Badge>
          {c?.city ? (
            <Badge variant="outline" className="border-border font-normal text-muted-foreground">
              city: {c.city.name}
            </Badge>
          ) : null}
          {c?.sourceType ? (
            <Badge variant="outline" className="border-border font-normal text-muted-foreground">
              source: {c.sourceType}
            </Badge>
          ) : null}
          {c?.selectionBasis ? (
            <Badge variant="outline" className="border-border font-normal text-muted-foreground">
              basis: {c.selectionBasis}
            </Badge>
          ) : null}
          {tags.length ? (
            <Badge variant="outline" className="border-border font-normal text-muted-foreground">
              tags: {tags.slice(0, 6).join(', ')}
              {tags.length > 6 ? ` +${tags.length - 6}` : ''}
            </Badge>
          ) : null}
        </div>
      </Card>

      <DataTableShell
        columns={['Событие', 'Город', 'Источник', 'Цена', 'Active']}
        loading={loading}
        empty={!loading && !error && c && items.length === 0 ? <EmptyState icon={Layers} title="Items пустые" description="В коллекции пока нет событий." /> : null}
      >
        {items.map((it) => (
          <tr key={it.id} className="border-b border-border/60 hover:bg-secondary/40">
            <td className="px-4 py-3">
              {it.event ? (
                <>
                  <div className="font-medium">{it.event.title}</div>
                  <div className="mt-1 font-mono text-[11px] text-muted-foreground">{it.event.slug}</div>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </td>
            <td className="px-4 py-3 text-sm text-muted-foreground">{it.event?.city?.name ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-muted-foreground">{it.event?.source ?? '—'}</td>
            <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{it.event?.priceFrom ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-muted-foreground">{it.event?.isActive ? 'yes' : 'no'}</td>
          </tr>
        ))}
      </DataTableShell>
    </>
  );
}

