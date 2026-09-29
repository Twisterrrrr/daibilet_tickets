import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { DataTableShell, EmptyState, FilterBar, PageHeader, QuickFilterBar, SourceBadge, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { listEvents } from '@/modules/events/api/events';
import type { AdminExternalPurchaseEntryStatus, EventListItemDto, Paginated } from '@/modules/events/types';
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue';
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, CircleDashed, EyeOff, RefreshCw, Search, X } from 'lucide-react';

type BadgeStatus = 'draft' | 'ready' | 'live' | 'paused' | 'incomplete' | 'error';

type WorkbenchMetrics = {
  importedTotal: number;
  ticketscloud: number;
  teplohod: number;
  needsAttention: number;
  readyToPublish: number;
  purchaseBlocked: number;
};

const PAGE_SIZE = 50;

const BASE_QUICK_FILTERS = [
  { id: 'all_imported', label: 'Все импортные' },
  { id: 'needs_attention', label: 'Нужно внимание' },
  { id: 'ready_publish', label: 'К публикации' },
  { id: 'purchase_blocked', label: 'Покупка не готова' },
  { id: 'no_image', label: 'Без фото' },
  { id: 'hidden', label: 'Скрытые' },
];

const EXTERNAL_PURCHASE_LABELS: Record<AdminExternalPurchaseEntryStatus, string> = {
  READY: 'Готово',
  MISSING: 'Не настроено',
  INVALID: 'Некорректно',
  DISABLED: 'Отключено',
  PROVIDER_UNSUPPORTED: 'Провайдер не поддержан',
};

const READINESS_ISSUE_LABELS: Record<string, string> = {
  NO_PHOTO: 'фото',
  NO_PRICE: 'цена',
  NO_FUTURE_SESSIONS: 'сеансы',
  NO_SUBCATEGORY: 'категория',
  TOO_MANY_SUBCATEGORIES: 'таксономия',
};

function readinessBadgeStatus(summary: EventListItemDto['readinessSummary']): BadgeStatus {
  if (summary?.status === 'READY') return 'live';
  if (summary?.status === 'NEEDS_WORK') return 'incomplete';
  if (summary?.status === 'BLOCKED') return 'error';
  return 'draft';
}

function eventStatus(e: EventListItemDto): { status: BadgeStatus; label: string } {
  if (!e.isActive) return { status: 'draft', label: 'inactive' };
  if (e.override?.isHidden) return { status: 'paused', label: 'hidden' };
  return { status: 'live', label: 'active' };
}

function sourceBadgeValue(source: string): 'ticketscloud' | 'teplohod' | 'manual' {
  const s = String(source ?? '').toUpperCase();
  if (s === 'TC' || s === 'TICKETSCLOUD') return 'ticketscloud';
  if (s === 'TEPLOHOD') return 'teplohod';
  return 'manual';
}

function formatNumber(value?: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
}

function formatMoney(value?: number | null): string {
  if (value == null || value <= 0) return '-';
  const rubles = Math.round(value / 100);
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(rubles) + ' ₽';
}

