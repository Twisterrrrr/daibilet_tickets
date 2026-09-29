import * as React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, DatabaseZap, RefreshCw } from 'lucide-react';

import { PageHeader, AccessDeniedState, RequestErrorState } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getDashboardAggregation } from '@/modules/dashboard/api/dashboard';
import type { DashboardAggregation, DashboardBlock, DashboardCardSignal } from '@/modules/dashboard/types';
import { presentRequestError } from '@/shared/api/errors';

const blockAccent: Record<DashboardBlock['id'], string> = {
  'catalog-readiness': 'border-l-info',
  'landing-traffic-engine': 'border-l-success',
  'import-health': 'border-l-warning',
  'external-orders-feed': 'border-l-primary',
};

function signalTone(signal: DashboardCardSignal) {
  if (signal.tone === 'danger') return 'border-destructive/30 bg-destructive/10 text-destructive';
  if (signal.tone === 'warning') return 'border-warning/30 bg-warning/10 text-warning-foreground';
  return 'border-border bg-background text-foreground';
}

function formatValue(value: DashboardCardSignal['value']) {
  if (value === null || value === undefined) return 'N/A';
  return String(value);
}

export function DashboardPage() {
  const [data, setData] = React.useState<DashboardAggregation | null>(null);
  const [error, setError] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await getDashboardAggregation();
        if (!cancelled) setData(res);
      } catch (err: unknown) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const signals = data?.blocks.flatMap((b) => b.signals) ?? [];
  const warnings = signals.filter((s) => s.tone === 'warning' || s.tone === 'danger').length;
  const readySignals = signals.filter((s) => s.value !== null && s.value !== 'N/A').length;

  return (
    <>
      <PageHeader
        title="Imported Sales Hub"
        description="Операционный контур для импортируемых событий, внешних заказов и источников Ticketscloud / Teplohod.info."
        meta={
          <>
            <Badge variant="outline" className="gap-1 border-success/30 bg-success/10 text-success">
              <CheckCircle2 className="h-3 w-3" />
              MVP контур
            </Badge>
            <Badge variant="outline" className="gap-1 border-border text-muted-foreground">
              <DatabaseZap className="h-3 w-3" />
              Финансы вне контура
            </Badge>
          </>
        }
        actions={
          <Button size="sm" variant="outline" onClick={() => setReloadKey((x) => x + 1)} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Обновить
          </Button>
        }
      />

      {loading ? <div className="mb-3 text-sm text-muted-foreground">Загружаю сводку...</div> : null}
      {!loading && error ? (
        (() => {
          const p = presentRequestError(error);
          if (p.kind === 'access_denied') return <AccessDeniedState description={p.message} requestId={p.requestId} />;
          return <RequestErrorState title={p.title} description={p.message} requestId={p.requestId} onRetry={() => setReloadKey((x) => x + 1)} />;
        })()
      ) : null}

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Card className="border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Сигналы готовы</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{readySignals}/{signals.length || 0}</div>
            </div>
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
        </Card>
        <Card className="border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Требуют внимания</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{warnings}</div>
            </div>
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
        </Card>
        <Card className="border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Сформировано</div>
              <div className="mt-1 text-sm font-medium">
                {data ? new Date(data.generatedAt).toLocaleString('ru-RU') : '...'}
              </div>
            </div>
            <Clock3 className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {data?.warnings?.length ? (
        <Card className="mb-4 border-warning/30 bg-warning/5 p-4">
          <div className="text-sm font-medium text-warning-foreground">Сводка частично недоступна</div>
          <div className="mt-1 text-xs text-muted-foreground">Часть read-model endpoints не ответила. Остальные блоки остаются рабочими.</div>
        </Card>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-2">
        {(data?.blocks ?? []).map((block) => (
          <Card key={block.id} className={`border-border border-l-4 ${blockAccent[block.id]} p-4`}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">{block.title}</div>
                {block.description ? <div className="mt-0.5 text-xs text-muted-foreground">{block.description}</div> : null}
              </div>
              <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                {data?.partial ? 'partial' : 'live'}
              </Badge>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {block.signals.map((signal) => {
                const content = (
                  <div className={`min-h-20 rounded-md border p-3 transition-colors ${signalTone(signal)} ${signal.href ? 'hover:bg-secondary/70' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 text-xs text-muted-foreground">{signal.label}</div>
                      {signal.href ? <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : null}
                    </div>
                    <div className="mt-2 text-xl font-semibold tabular-nums">{formatValue(signal.value)}</div>
                    {signal.note ? <div className="mt-1 text-[11px] text-muted-foreground">{signal.note}</div> : null}
                  </div>
                );
                return signal.href ? (
                  <Link key={signal.key} to={signal.href} className="block">
                    {content}
                  </Link>
                ) : (
                  <div key={signal.key}>{content}</div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
