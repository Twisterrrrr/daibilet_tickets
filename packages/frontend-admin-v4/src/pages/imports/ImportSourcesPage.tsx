import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { AccessDeniedState, DataTableShell, EmptyState, InfoNote, PageHeader, RequestErrorState, SourceBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Activity, AlertTriangle, ArrowUpRight, CalendarDays, CheckCircle2, Clock, Download, RefreshCw, XCircle } from 'lucide-react';
import { listIntegrationIssues, listIntegrationRuns, listSupplierIntegrations } from '@/modules/import-sources/api/import-sources';
import { detectProviderFromAdapterCode, filterSupportedIntegrations } from '@/modules/import-sources/adapters/supported-providers';
import type { Paginated, SupplierIntegrationDto, SupplierIntegrationIssueDto, SupplierIntegrationRunDto } from '@/modules/import-sources/types';
import { presentRequestError } from '@/shared/api/errors';

export function ImportSourcesPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'runs';
  const sourceId = params.get('source') ?? '';

  const setTab = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('tab', id);
    setParams(next, { replace: true });
  };

  const [list, setList] = React.useState<Paginated<SupplierIntegrationDto> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listSupplierIntegrations({ page: 1, pageSize: 50 });
        if (!cancelled) setList(res);
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

  const integrationsRaw = list?.items ?? [];
  const { supported: integrations, unsupported } = filterSupportedIntegrations(integrationsRaw);
  const selected = sourceId ? integrations.find((i) => i.id === sourceId) ?? null : null;
  const effectiveSourceId = selected?.id ?? integrations[0]?.id ?? '';

  return (
    <>
      <PageHeader
        title="Источники импорта"
        description="Мониторинг подключений к каталогам поставщиков."
        actions={
          <Button size="sm" variant="outline" disabled>
            <RefreshCw className="mr-2 h-4 w-4" /> Запустить все (later)
          </Button>
        }
      />

      <InfoNote>
        Import Sources — это не Supplier CRM. В MVP показываем только провайдеров Ticketscloud и Teplohod.info из реестра: `GET /api/v1/admin/supplier-integrations`.
      </InfoNote>

      {!loading && error ? (
        (() => {
          const p = presentRequestError(error);
          if (p.kind === 'access_denied') return <div className="mt-3"><AccessDeniedState description={p.message} requestId={p.requestId} /></div>;
          return (
            <div className="mt-3">
              <RequestErrorState title={p.title} description={p.message} requestId={p.requestId} onRetry={() => setReloadKey((x) => x + 1)} />
            </div>
          );
        })()
      ) : null}
      {unsupported.length ? (
        <div className="mt-2 text-xs text-muted-foreground">
          Скрыто неподдерживаемых интеграций: <span className="font-medium text-foreground">{unsupported.length}</span>
        </div>
      ) : null}

      <div className="mb-6 mt-4 grid gap-3 sm:grid-cols-2">
        {integrations.map((s) => {
          const isActive = s.id === (sourceId || effectiveSourceId);
          const source = detectProviderFromAdapterCode(s.adapterCode) ?? 'ticketscloud';
          const syncState = s.consecutiveErrorCount > 0 ? 'error' : s.lastSuccessAt ? 'fresh' : 'stale';
          return (
            <Card key={s.id} className={`border-border p-4 ${isActive ? 'ring-2 ring-ring/40' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{s.name}</span>
                    <SourceBadge source={source as any} />
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{s.adapterName ?? s.adapterCode}</div>
                </div>
                <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                  {syncState}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <KV icon={Clock} label="Последняя" value={s.lastSuccessAt ? new Date(s.lastSuccessAt).toLocaleString('ru-RU') : '—'} />
                <KV icon={CalendarDays} label="Ошибок подряд" value={String(s.consecutiveErrorCount ?? 0)} tone={s.consecutiveErrorCount > 0 ? 'destructive' : 'default'} />
                <KV icon={CheckCircle2} label="Issues" value={String(s.openIssuesCount ?? 0)} tone={s.openIssuesCount > 0 ? 'warning' : 'default'} />
                <KV icon={AlertTriangle} label="Env" value={s.environment ?? '—'} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link to={`?tab=${tab}&source=${s.id}`}>
                    Открыть <ArrowUpRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <button type="button" onClick={() => setTab('runs')} className={`rounded-full border px-3 py-1 text-xs ${tab === 'runs' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-secondary'}`}>
          Запуски
        </button>
        <button type="button" onClick={() => setTab('issues')} className={`rounded-full border px-3 py-1 text-xs ${tab === 'issues' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-secondary'}`}>
          Проблемы
        </button>
        <span className="ml-auto text-xs text-muted-foreground">
          {loading ? 'Загрузка…' : `${integrations.length} интеграций`}
        </span>
      </div>

      {effectiveSourceId ? (
        tab === 'issues' ? <IssuesTable integrationId={effectiveSourceId} /> : <RunsTable integrationId={effectiveSourceId} />
      ) : (
        <Card className="border-border">
          <EmptyState icon={Download} title="Интеграций нет" description="Добавьте интеграции поставщиков в админке." />
        </Card>
      )}

      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Activity className="h-3 w-3" />
        Runs/Issues берём из `GET /admin/supplier-integrations/:id/runs|issues`.
      </p>
    </>
  );
}

function KV({ icon: Icon, label, value, tone = 'default' }: { icon: any; label: string; value: string; tone?: 'default' | 'warning' | 'destructive' }) {
  const cls = tone === 'destructive' ? 'text-destructive' : tone === 'warning' ? 'text-warning-foreground' : 'text-foreground';
  return (
    <div className="rounded-md border border-border bg-surface-muted px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={`mt-0.5 text-sm font-medium tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}

function RunsTable({ integrationId }: { integrationId: string }) {
  const [data, setData] = React.useState<Paginated<SupplierIntegrationRunDto> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await listIntegrationRuns(integrationId, { page: 1, pageSize: 50 });
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
  }, [integrationId]);

  const rows = data?.items ?? [];

  return (
    <>
      {error ? <div className="mb-3 text-sm text-destructive">{error}</div> : null}
      <DataTableShell
        columns={['Запуск', 'Начат', 'Завершён', 'Counters', 'Статус']}
        loading={loading}
        empty={!loading ? <EmptyState icon={Download} title="Запусков пока нет" description="Здесь появятся запуски импорта по интеграции." /> : null}
      >
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-border/60 hover:bg-secondary/40">
            <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
            <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.startedAt).toLocaleString('ru-RU')}</td>
            <td className="px-4 py-3 text-xs text-muted-foreground">{r.finishedAt ? new Date(r.finishedAt).toLocaleString('ru-RU') : '—'}</td>
            <td className="px-4 py-3 text-xs text-muted-foreground">{r.counters ? JSON.stringify(r.counters) : '—'}</td>
            <td className="px-4 py-3">
              <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                {r.status}
              </Badge>
            </td>
          </tr>
        ))}
      </DataTableShell>
    </>
  );
}

