import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { DataTableShell } from '@/components/shared/table/DataTableShell';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminApi } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { Link } from 'react-router-dom';

export function SeoAuditPage() {
  const [q, setQ] = React.useState('');
  const [issueCode, setIssueCode] = React.useState('');
  const [severity, setSeverity] = React.useState<'ALL' | 'ERROR' | 'WARN' | 'INFO'>('ALL');
  const [page, setPage] = React.useState(1);
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
    queryKey: ['seo-audit-unified-issues', { q, issueCode, severity, page, limit }],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set('entityType', 'EVENT');
      sp.set('onlyIssues', 'true');
      sp.set('page', String(page));
      sp.set('limit', String(limit));
      if (q.trim()) sp.set('search', q.trim());
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
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Поиск по названию/slug…"
              className="h-9 w-[320px]"
            />
            <Input
              value={issueCode}
              onChange={(e) => {
                setIssueCode(e.target.value);
                setPage(1);
              }}
              placeholder="issueCode (например NO_PRICE)"
              className="h-9 w-[260px] font-mono text-xs"
            />
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value as any);
                setPage(1);
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
                      setIssueCode(c.issueCode);
                      setPage(1);
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
                        <Link to={`/admin-v3/events/${it.entityId}`}>Открыть</Link>
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
                <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Назад
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={issues.data.pages > 0 ? page >= issues.data.pages : issues.data.items.length < limit}
                  onClick={() => setPage((p) => p + 1)}
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

