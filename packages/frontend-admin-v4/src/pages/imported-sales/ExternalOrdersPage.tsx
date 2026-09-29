import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, ExternalLink, Receipt, RefreshCw, Search, XCircle } from 'lucide-react';

import { AccessDeniedState, DataTableShell, EmptyState, FilterBar, InfoNote, PageHeader, QuickFilterBar, RequestErrorState, SourceBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listExternalOrders } from '@/modules/external-orders/api/external-orders';
import type { ExternalOrderLinkDto, Paginated, TicketProviderCode } from '@/modules/external-orders/types';
import { presentRequestError } from '@/shared/api/errors';
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue';

const PAGE_SIZE = 50;

const QUICK_FILTERS = [
  { id: 'all', label: 'Все заказы' },
  { id: 'pending_refunds', label: 'Возвраты в работе' },
  { id: 'has_refunds', label: 'Есть заявки' },
  { id: 'ticketscloud', label: 'Ticketscloud' },
  { id: 'teplohod', label: 'Teplohod.info' },
  { id: 'cancelled', label: 'Отмененные' },
];

function providerCode(provider: string): TicketProviderCode | undefined {
  if (provider === 'ticketscloud') return 'TICKETS_CLOUD';
  if (provider === 'teplohod') return 'TEPLOHOD';
  return undefined;
}

function providerSlug(provider: TicketProviderCode): 'ticketscloud' | 'teplohod' {
  return provider === 'TICKETS_CLOUD' ? 'ticketscloud' : 'teplohod';
}