function formatDateTime(value?: string | null): string {
  if (!value) return 'нет ближайших';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'дата неизвестна';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function labelReadiness(summary: EventListItemDto['readinessSummary']): string {
  if (!summary) return 'нет данных';
  if (summary.status === 'READY') return `готово · ${summary.score}`;
  if (summary.status === 'NEEDS_WORK') return `доработать · ${summary.score}`;
  return `блокер · ${summary.score}`;
}

function labelExternalPurchaseStatus(status?: AdminExternalPurchaseEntryStatus): string {
  if (!status) return '-';
  return EXTERNAL_PURCHASE_LABELS[status] ?? status;
}

function problemLabels(e: EventListItemDto): string[] {
  const labels = (e.readinessSummary?.issueCodes ?? [])
    .map((code) => READINESS_ISSUE_LABELS[code] ?? code)
    .filter(Boolean);

  if (e.externalPurchaseEntry && e.externalPurchaseEntry.status !== 'READY') labels.push('покупка');
  return Array.from(new Set(labels));
}

function suggestedDetailTab(e: EventListItemDto): 'overview' | 'classification' | 'schedule' | 'media' {
  const issues = e.readinessSummary?.issueCodes ?? [];
  if (issues.includes('NO_PHOTO')) return 'media';
  if (issues.includes('NO_SUBCATEGORY') || issues.includes('TOO_MANY_SUBCATEGORIES')) return 'classification';
  if (issues.includes('NO_FUTURE_SESSIONS') || issues.includes('NO_PRICE')) return 'schedule';
  return 'overview';
}

async function countEvents(query: Parameters<typeof listEvents>[0]): Promise<number> {
  const res = await listEvents({ page: 1, limit: 1, lite: true, ...query });
  return res.total ?? 0;
}

async function loadWorkbenchMetrics(): Promise<WorkbenchMetrics> {
  const [importedTotal, ticketscloud, teplohod, needsAttention, readyToPublish, purchaseMissing, purchaseNotReady] = await Promise.all([
    countEvents({ source: 'IMPORTED' }),
    countEvents({ source: 'TC' }),
    countEvents({ source: 'TEPLOHOD' }),
    countEvents({ source: 'IMPORTED', needsAttention: 'true' }),
    countEvents({ source: 'IMPORTED', readyToPublish: 'true' }),
    countEvents({ source: 'IMPORTED', purchaseReadiness: 'MISSING' }),
    countEvents({ source: 'IMPORTED', purchaseReadiness: 'NOT_READY' }),
  ]);

  return {
    importedTotal,
    ticketscloud,
    teplohod,
    needsAttention,
    readyToPublish,
    purchaseBlocked: purchaseMissing + purchaseNotReady,
  };
}

export function EventsPage() {
  const [params, setParams] = useSearchParams();
  const [reloadKey, setReloadKey] = React.useState(0);
  const q = params.get('q') ?? '';
  const active = params.get('active') ?? 'all';
  const source = params.get('source') ?? 'IMPORTED';
  const hidden = params.get('hidden') ?? 'all';
  const isPast = params.get('isPast') ?? 'all';
  const isArchived = params.get('isArchived') ?? 'all';
  const missingImage = params.get('missingImage') ?? 'all';
  const hasFutureSessions = params.get('hasFutureSessions') ?? 'all';
  const needsAttention = params.get('needsAttention') ?? 'all';
  const readyToPublish = params.get('readyToPublish') ?? 'all';
  const purchaseReadiness = params.get('purchaseReadiness') ?? 'all';
  const view = params.get('view') ?? 'all_imported';
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1);

  const [data, setData] = React.useState<Paginated<EventListItemDto> | null>(null);
  const [metrics, setMetrics] = React.useState<WorkbenchMetrics | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [metricsLoading, setMetricsLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const debouncedQ = useDebouncedValue(q, 350);

  const quickFilterItems = React.useMemo(
    () =>
      BASE_QUICK_FILTERS.map((item) => {
        if (!metrics) return item;
        if (item.id === 'all_imported') return { ...item, count: metrics.importedTotal };
        if (item.id === 'needs_attention') return { ...item, count: metrics.needsAttention };
        if (item.id === 'ready_publish') return { ...item, count: metrics.readyToPublish };
        if (item.id === 'purchase_blocked') return { ...item, count: metrics.purchaseBlocked };
        return item;
      }),
    [metrics],
  );

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

  const refreshMetrics = React.useCallback(async () => {
    setMetricsLoading(true);
    try {
      setMetrics(await loadWorkbenchMetrics());
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshMetrics();
  }, [refreshMetrics]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await listEvents({
          page,
          limit: PAGE_SIZE,
          lite: true,
          search: debouncedQ.trim() ? debouncedQ.trim() : undefined,
          active: active !== 'all' ? (active as 'true' | 'false') : undefined,
          source: source !== 'all' ? source : undefined,
          hidden: hidden !== 'all' ? (hidden as 'true' | 'false') : undefined,
          isPast: isPast !== 'all' ? (isPast as 'true' | 'false') : undefined,
          isArchived: isArchived !== 'all' ? (isArchived as 'true' | 'false') : undefined,
          missingImage: missingImage !== 'all' ? 'true' : undefined,
          hasFutureSessions: hasFutureSessions !== 'all' ? (hasFutureSessions as 'true' | 'false') : undefined,
          needsAttention: needsAttention !== 'all' ? (needsAttention as 'true' | 'false') : undefined,
          readyToPublish: readyToPublish !== 'all' ? (readyToPublish as 'true' | 'false') : undefined,
          purchaseReadiness:
            purchaseReadiness === 'READY' || purchaseReadiness === 'NOT_READY' || purchaseReadiness === 'MISSING'
              ? purchaseReadiness
              : undefined,
        });
        if (!cancelled) setData(res);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Не удалось загрузить события');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    active,
    debouncedQ,
    hasFutureSessions,
    hidden,
    isArchived,
    isPast,
    missingImage,
    needsAttention,
    page,
    purchaseReadiness,
    readyToPublish,
    reloadKey,
    source,
  ]);

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showEmpty = !loading && !error && data !== null && rows.length === 0;
  const activeFilterCount =
    [q.trim()].filter(Boolean).length +
    ['active', 'source', 'hidden', 'isPast', 'isArchived', 'missingImage', 'hasFutureSessions', 'needsAttention', 'readyToPublish', 'purchaseReadiness', 'view']
      .map((key) => params.get(key))
      .filter((value) => value && value !== 'all' && value !== 'all_imported').length;

  const applyQuickFilter = (id: string) => {
    const next = new URLSearchParams(params);
    const same = view === id;
    for (const key of ['view', 'page', 'source', 'missingImage', 'hidden', 'needsAttention', 'readyToPublish', 'purchaseReadiness']) {
      next.delete(key);
    }

    if (!same) {
      next.set('view', id);
      next.set('source', 'IMPORTED');
      if (id === 'needs_attention') next.set('needsAttention', 'true');
      if (id === 'ready_publish') next.set('readyToPublish', 'true');
      if (id === 'purchase_blocked') next.set('purchaseReadiness', 'NOT_READY');
      if (id === 'no_image') next.set('missingImage', 'true');
      if (id === 'hidden') next.set('hidden', 'true');
    }

    setParams(next, { replace: true });
  };

  const refreshAll = () => {
    void refreshMetrics();
    setReloadKey((current) => current + 1);
  };

  const detailHref = (eventId: string, tab: 'overview' | 'classification' | 'schedule' | 'media' = 'overview') => {
    const qs = params.toString();
    const returnTo = qs ? `/admin-v4/events?${qs}` : '/admin-v4/events';
    const tabParam = tab === 'overview' ? '' : `&tab=${tab}`;
    return `/admin-v4/events/${eventId}?returnTo=${encodeURIComponent(returnTo)}${tabParam}`;
  };

  return (
    <>
      <PageHeader
        title="Imported Events Workbench"
        description="Рабочий список импортированных событий: готовность витрины, внешняя покупка, ближайшие сеансы и быстрый переход в карточку."
        meta={
          <>
            <Badge variant="outline" className="border-info/20 bg-info/5 text-info">
              Ticketscloud + Teplohod.info
            </Badge>
            <Badge variant="outline" className="border-border bg-card text-muted-foreground">
              без внутреннего checkout
            </Badge>
          </>
        }
        actions={
          <Button size="sm" variant="outline" onClick={refreshAll} disabled={loading || metricsLoading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', (loading || metricsLoading) && 'animate-spin')} />
            Обновить
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard title="Импортные" value={metrics?.importedTotal} hint={`${metrics?.ticketscloud ?? 0} TC · ${metrics?.teplohod ?? 0} TEP`} loading={metricsLoading} />
        <MetricCard title="Нужно внимание" value={metrics?.needsAttention} tone="warning" icon={AlertTriangle} loading={metricsLoading} />
        <MetricCard title="К публикации" value={metrics?.readyToPublish} tone="success" icon={CheckCircle2} loading={metricsLoading} />
        <MetricCard title="Покупка не готова" value={metrics?.purchaseBlocked} tone="danger" icon={CircleDashed} loading={metricsLoading} />
        <MetricCard title="В выборке" value={total} hint={`страница ${page}/${totalPages}`} loading={loading} />
        <MetricCard title="Размер страницы" value={PAGE_SIZE} hint="операторская пагинация" />
      </div>

      <FilterBar>
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(event) => update('q', event.target.value)}
            placeholder="Поиск: название, slug, город, площадка, внешний id..."
            className="h-9 border-border bg-background pl-8 text-sm"
          />
        </div>
        {activeFilterCount > 0 ? (
          <Button variant="ghost" size="sm" className="h-8 shrink-0 text-xs" onClick={reset}>
            <X className="mr-1 h-3.5 w-3.5" />
            Сбросить ({activeFilterCount})
          </Button>
        ) : null}
      </FilterBar>

      <QuickFilterBar items={quickFilterItems} activeId={view || undefined} onChange={applyQuickFilter} />

      <Card className="mb-3 border-border p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
          <FilterSelect
            label="Источник"
            value={source}
            options={[
              ['IMPORTED', 'Все импортные'],
              ['TC', 'Ticketscloud'],
              ['TEPLOHOD', 'Teplohod.info'],
              ['MANUAL', 'Manual'],
              ['all', 'Любой'],
            ]}
            onChange={(value) => update('source', value)}
          />
          <FilterSelect
            label="Активность"
            value={active}
            options={[
              ['all', 'Любая'],
              ['true', 'Активные'],
              ['false', 'Неактивные'],
            ]}
            onChange={(value) => update('active', value)}
          />
          <FilterSelect
            label="Видимость"
            value={hidden}
            options={[
              ['all', 'Любая'],
              ['false', 'Видимые'],
              ['true', 'Скрытые'],
            ]}
            onChange={(value) => update('hidden', value)}
          />
          <FilterSelect
            label="Сеансы"
            value={hasFutureSessions}
            options={[
              ['all', 'Любые'],
              ['true', 'Есть будущие'],
              ['false', 'Нет будущих'],
            ]}
            onChange={(value) => update('hasFutureSessions', value)}
          />
          <FilterSelect
            label="Архив"
            value={isArchived}
            options={[
              ['all', 'Скрывать архив'],
              ['false', 'Не архив'],
              ['true', 'Только архив'],
            ]}
            onChange={(value) => update('isArchived', value)}
          />
          <FilterSelect
            label="Прошедшие"
            value={isPast}
            options={[
              ['all', 'Скрывать прошедшие'],
              ['false', 'Не прошедшие'],
              ['true', 'Только прошедшие'],
            ]}
            onChange={(value) => update('isPast', value)}
          />
          <FilterSelect
            label="Внешняя покупка"
            value={purchaseReadiness}
            options={[
              ['all', 'Любая'],
              ['READY', 'Готова'],
              ['NOT_READY', 'Не готова'],
              ['MISSING', 'Нет оффера'],
            ]}
            onChange={(value) => update('purchaseReadiness', value)}
          />
        </div>
      </Card>

      {error ? <div className="mb-3 text-sm text-destructive">{error}</div> : null}

      <DataTableShell
        columns={['Событие', 'Источник', 'Локация', 'Сеансы', 'Офферы', 'Внешняя покупка', 'Проблемы', 'Готовность', 'Статус', '']}
        loading={loading}
        empty={
          showEmpty ? (
            <EmptyState
              icon={CalendarDays}
              title="События не найдены"
              description="Измените фильтры или запустите быстрый sync поставщика на экране Sync health."
            />
          ) : null
        }
      >
        {rows.map((event) => {
          const status = eventStatus(event);
          const problems = problemLabels(event);
          const futureSessions = event.futureSessionsCount ?? 0;
          const totalSessions = event._count?.sessions ?? 0;
          const offersCount = event.categoriesCount ?? event._count?.offers ?? 0;
          const venueName = event.venue?.title ?? event.venueShort?.name ?? 'без площадки';

          return (
            <tr key={event.id} className="border-b border-border/60 hover:bg-secondary/40">
              <td className="min-w-[320px] px-4 py-3">
                <Link to={detailHref(event.id)} className="font-medium text-foreground hover:underline">
                  {event.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="font-mono">{event.slug}</span>
                  {event.override?.isHidden ? (
                    <span className="inline-flex items-center gap-1 text-warning-foreground">
                      <EyeOff className="h-3 w-3" />
                      hidden
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3">
                <SourceBadge source={sourceBadgeValue(event.source)} />
              </td>
              <td className="min-w-[180px] px-4 py-3 text-sm text-muted-foreground">
                <div className="text-foreground">{event.city?.name ?? '-'}</div>
                <div className="mt-0.5 text-[11px]">{venueName}</div>
              </td>
              <td className="min-w-[140px] px-4 py-3 text-sm tabular-nums text-muted-foreground">
                <div className="font-medium text-foreground">{formatNumber(futureSessions)} будущих</div>
                <div className="mt-0.5 text-[11px]">всего {formatNumber(totalSessions)}</div>
                <div className="mt-0.5 text-[11px]">{formatDateTime(event.nextSessionAt)}</div>
              </td>
              <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">
                <div className="font-medium text-foreground">{formatNumber(offersCount)}</div>
                <div className="mt-0.5 text-[11px]">от {formatMoney(event.priceFromMin ?? event.priceFrom)}</div>
              </td>
              <td className="min-w-[150px] px-4 py-3 text-xs text-muted-foreground">
                {event.externalPurchaseEntry ? (
                  <span title={event.externalPurchaseEntry.blockingReasons.join('; ') || undefined}>
                    {labelExternalPurchaseStatus(event.externalPurchaseEntry.status)}
                  </span>
                ) : (
                  '-'
                )}
              </td>
              <td className="min-w-[170px] px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {problems.length > 0 ? (
                    problems.slice(0, 4).map((label) => (
                      <Badge key={label} variant="outline" className="border-warning/30 bg-warning/10 font-normal text-warning-foreground">
                        {label}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="border-success/20 bg-success/10 font-normal text-success">
                      ok
                    </Badge>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={readinessBadgeStatus(event.readinessSummary)} label={labelReadiness(event.readinessSummary)} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={status.status} label={status.label} />
              </td>
              <td className="px-4 py-3 text-right">
                <Button asChild size="sm" variant="ghost" className="h-8 px-2">
                  <Link to={detailHref(event.id, suggestedDetailTab(event))} aria-label={`Открыть ${event.title}`}>
                    <ArrowRight className="h-4 w-4" />
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
            Всего: {formatNumber(total)} · страница {page} / {totalPages}
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

function MetricCard({
  title,
  value,
  hint,
  tone = 'default',
  icon: Icon,
  loading,
}: {
  title: string;
  value?: number;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  icon?: React.ElementType;
  loading?: boolean;
}) {
  return (
    <Card
      className={cn(
        'border-border p-3',
        tone === 'success' && 'border-success/20 bg-success/5',
        tone === 'warning' && 'border-warning/30 bg-warning/10',
        tone === 'danger' && 'border-destructive/20 bg-destructive/5',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{loading ? '-' : formatNumber(value)}</div>
          {hint ? <div className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</div> : null}
        </div>
        {Icon ? <Icon className="mt-1 h-4 w-4 text-muted-foreground" /> : null}
      </div>
    </Card>
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
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
      >
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </div>
  );
}
