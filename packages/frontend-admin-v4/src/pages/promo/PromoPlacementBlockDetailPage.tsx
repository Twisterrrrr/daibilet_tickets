import * as React from 'react';
import { Link, useParams } from 'react-router-dom';

import { api } from '@/shared/api/client';
import { DataTableShell, EmptyState, PageHeader, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Layers } from 'lucide-react';

type Block = {
  id: string;
  title: string;
  status: string;
  placementZone: string;
  pageScopeType: string;
  cityId?: string | null;
  landingId?: string | null;
  collectionId?: string | null;
  articleId?: string | null;
  targetType: string;
  targetEventId?: string | null;
  targetCollectionId?: string | null;
  targetLandingId?: string | null;
  targetArticleId?: string | null;
  customTitle?: string | null;
  customSubtitle?: string | null;
  customImageUrl?: string | null;
  ctaLabel?: string | null;
  priority?: number | null;
  sortOrder?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  readinessStatus?: string;
  readinessReasons?: string[];
  rankExplanation?: { primaryOrderingFactor?: string } | null;

  city?: { id: string; name: string; slug: string } | null;
  landing?: { id: string; title: string; slug: string; city?: { slug: string; name: string } | null } | null;
  collection?: { id: string; title: string; slug: string } | null;
  article?: { id: string; title: string; slug: string } | null;
  targetEvent?: { id: string; title: string; slug: string } | null;
  targetCollection?: { id: string; title: string; slug: string } | null;
  targetLanding?: { id: string; title: string; slug: string } | null;
  targetArticle?: { id: string; title: string; slug: string } | null;
};

type PreviewItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  targetType: string;
  targetId: string;
  url?: string | null;
  score?: number | null;
  diagnostics?: Record<string, unknown> | null;
};

type ResolvedPreview = { items: PreviewItem[] };

function badgeFromStatus(status: string): 'draft' | 'ready' | 'live' | 'paused' | 'incomplete' | 'error' {
  const s = (status ?? '').toUpperCase();
  if (s.includes('DRAFT')) return 'draft';
  if (s.includes('PUBLISHED')) return 'live';
  if (s.includes('ARCHIVE')) return 'paused';
  return 'ready';
}

export function PromoPlacementBlockDetailPage() {
  const { id = '' } = useParams();

  const [data, setData] = React.useState<Block | null>(null);
  const [preview, setPreview] = React.useState<ResolvedPreview | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [loadingPreview, setLoadingPreview] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const res = await api<Block>(`/admin/promo-placement-blocks/${id}`);
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

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!data?.id) return;
      // resolved-preview requires explicit pageScopeType + optional scope ids.
      setLoadingPreview(true);
      try {
        const qs = new URLSearchParams();
        qs.set('pageScopeType', data.pageScopeType);
        if (data.cityId) qs.set('cityId', data.cityId);
        if (data.landingId) qs.set('landingId', data.landingId);
        if (data.collectionId) qs.set('collectionId', data.collectionId);
        if (data.articleId) qs.set('articleId', data.articleId);
        qs.set('limit', '10');
        const res = await api<ResolvedPreview>(`/admin/promo-placement-blocks/${data.id}/resolved-preview?${qs.toString()}`);
        if (!cancelled) setPreview(res);
      } catch {
        if (!cancelled) setPreview(null);
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data?.id, data?.pageScopeType, data?.cityId, data?.landingId, data?.collectionId, data?.articleId]);

  const b = data;
  const items = preview?.items ?? [];
  const showEmptyPreview = !loadingPreview && !error && b && items.length === 0;

  const scopeLabel =
    b?.pageScopeType === 'GLOBAL'
      ? 'global'
      : b?.pageScopeType === 'CITY'
        ? `city:${b.city?.slug ?? b.cityId ?? '—'}`
        : b?.pageScopeType === 'LANDING'
          ? `landing:${b.landing?.slug ?? b.landingId ?? '—'}`
          : b?.pageScopeType === 'COLLECTION'
            ? `collection:${b.collection?.slug ?? b.collectionId ?? '—'}`
            : b?.pageScopeType === 'ARTICLE'
              ? `article:${b.article?.slug ?? b.articleId ?? '—'}`
              : b?.pageScopeType ?? '—';

  return (
    <>
      <PageHeader
        title={b ? b.title : 'Promo placement block'}
        description={b ? b.id : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/admin-v4/promo-placement-blocks">Назад к списку</Link>
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
          {b ? <StatusBadge status={badgeFromStatus(b.status)} label={b.status} /> : null}
          {b?.readinessStatus ? (
            <Badge variant="outline" className="border-border font-normal text-muted-foreground">
              readiness: {b.readinessStatus}
            </Badge>
          ) : null}
          <Badge variant="outline" className="border-border font-normal text-muted-foreground">
            scope: {scopeLabel}
          </Badge>
          {b?.placementZone ? (
            <Badge variant="outline" className="border-border font-normal text-muted-foreground">
              zone: {b.placementZone}
            </Badge>
          ) : null}
          {b?.targetType ? (
            <Badge variant="outline" className="border-border font-normal text-muted-foreground">
              target: {b.targetType}
            </Badge>
          ) : null}
          {b?.priority != null ? (
            <Badge variant="outline" className="border-border font-normal text-muted-foreground">
              priority: {b.priority}
            </Badge>
          ) : null}
          {b?.sortOrder != null ? (
            <Badge variant="outline" className="border-border font-normal text-muted-foreground">
              sortOrder: {b.sortOrder}
            </Badge>
          ) : null}
        </div>
        {b?.readinessReasons?.length ? (
          <div className="mt-2 text-xs text-muted-foreground">
            reasons: <span className="font-mono">{b.readinessReasons.join(', ')}</span>
          </div>
        ) : null}
      </Card>

      <Card className="border-border">
        <DataTableShell
          columns={['Resolved preview', 'Target', 'CTA', 'URL']}
          loading={loading || loadingPreview}
          empty={showEmptyPreview ? <EmptyState icon={Layers} title="Preview пустой" description="Для этого контекста нет разрешённого контента или блок не eligible." /> : null}
        >
          {items.map((it) => (
            <tr key={it.id} className="border-b border-border/60 hover:bg-secondary/40">
              <td className="px-4 py-3">
                <div className="font-medium">{it.title}</div>
                {it.subtitle ? <div className="mt-1 text-xs text-muted-foreground">{it.subtitle}</div> : null}
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                  {it.targetType}:{it.targetId}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{it.ctaLabel ?? '—'}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{it.url ?? '—'}</td>
            </tr>
          ))}
        </DataTableShell>
      </Card>
    </>
  );
}

