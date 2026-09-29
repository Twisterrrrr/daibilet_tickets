import * as React from 'react';
import { Link, useParams } from 'react-router-dom';

import { api } from '@/shared/api/client';
import { DataTableShell, EmptyState, PageHeader, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LayoutTemplate, Layers } from 'lucide-react';

type LandingChild = {
  id: string;
  slug: string;
  title: string;
  status?: string | null;
  isActive?: boolean | null;
  landingType?: string | null;
  city?: { slug: string; name: string } | null;
};

type LandingDetail = {
  id: string;
  slug: string;
  title: string;
  status?: string | null;
  isActive?: boolean | null;
  isIndexable?: boolean | null;
  landingType?: string | null;
  city?: { slug: string; name: string } | null;
  canonicalUrl?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  contentBlocks?: unknown[];
  childLandings?: LandingChild[];
  hubReadiness?: Record<string, unknown>;
};

function statusFromLanding(r: LandingDetail): 'draft' | 'ready' | 'live' | 'paused' | 'incomplete' | 'error' {
  const s = (r.status ?? '').toUpperCase();
  if (s.includes('DRAFT')) return 'draft';
  if (s.includes('ACTIVE') || r.isActive) return 'live';
  if (s.includes('PAUSED')) return 'paused';
  return 'ready';
}

export function LandingDetailPage() {
  const { id = '' } = useParams();

  const [data, setData] = React.useState<LandingDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const res = await api<LandingDetail>(`/admin/landings/${id}`);
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

  const l = data;
  const blocksCount = l?.contentBlocks?.length ?? 0;
  const child = l?.childLandings ?? [];
  const seoOk = Boolean((l?.metaTitle ?? '').trim() && (l?.metaDescription ?? '').trim());

  return (
    <>
      <PageHeader
        title={l ? l.title : 'Лендинг'}
        description={l ? l.slug : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/admin-v4/landings">Назад к списку</Link>
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
          {l ? <StatusBadge status={statusFromLanding(l)} label={l.status ?? undefined} /> : null}
          <Badge variant="outline" className="border-border font-normal text-muted-foreground">
            id: <span className="ml-1 font-mono">{id}</span>
          </Badge>
          {l?.city ? (
            <Badge variant="outline" className="border-border font-normal text-muted-foreground">
              city: {l.city.name}
            </Badge>
          ) : null}
          {l?.landingType ? (
            <Badge variant="outline" className="border-border font-normal text-muted-foreground">
              {l.landingType}
            </Badge>
          ) : null}
          {l?.isIndexable != null ? (
            <Badge variant="outline" className="border-border font-normal text-muted-foreground">
              indexable: {l.isIndexable ? 'yes' : 'no'}
            </Badge>
          ) : null}
          <Badge variant="outline" className={`border-border font-normal ${seoOk ? 'text-muted-foreground' : 'text-warning-foreground border-warning/30 bg-warning/10'}`}>
            seo: {seoOk ? 'ok' : 'missing'}
          </Badge>
          <Badge variant="outline" className="border-border font-normal text-muted-foreground">
            blocks: {blocksCount}
          </Badge>
          {l?.canonicalUrl ? (
            <Badge variant="outline" className="border-border font-normal text-muted-foreground">
              canonical: {l.canonicalUrl}
            </Badge>
          ) : null}
        </div>
      </Card>

      <Card className="border-border">
        <DataTableShell
          columns={['Child landing', 'Город', 'Тип', 'Статус']}
          loading={loading}
          empty={!loading && !error && l && child.length === 0 ? <EmptyState icon={LayoutTemplate} title="Дочерних лендингов нет" description="Для MULTI_CITY здесь появятся child landing pages." /> : null}
        >
          {child.map((c) => (
            <tr key={c.id} className="border-b border-border/60 hover:bg-secondary/40">
              <td className="px-4 py-3">
                <Link to={`/admin-v4/landings/${c.id}`} className="font-medium hover:underline">
                  {c.title}
                </Link>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">{c.slug}</div>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{c.city?.name ?? '—'}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{c.landingType ?? '—'}</td>
              <td className="px-4 py-3">
                <StatusBadge status={(c.isActive ? 'live' : 'draft') as any} label={c.status ?? undefined} />
              </td>
            </tr>
          ))}
        </DataTableShell>
      </Card>
    </>
  );
}

