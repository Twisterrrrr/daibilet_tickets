import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { api } from '@/shared/api/client';
import { DataTableShell, EmptyState, PageHeader, QuickFilterBar } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Gauge, Search as SearchIcon, X } from 'lucide-react';
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue';

type Summary = {
  totals?: Record<string, number>;
  byEntityType?: Record<string, { total: number; withIssues: number }>;
  bySeverity?: Record<string, number>;
};

type UnifiedIssue = {
  entityType: string;
  entityId: string;
  entityTitle?: string | null;
  cityId?: string | null;
  cityName?: string | null;
  severity: string;
  issueCode: string;
  message: string;
  hint?: string | null;
};

type Paginated<T> = { items: T[]; total: number; nextCursor?: string | null; hasMore?: boolean };

export function SeoAuditPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'issues';
  const q = params.get('q') ?? '';
  const entityType = params.get('entityType') ?? 'all';
  const severity = params.get('severity') ?? 'all';
  const onlyIssues = params.get('onlyIssues') ?? 'true';

  const update = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (!v || v === 'all') next.delete(k);
    else next.set(k, v);
    setParams(next, { replace: true });
  };
  const setTab = (t: string) => {
    const next = new URLSearchParams(params);
    next.set('tab', t);
    setParams(next, { replace: true });
  };
  const reset = () => setParams(new URLSearchParams({ tab }), { replace: true });

  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [issues, setIssues] = React.useState<Paginated<UnifiedIssue> | null>(null);
  const [loadingSummary, setLoadingSummary] = React.useState(false);
  const [loadingIssues, setLoadingIssues] = React.useState(false);
  const [error, setError] = React.useState('');

  const debouncedQ = useDebouncedValue(q, 350);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingSummary(true);
      setError('');
      try {
        const res = await api<Summary>('/admin/seo-audit/summary');
        if (!cancelled) setSummary(res);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        if (!cancelled) setLoadingSummary(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingIssues(true);
      setError('');
      try {
        const qs = new URLSearchParams();
        qs.set('page', '1');
        qs.set('limit', '50');
        if (entityType !== 'all') qs.set('entityType', entityType);
        if (severity !== 'all') qs.set('severity', severity);
        if (debouncedQ.trim()) qs.set('search', debouncedQ.trim());
        if (onlyIssues === 'true' || onlyIssues === 'false') qs.set('onlyIssues', onlyIssues);
        const res = await api<Paginated<UnifiedIssue>>(`/admin/seo-audit/issues?${qs.toString()}`);
        if (!cancelled) setIssues(res);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        if (!cancelled) setLoadingIssues(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQ, entityType, severity, onlyIssues]);

  const rows = issues?.items ?? [];
  const showEmpty = !loadingIssues && !error && issues !== null && rows.length === 0;

  return (
    <>
      <PageHeader title="SEO Audit" description="Диагностика SEO/контента (soft gate). Это предупреждения, не блокер." />

      {error ? <div className="mb-3 text-sm text-destructive">{error}</div> : null}

      <QuickFilterBar
        items={[
          { id: 'issues', label: 'Issues' },
          { id: 'summary', label: 'Summary' },
        ]}
        activeId={tab}
        onChange={setTab}
      />

      {tab === 'summary' ? (
        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="border-border p-4">
            <div className="text-xs text-muted-foreground">Всего</div>
            <div className="mt-1 text-2xl font-semibold">{summary?.totals ? Object.values(summary.totals).reduce((a, b) => a + b, 0) : loadingSummary ? '…' : '—'}</div>
            <div className="mt-2 text-xs text-muted-foreground">Источник: `/admin/seo-audit/summary`</div>
          </Card>
          <Card className="border-border p-4">
            <div className="text-xs text-muted-foreground">По severity</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {summary?.bySeverity
                ? Object.entries(summary.bySeverity).map(([k, v]) => (
                    <Badge key={k} variant="outline" className="border-border font-normal text-muted-foreground">
                      {k}: {v}
                    </Badge>
                  ))
                : loadingSummary
                  ? '…'
                  : '—'}
            </div>
          </Card>
          <Card className="border-border p-4">
            <div className="text-xs text-muted-foreground">По entity</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {summary?.byEntityType
                ? Object.entries(summary.byEntityType).map(([k, v]) => (
                    <Badge key={k} variant="outline" className="border-border font-normal text-muted-foreground">
                      {k}: {v.withIssues}/{v.total}
                    </Badge>
                  ))
                : loadingSummary
                  ? '…'
                  : '—'}
            </div>
          </Card>
        </div>
      ) : (
        <>
          <Card className="mb-3 border-border p-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="relative w-full lg:w-96">
                <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => update('q', e.target.value)}
                  placeholder="Поиск по entity/title"
                  className="h-9 border-border bg-background pl-8 text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Entity:</span>
                <button type="button" className={`rounded border px-2 py-1 ${entityType === 'all' ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('entityType', 'all')}>
                  all
                </button>
                <button type="button" className={`rounded border px-2 py-1 ${entityType === 'city' ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('entityType', 'city')}>
                  city
                </button>
                <button type="button" className={`rounded border px-2 py-1 ${entityType === 'venue' ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('entityType', 'venue')}>
                  venue
                </button>
                <button type="button" className={`rounded border px-2 py-1 ${entityType === 'event' ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('entityType', 'event')}>
                  event
                </button>
                <button type="button" className={`rounded border px-2 py-1 ${entityType === 'landing' ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('entityType', 'landing')}>
                  landing
                </button>
                <button type="button" className={`rounded border px-2 py-1 ${entityType === 'collection' ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('entityType', 'collection')}>
                  collection
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Severity:</span>
                <button type="button" className={`rounded border px-2 py-1 ${severity === 'all' ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('severity', 'all')}>
                  all
                </button>
                <button type="button" className={`rounded border px-2 py-1 ${severity === 'WARN' ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('severity', 'WARN')}>
                  WARN
                </button>
                <button type="button" className={`rounded border px-2 py-1 ${severity === 'ERROR' ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('severity', 'ERROR')}>
                  ERROR
                </button>

                <span className="ml-2">Only issues:</span>
                <button type="button" className={`rounded border px-2 py-1 ${onlyIssues === 'true' ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('onlyIssues', 'true')}>
                  true
                </button>
                <button type="button" className={`rounded border px-2 py-1 ${onlyIssues === 'false' ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('onlyIssues', 'false')}>
                  false
                </button>

                {q || entityType !== 'all' || severity !== 'all' || onlyIssues !== 'true' ? (
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={reset}>
                    <X className="mr-1 h-3.5 w-3.5" /> Сбросить
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>

          <DataTableShell
            columns={['Entity', 'Issue', 'Severity', 'Message']}
            loading={loadingIssues}
            empty={showEmpty ? <EmptyState icon={Gauge} title="Проблем не найдено" description="Попробуйте отключить onlyIssues или измените фильтры." /> : null}
          >
            {rows.map((r) => {
              const href =
                r.entityType === 'event'
                  ? `/admin-v4/events/${r.entityId}`
                  : r.entityType === 'city'
                    ? `/admin-v4/cities/${r.entityId}`
                    : r.entityType === 'venue'
                      ? `/admin-v4/venues/${r.entityId}`
                      : r.entityType === 'landing'
                        ? `/admin-v4/landings/${r.entityId}`
                        : r.entityType === 'collection'
                          ? `/admin-v4/collections/${r.entityId}`
                          : null;
              return (
                <tr key={`${r.entityType}:${r.entityId}:${r.issueCode}:${r.message}`} className="border-b border-border/60 hover:bg-secondary/40">
                  <td className="px-4 py-3">
                    {href ? (
                      <Link to={href} className="font-medium hover:underline">
                        {r.entityTitle ?? r.entityId}
                      </Link>
                    ) : (
                      <div className="font-medium">{r.entityTitle ?? r.entityId}</div>
                    )}
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      <span className="font-mono">{r.entityType}</span> · <span className="font-mono">{r.entityId}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.issueCode}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={
                        r.severity === 'ERROR'
                          ? 'border-destructive/30 bg-destructive/10 font-normal text-destructive'
                          : r.severity === 'WARN'
                            ? 'border-warning/30 bg-warning/10 font-normal text-warning-foreground'
                            : 'border-border font-normal text-muted-foreground'
                      }
                    >
                      {r.severity}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div>{r.message}</div>
                    {r.hint ? <div className="mt-1 text-xs text-muted-foreground">{r.hint}</div> : null}
                  </td>
                </tr>
              );
            })}
          </DataTableShell>
        </>
      )}
    </>
  );
}

