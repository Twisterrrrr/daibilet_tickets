import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { DataTableShell } from '@/components/shared/table/DataTableShell';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminApi } from '@/api/client';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { readEnum, readInt, readString } from '@/shared/url-state/parse';
import { setOrDelete } from '@/shared/url-state/serialize';
import { useUrlState } from '@/shared/url-state/useUrlState';
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { Link } from 'react-router-dom';

export function SeoAuditPage() {
  const { state, setState } = useUrlState({
    defaults: {
      tab: 'EVENT' as 'EVENT' | 'VENUE' | 'CITY' | 'ARTICLE' | 'LANDING' | 'COLLECTION',
      q: '',
      issueCode: '',
      severity: 'ALL' as 'ALL' | 'ERROR' | 'WARN' | 'INFO',
      page: 1,
    },
    parse: (sp) => ({
      tab: readEnum(
        sp,
        'tab',
        ['EVENT' as const, 'VENUE', 'CITY', 'ARTICLE', 'LANDING', 'COLLECTION'],
        'EVENT',
      ),
      q: readString(sp, 'q', ''),
      issueCode: readString(sp, 'issueCode', ''),
      severity: readEnum(sp, 'severity', ['ALL' as const, 'ERROR', 'WARN', 'INFO'], 'ALL'),
      page: readInt(sp, 'page', 1),
    }),
    serialize: (s, sp) => {
      if (s.tab !== 'EVENT') sp.set('tab', s.tab);
      else sp.delete('tab');
      setOrDelete(sp, 'issueCode', s.issueCode);
      if (s.severity !== 'ALL') sp.set('severity', s.severity);
      else sp.delete('severity');
      if (s.page !== 1) sp.set('page', String(s.page));
      else sp.delete('page');
      // `q` is managed via debounced effect below (still serialize here for reset/back/forward)
      setOrDelete(sp, 'q', s.q);
      return sp;
    },
  });

  const entityType = state.tab;
  const [qInput, setQInput] = React.useState(state.q);
  const debouncedQ = useDebouncedValue(qInput, 250);
  React.useEffect(() => setQInput(state.q), [state.q]);
  React.useEffect(() => {
    if (debouncedQ === state.q) return;
    setState({ q: debouncedQ, page: 1 }, { history: 'replace' });
  }, [debouncedQ, setState, state.q]);

  const q = qInput;
  const issueCode = state.issueCode;
  const severity = state.severity;
  const page = state.page;
  const limit = 50;

  const summary = useQuery({
    queryKey: ['seo-audit-unified-summary'],
    queryFn: () =>
      adminApi.get<{
        totals: { issues: number; errors: number; warnings: number; info: number };
        byEntityType: Array<{ entityType: string; total: number; errors: number; warnings: number; info: number }>;
        byIssueCode: Array<{ issueCode: string; total: number }>;
      }>('/admin/seo-audit/summary'),
    staleTime: 30_000,
  });

  const issues = useQuery({
    queryKey: ['seo-audit-unified-issues', { entityType, q: debouncedQ, issueCode, severity, page, limit }],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set('entityType', entityType);
      sp.set('onlyIssues', 'true');
      sp.set('page', String(page));
      sp.set('limit', String(limit));
      if (debouncedQ.trim()) sp.set('search', debouncedQ.trim());
      if (issueCode.trim()) sp.set('issueCode', issueCode.trim());
      if (severity !== 'ALL') sp.set('severity', severity);
      return adminApi.get<{
        items: Array<{
          entityType: string;
          entityId: string;
          entityTitle: string;
          entitySlug?: string | null;
          cityName?: string | null;
          issueCode: string;
          severity: 'ERROR' | 'WARN' | 'INFO';
          message: string;
          updatedAt?: string | null;
        }>;
        total: number;
        page: number;
        pages: number;
      }>(`/admin/seo-audit/issues?${sp.toString()}`);
    },
    staleTime: 15_000,
  });

  const topCodes = summary.data?.byIssueCode ?? [];

  const adminHrefFor = (t: string, id: string): string => {
    const tt = String(t).toUpperCase();
    if (tt === 'ARTICLE') return `/admin-v3/articles/${encodeURIComponent(id)}`;
    if (tt === 'LANDING') return `/admin-v3/landings/${encodeURIComponent(id)}`;
    if (tt === 'COLLECTION') return `/admin-v3/collections/${encodeURIComponent(id)}`;
    if (tt === 'VENUE') return `/admin-v3/venues/${encodeURIComponent(id)}`;
    if (tt === 'CITY') return `/admin-v3/cities/${encodeURIComponent(id)}`;
    return `/admin-v3/events/${encodeURIComponent(id)}`;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="SEO-аудит"
        actions={
          <Button type="button" variant="outline" onClick={() => summary.refetch()}>
            Обновить
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground">Всего issues</div>
          <div className="mt-1 text-2xl font-semibold">{summary.data?.totals.issues ?? '—'}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground">Errors</div>
          <div className="mt-1 text-2xl font-semibold">{summary.data?.totals.errors ?? '—'}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground">Warnings</div>
          <div className="mt-1 text-2xl font-semibold">{summary.data?.totals.warnings ?? '—'}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground">Info</div>
          <div className="mt-1 text-2xl font-semibold">{summary.data?.totals.info ?? '—'}</div>
        </div>
      </div>

      <DataTableShell
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={entityType}
              onChange={(e) => {
                setState({ tab: e.target.value as any, page: 1 }, { history: 'push' });
              }}
            >
              <option value="EVENT">EVENT</option>
              <option value="VENUE">VENUE</option>
              <option value="CITY">CITY</option>
              <option value="ARTICLE">ARTICLE</option>
              <option value="LANDING">LANDING</option>
              <option value="COLLECTION">COLLECTION</option>
            </select>
            <Input
              value={q}
              onChange={(e) => {
                setQInput(e.target.value);
                setState({ page: 1 }, { history: 'replace' });
              }}
              placeholder="Поиск по названию/slug…"
              className="h-9 w-[320px]"
            />
            <Input
              value={issueCode}
              onChange={(e) => {
                setState({ issueCode: e.target.value, page: 1 }, { history: 'replace' });
              }}
              placeholder="issueCode (например NO_PRICE)"
              className="h-9 w-[260px] font-mono text-xs"
            />
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={severity}
              onChange={(e) => {
                setState({ severity: e.target.value as any, page: 1 }, { history: 'replace' });
              }}
            >
              <option value="ALL">Все severity</option>
              <option value="ERROR">ERROR</option>
              <option value="WARN">WARN</option>
              <option value="INFO">INFO</option>
            </select>

            {topCodes.length > 0 ? (
              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                <div className="text-xs text-muted-foreground">Top codes:</div>
                {topCodes.slice(0, 6).map((c) => (
                  <button
                    key={c.issueCode}
                    type="button"
                    className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                    onClick={() => {
                      setState({ issueCode: c.issueCode, page: 1 }, { history: 'replace' });
                    }}
                    title={`Всего: ${c.total}`}
                  >
                    <span className="font-mono">{c.issueCode}</span> <span className="text-muted-foreground">({c.total})</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        }
      >
        {issues.isLoading ? <LoadingState /> : null}
        {issues.isError ? (
          <ErrorState
            title="Не удалось загрузить issues"
            description={issues.error instanceof Error ? issues.error.message : 'Ошибка'}
            onRetry={() => issues.refetch()}
          />
        ) : null}

        {issues.data ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Entity</th>
                  <th className="px-4 py-3 text-left">Issue</th>
                  <th className="px-4 py-3 text-center">Severity</th>
                  <th className="px-4 py-3 text-center">Действия</th>
                </tr>
              </thead>
              <tbody>
                {issues.data.items.map((it) => (
                  <tr key={`${it.entityId}:${it.issueCode}`} className="border-b">
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium">{it.entityTitle}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{it.entitySlug ?? it.entityId}</span>
                        {it.cityName ? <span>{it.cityName}</span> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-mono text-xs">{it.issueCode}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{it.message}</div>
                    </td>
                    <td className="px-4 py-3 text-center align-top">
                      <Badge variant={it.severity === 'ERROR' ? 'danger' : it.severity === 'WARN' ? 'warning' : 'info'}>
                        {it.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center align-top">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <Link to={adminHrefFor(it.entityType, it.entityId)}>Открыть</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <div>
                Страница {issues.data.page} / {issues.data.pages} · {issues.data.items.length} items
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setState({ page: Math.max(1, page - 1) }, { history: 'push' })}
                >
                  Назад
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={issues.data.pages > 0 ? page >= issues.data.pages : issues.data.items.length < limit}
                  onClick={() => setState({ page: page + 1 }, { history: 'push' })}
                >
                  Вперёд
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </DataTableShell>
    </div>
  );
}

