import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { api } from '@/shared/api/client';
import { DataTableShell, EmptyState, PageHeader, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Layers, Search as SearchIcon, X } from 'lucide-react';

type Row = {
  id: string;
  title: string;
  status: string;
  placementZone: string;
  pageScopeType: string;
  priority: number | null;
  sortOrder: number | null;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string;
  publishedAt: string | null;
  readinessStatus?: 'READY' | 'EMPTY' | 'SCHEDULED' | 'EXPIRED' | 'INACTIVE' | 'MISCONFIGURED' | string;
  city?: { id: string; name: string; slug: string } | null;
  landing?: { id: string; title: string; slug: string; city?: { slug: string; name: string } | null } | null;
  collection?: { id: string; title: string; slug: string } | null;
  article?: { id: string; title: string; slug: string } | null;
  targetType: string;
  targetEvent?: { id: string; title: string; slug: string; isActive: boolean; isDeleted: boolean } | null;
  targetCollection?: { id: string; title: string; slug: string; status: string; isActive: boolean; isDeleted: boolean } | null;
  targetLanding?: { id: string; title: string; slug: string; status: string; isActive: boolean; isDeleted: boolean; city?: { slug: string; name: string } | null } | null;
  targetArticle?: { id: string; title: string; slug: string; status: string; publishedAt: string | null } | null;
};

type Paginated<T> = { items: T[]; total: number; page: number; limit: number };

function badgeFromStatus(status: string): 'draft' | 'ready' | 'live' | 'paused' | 'incomplete' | 'error' {
  const s = (status ?? '').toUpperCase();
  if (s.includes('DRAFT')) return 'draft';
  if (s.includes('PUBLISHED')) return 'live';
  if (s.includes('ARCHIVE')) return 'paused';
  return 'ready';
}

export function PromoPlacementBlocksPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const status = params.get('status') ?? 'all';
  const placementZone = params.get('placementZone') ?? 'all';
  const pageScopeType = params.get('pageScopeType') ?? 'all';
  const targetType = params.get('targetType') ?? 'all';
  const readiness = params.get('readiness') ?? 'all';
  const seoOnly = params.get('seoOnly') ?? '0';

  const update = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (!v || v === 'all') next.delete(k);
    else next.set(k, v);
    setParams(next, { replace: true });
  };
  const reset = () => setParams(new URLSearchParams(), { replace: true });

  const [data, setData] = React.useState<Paginated<Row> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const qs = new URLSearchParams();
        qs.set('page', '1');
        qs.set('limit', '50');
        if (q.trim()) qs.set('search', q.trim());
        if (status !== 'all') qs.set('status', status);
        if (placementZone !== 'all') qs.set('placementZone', placementZone);
        if (pageScopeType !== 'all') qs.set('pageScopeType', pageScopeType);
        if (targetType !== 'all') qs.set('targetType', targetType);
        if (readiness !== 'all') qs.set('readiness', readiness);
        if (seoOnly === '1') qs.set('seoOnly', '1');
        const res = await api<Paginated<Row>>(`/admin/promo-placement-blocks?${qs.toString()}`);
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
  }, [q, status, placementZone, pageScopeType, targetType, readiness, seoOnly]);

  const rows = data?.items ?? [];
  const showEmpty = !loading && !error && data !== null && rows.length === 0;

  return (
    <>
      <PageHeader
        title="Promo placement blocks"
        description="Контрольная плоскость промо-размещений (storefront). Сейчас: read-only."
        actions={
          <Button size="sm" variant="outline" disabled>
            Создать (later)
          </Button>
        }
      />

      <Card className="mb-3 border-border p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative w-full lg:w-80">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => update('q', e.target.value)} placeholder="Поиск: title/customTitle" className="h-9 border-border bg-background pl-8 text-sm" />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Status:</span>
            {['all', 'DRAFT', 'PUBLISHED', 'ARCHIVED'].map((v) => (
              <button key={v} type="button" className={`rounded border px-2 py-1 ${status === v ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('status', v === 'all' ? 'all' : v)}>
                {v.toLowerCase()}
              </button>
            ))}

            <span className="ml-2">Readiness:</span>
            {['all', 'READY', 'EMPTY', 'SCHEDULED', 'EXPIRED', 'INACTIVE', 'MISCONFIGURED'].map((v) => (
              <button key={v} type="button" className={`rounded border px-2 py-1 ${readiness === v ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('readiness', v === 'all' ? 'all' : v)}>
                {v.toLowerCase()}
              </button>
            ))}

            <span className="ml-2">SEO-only:</span>
            <button type="button" className={`rounded border px-2 py-1 ${seoOnly === '0' ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('seoOnly', '0')}>
              off
            </button>
            <button type="button" className={`rounded border px-2 py-1 ${seoOnly === '1' ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('seoOnly', '1')}>
              on
            </button>

            {q || status !== 'all' || placementZone !== 'all' || pageScopeType !== 'all' || targetType !== 'all' || readiness !== 'all' || seoOnly !== '0' ? (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={reset}>
                <X className="mr-1 h-3.5 w-3.5" /> Сбросить
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      {error ? <div className="mb-3 text-sm text-destructive">{error}</div> : null}

      <DataTableShell
        columns={['Title', 'Scope', 'Zone', 'Target', 'Readiness', 'Status']}
        loading={loading}
        empty={showEmpty ? <EmptyState icon={Layers} title="Блоков нет" description="Список пуст или фильтры слишком строгие." /> : null}
      >
        {rows.map((r) => {
          const scopeLabel =
            r.pageScopeType === 'GLOBAL'
              ? 'global'
              : r.pageScopeType === 'CITY'
                ? `city:${r.city?.slug ?? '—'}`
                : r.pageScopeType === 'LANDING'
                  ? `landing:${r.landing?.slug ?? '—'}`
                  : r.pageScopeType === 'COLLECTION'
                    ? `collection:${r.collection?.slug ?? '—'}`
                    : r.pageScopeType === 'ARTICLE'
                      ? `article:${r.article?.slug ?? '—'}`
                      : r.pageScopeType;

          const targetLabel =
            r.targetType === 'EVENT'
              ? `event:${r.targetEvent?.slug ?? '—'}`
              : r.targetType === 'COLLECTION'
                ? `collection:${r.targetCollection?.slug ?? '—'}`
                : r.targetType === 'LANDING'
                  ? `landing:${r.targetLanding?.slug ?? '—'}`
                  : r.targetType === 'ARTICLE'
                    ? `article:${r.targetArticle?.slug ?? '—'}`
                    : r.targetType;

          return (
            <tr key={r.id} className="border-b border-border/60 hover:bg-secondary/40">
              <td className="px-4 py-3">
                <Link to={`/admin-v4/promo-placement-blocks/${r.id}`} className="font-medium hover:underline">
                  {r.title}
                </Link>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">{r.id}</div>
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                  {scopeLabel}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                  {r.placementZone}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                  {targetLabel}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                  {r.readinessStatus ?? '—'}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={badgeFromStatus(r.status)} label={r.status} />
              </td>
            </tr>
          );
        })}
      </DataTableShell>
    </>
  );
}

