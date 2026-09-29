import * as React from 'react';

import { AccessDeniedState, DataTableShell, EmptyState, PageHeader, RequestErrorState, SourceBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { listSourceCategoryMappings, listUnknownSourceCategories } from '@/modules/import-sources/api/source-categories';
import type { SourceCategoryMappingDto, SourceCategoryUnknownDto } from '@/modules/import-sources/types';
import { Inbox } from 'lucide-react';
import { presentRequestError } from '@/shared/api/errors';

export function MappingInboxPage() {
  const [mappings, setMappings] = React.useState<SourceCategoryMappingDto[] | null>(null);
  const [unknowns, setUnknowns] = React.useState<SourceCategoryUnknownDto[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [m, u] = await Promise.all([listSourceCategoryMappings(), listUnknownSourceCategories()]);
        if (cancelled) return;
        setMappings(m);
        setUnknowns(u);
      } catch (e: unknown) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const showEmptyMappings = !loading && !error && mappings !== null && mappings.length === 0;
  const showEmptyUnknowns = !loading && !error && unknowns !== null && unknowns.length === 0;
  const unknownHits = (unknowns ?? []).reduce((acc, r) => acc + (r.hits ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Очередь маппинга"
        description="Read-only: правила маппинга категорий внешних источников и неизвестные категории."
        actions={
          <Button size="sm" variant="outline" disabled>
            Править правила (later)
          </Button>
        }
      />

      {!loading && error ? (
        <div className="mb-3">
          {(() => {
            const p = presentRequestError(error);
            if (p.kind === 'access_denied') return <AccessDeniedState description={p.message} requestId={p.requestId} />;
            return <RequestErrorState title={p.title} description={p.message} requestId={p.requestId} onRetry={() => setReloadKey((x) => x + 1)} />;
          })()}
        </div>
      ) : null}

      <div className="mb-3 grid gap-3 lg:grid-cols-3">
        <Card className="border-border p-4">
          <div className="text-xs text-muted-foreground">Правил</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{mappings?.length ?? '—'}</div>
        </Card>
        <Card className="border-border p-4">
          <div className="text-xs text-muted-foreground">Unknown categories</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{unknowns?.length ?? '—'}</div>
        </Card>
        <Card className="border-border p-4">
          <div className="text-xs text-muted-foreground">Unknown hits (sum)</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{unknowns ? unknownHits : '—'}</div>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="border-border">
          <DataTableShell
            columns={['Источник', 'externalCategoryNorm', 'internalCategory', 'updatedAt']}
            loading={loading}
            empty={showEmptyMappings ? <EmptyState icon={Inbox} title="Правил маппинга нет" description="В системе ещё не заведены правила для источников." /> : null}
          >
            {(mappings ?? []).map((r) => (
              <tr key={r.id} className="border-b border-border/60 hover:bg-secondary/40">
                <td className="px-4 py-3">
                  <SourceBadge source={(r.source ?? 'unknown').toLowerCase() as any} />
                </td>
                <td className="px-4 py-3 font-mono text-xs">{r.externalCategoryNorm}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{r.internalCategory}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.updatedAt).toLocaleString('ru-RU')}</td>
              </tr>
            ))}
          </DataTableShell>
        </Card>

        <Card className="border-border">
          <DataTableShell
            columns={['Источник', 'externalCategoryRaw', 'externalCategoryNorm', 'hits', 'lastSeenAt']}
            loading={loading}
            empty={showEmptyUnknowns ? <EmptyState icon={Inbox} title="Неизвестных категорий нет" description="Все категории внешних источников распознаны или замапплены." /> : null}
          >
            {(unknowns ?? []).map((r) => (
              <tr key={r.id} className="border-b border-border/60 hover:bg-secondary/40">
                <td className="px-4 py-3">
                  <SourceBadge source={(r.source ?? 'unknown').toLowerCase() as any} />
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                    {r.externalCategoryRaw}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{r.externalCategoryNorm}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{r.hits}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.lastSeenAt).toLocaleString('ru-RU')}</td>
              </tr>
            ))}
          </DataTableShell>
        </Card>
      </div>
    </>
  );
}