function IssuesTable({ integrationId }: { integrationId: string }) {
  const [data, setData] = React.useState<Paginated<SupplierIntegrationIssueDto> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await listIntegrationIssues(integrationId, { page: 1, pageSize: 50 });
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
  }, [integrationId]);

  const rows = data?.items ?? [];

  return (
    <>
      {error ? <div className="mb-3 text-sm text-destructive">{error}</div> : null}
      <DataTableShell
        columns={['Severity', 'Title', 'Code', 'Updated']}
        loading={loading}
        empty={!loading ? <EmptyState icon={CheckCircle2} title="Проблем нет" description="Когда импорт находит ошибку, она появится здесь." /> : null}
      >
        {rows.map((i) => (
          <tr key={i.id} className="border-b border-border/60 hover:bg-secondary/40">
            <td className="px-4 py-3">
              <Badge
                variant="outline"
                className={`gap-1 font-normal ${
                  i.severity === 'ERROR'
                    ? 'border-destructive/30 bg-destructive/10 text-destructive'
                    : i.severity === 'WARN'
                      ? 'border-warning/30 bg-warning/10 text-warning-foreground'
                      : 'border-border text-muted-foreground'
                }`}
              >
                {i.severity === 'ERROR' ? <XCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />} {i.severity}
              </Badge>
            </td>
            <td className="px-4 py-3 text-sm">{i.title}</td>
            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{i.code ?? '—'}</td>
            <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(i.updatedAt).toLocaleString('ru-RU')}</td>
          </tr>
        ))}
      </DataTableShell>
    </>
  );
}