function statusMeta(status: string): { label: string; cls: string; Icon: React.ElementType } {
  const s = status.toLowerCase();
  if (s.includes('confirm') || s.includes('paid') || s.includes('complete')) {
    return { label: status, cls: 'border-success/20 bg-success/10 text-success', Icon: CheckCircle2 };
  }
  if (s.includes('cancel') || s.includes('reject') || s.includes('fail')) {
    return { label: status, cls: 'border-destructive/20 bg-destructive/10 text-destructive', Icon: XCircle };
  }
  return { label: status || 'unknown', cls: 'border-warning/30 bg-warning/10 text-warning-foreground', Icon: Clock };
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function ExternalOrdersPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const provider = params.get('provider') ?? 'all';
  const status = params.get('status') ?? 'all';
  const integrationState = params.get('integrationState') ?? 'all';
  const hasRefundRequests = params.get('hasRefundRequests') ?? 'all';
  const refundPending = params.get('refundPending') ?? 'all';
  const view = params.get('view') ?? 'all';
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1);

  const [data, setData] = React.useState<Paginated<ExternalOrderLinkDto> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const debouncedQ = useDebouncedValue(q, 350);

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const setPage = (nextPage: number) => {
    const next = new URLSearchParams(params);
    if (nextPage <= 1) next.delete('page');
    else next.set('page', String(nextPage));
    setParams(next, { replace: true });
  };

  const reset = () => setParams(new URLSearchParams(), { replace: true });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listExternalOrders({
          page,
          limit: PAGE_SIZE,
          provider: providerCode(provider),
          status: status !== 'all' ? status : undefined,
          integrationState: integrationState !== 'all' ? integrationState : undefined,
          search: debouncedQ.trim() ? debouncedQ.trim() : undefined,
          hasRefundRequests: hasRefundRequests !== 'all' ? hasRefundRequests : undefined,
          refundPending: refundPending !== 'all' ? refundPending : undefined,
        });
        if (!cancelled) setData(res);
      } catch (e: unknown) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedQ, hasRefundRequests, integrationState, page, provider, refundPending, reloadKey, status]);

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeFilterCount =
    [q.trim()].filter(Boolean).length +
    ['provider', 'status', 'integrationState', 'hasRefundRequests', 'refundPending', 'view']
      .map((key) => params.get(key))
      .filter((value) => value && value !== 'all').length;

  const applyQuickFilter = (id: string) => {
    const next = new URLSearchParams(params);
    for (const key of ['view', 'page', 'provider', 'status', 'hasRefundRequests', 'refundPending']) next.delete(key);

    if (id !== 'all' || view !== id) {
      next.set('view', id);
      if (id === 'pending_refunds') next.set('refundPending', 'true');
      if (id === 'has_refunds') next.set('hasRefundRequests', 'true');
      if (id === 'ticketscloud') next.set('provider', 'ticketscloud');
      if (id === 'teplohod') next.set('provider', 'teplohod');
      if (id === 'cancelled') next.set('status', 'CANCELLED');
    }

    setParams(next, { replace: true });
  };

  const detailHref = (orderId: string) => {
    const qs = params.toString();
    const returnTo = qs ? `/admin-v4/orders?${qs}` : '/admin-v4/orders';
    return `/admin-v4/orders/${orderId}?returnTo=${encodeURIComponent(returnTo)}`;
  };

  return (
    <>
      <PageHeader
        title="Внешние заказы"
        description="Зеркало заказов у Ticketscloud и Teplohod.info. Факты провайдера read-only, ручные возвраты ведем отдельной операционной заявкой."
        meta={
          <>
            <Badge variant="outline" className="border-border bg-card text-muted-foreground">
              без YooKassa
            </Badge>
            <Badge variant="outline" className="border-border bg-card text-muted-foreground">
              provider-side refunds
            </Badge>
          </>
        }
        actions={
          <Button size="sm" variant="outline" onClick={() => setReloadKey((key) => key + 1)} disabled={loading}>
            <RefreshCw className={loading ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
            Обновить
          </Button>
        }
      />

      <InfoNote>
        Автоматический возврат через Daibilet не выполняется. `COMPLETED` в заявке означает, что оператор подтвердил действие во внешнем кабинете провайдера.
      </InfoNote>

      <div className="mt-4">
        <FilterBar>
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(event) => update('q', event.target.value)}
              placeholder="Поиск: внешний id заказа или UUID..."
              className="h-9 border-border bg-background pl-8 text-sm"
            />
          </div>
          {activeFilterCount > 0 ? (
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={reset}>
              Сбросить ({activeFilterCount})
            </Button>
          ) : null}
        </FilterBar>
      </div>

      <QuickFilterBar items={QUICK_FILTERS} activeId={view} onChange={applyQuickFilter} />

      <div className="mb-3 grid grid-cols-2 gap-2 rounded-md border border-border bg-card p-3 md:grid-cols-4">
        <FilterSelect
          label="Провайдер"
          value={provider}
          options={[
            ['all', 'Любой'],
            ['ticketscloud', 'Ticketscloud'],
            ['teplohod', 'Teplohod.info'],
          ]}
          onChange={(value) => update('provider', value)}
        />
        <FilterSelect
          label="Статус"
          value={status}
          options={[
            ['all', 'Любой'],
            ['CONFIRMED', 'CONFIRMED'],
            ['OPEN', 'OPEN'],
            ['CANCELLED', 'CANCELLED'],
          ]}
          onChange={(value) => update('status', value)}
        />
        <FilterSelect
          label="Возвраты"
          value={hasRefundRequests}
          options={[
            ['all', 'Любые'],
            ['true', 'Есть заявки'],
            ['false', 'Нет заявок'],
          ]}
          onChange={(value) => update('hasRefundRequests', value)}
        />
        <FilterSelect
          label="В работе"
          value={refundPending}
          options={[
            ['all', 'Любые'],
            ['true', 'Да'],
            ['false', 'Нет'],
          ]}
          onChange={(value) => update('refundPending', value)}
        />
      </div>

      {!loading && error ? (
        <div className="mb-3">
          {(() => {
            const p = presentRequestError(error);
            if (p.kind === 'access_denied') return <AccessDeniedState description={p.message} requestId={p.requestId} />;
            return <RequestErrorState title={p.title} description={p.message} requestId={p.requestId} onRetry={() => setReloadKey((key) => key + 1)} />;
          })()}
        </div>
      ) : null}

      <DataTableShell
        columns={['Заказ', 'Источник', 'Событие', 'Дата события', 'Статус', 'Возвраты', '']}
        loading={loading}
        empty={!loading && !error && rows.length === 0 ? <EmptyState icon={Receipt} title="Заказы не найдены" description="Измените фильтры или проверьте импорт внешних заказов." /> : null}
      >
        {rows.map((order) => {
          const meta = statusMeta(order.status);
          const Icon = meta.Icon;
          return (
            <tr key={order.id} className="border-b border-border/60 hover:bg-secondary/40">
              <td className="min-w-[220px] px-4 py-3">
                <Link to={detailHref(order.id)} className="font-mono text-xs text-foreground hover:underline">
                  {order.externalOrderId ?? order.id}
                </Link>
                <div className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(order.createdAt)}</div>
              </td>
              <td className="px-4 py-3">
                <SourceBadge source={providerSlug(order.provider)} />
              </td>
              <td className="min-w-[220px] px-4 py-3 text-sm text-foreground">{order.eventTitle ?? '-'}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{order.eventDateLabel ?? '-'}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}>
                  <Icon className="h-3 w-3" />
                  {meta.label}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                <div>заявок: {order.refundRequestsCount ?? 0}</div>
                <div className={order.hasPendingRefundRequests ? 'mt-0.5 text-warning-foreground' : 'mt-0.5'}>
                  {order.hasPendingRefundRequests ? 'есть в работе' : 'без очереди'}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <Button asChild size="sm" variant="ghost" className="h-8 px-2">
                  <Link to={detailHref(order.id)} aria-label={`Открыть заказ ${order.externalOrderId ?? order.id}`}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </td>
            </tr>
          );
        })}
      </DataTableShell>

      {data && total > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <div>
            Всего: {total} · страница {page} / {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Назад
            </Button>
            <Button variant="outline" size="sm" className="h-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Вперед
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground">
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </div>
  );
}
