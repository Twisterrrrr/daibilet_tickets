import * as React from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { DataTableShell, EmptyState, PageHeader, ReadinessChecklist, SourceBadge, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getEvent, listEvents, patchEventActivation, patchEventHide, patchEventMedia, type ListEventsQuery } from '@/modules/events/api/events';
import { buildEventClassification } from '@/modules/events/adapters/event-taxonomy';
import { EventClassificationForm } from '@/modules/events/components/EventClassificationForm';
import type { AdminExternalPurchaseEntryDto, EventDetailDto, EventListItemDto } from '@/modules/events/types';
import { TagGroupsGrid } from '@/modules/taxonomy/components';
import { ArrowLeft, CalendarDays, ExternalLink, Eye, EyeOff, Image, MapPin, RefreshCw, Save, Ticket } from 'lucide-react';

type TabKey = 'overview' | 'classification' | 'schedule' | 'media' | 'source';
type BadgeStatus = 'draft' | 'ready' | 'live' | 'paused' | 'incomplete' | 'error';

const EVENT_DETAIL_TAB_IDS: TabKey[] = ['overview', 'classification', 'schedule', 'media', 'source'];

const TABS: Array<{ id: TabKey; label: string }> = [
  { id: 'overview', label: 'Обзор' },
  { id: 'classification', label: 'Классификация' },
  { id: 'schedule', label: 'Расписание' },
  { id: 'media', label: 'Медиа' },
  { id: 'source', label: 'Источник' },
];

const PURCHASE_STATUS_LABELS: Record<string, string> = {
  READY: 'Готово',
  MISSING: 'Не настроено',
  INVALID: 'Некорректно',
  DISABLED: 'Отключено',
  PROVIDER_UNSUPPORTED: 'Провайдер не поддержан',
};

const PURCHASE_ENTRY_LABELS: Record<string, string> = {
  WIDGET: 'Виджет',
  DEEPLINK: 'Внешняя ссылка',
  NONE: 'Нет',
};

const PROVIDER_LABELS: Record<string, string> = {
  TICKETSCLOUD: 'Ticketscloud',
  TEPLOHOD: 'Teplohod.info',
  INTERNAL: 'Внутренний',
  UNKNOWN: 'Неизвестно',
};

const BLOCKING_REASON_LABELS: Record<string, string> = {
  NO_ACTIVE_OFFER: 'Нет активного оффера',
  PURCHASE_TYPE_NOT_WIDGET_OR_REDIRECT: 'Тип оффера не виджет и не редирект',
  MISSING_WIDGET_PAYLOAD: 'Нет параметров виджета',
  INVALID_WIDGET_PAYLOAD: 'Некорректные параметры виджета',
  MISSING_DEEPLINK: 'Нет deeplink',
  INVALID_DEEPLINK: 'Некорректный deeplink',
  MISSING_PURCHASE_LINK: 'Нет ссылки покупки',
  MISSING_PROVIDER: 'Не указан провайдер',
  UNSUPPORTED_PURCHASE_TYPE: 'Тип покупки не поддерживается',
};

function statusFromEvent(e: EventDetailDto): BadgeStatus {
  if (!e.isActive) return 'draft';
  if (e.override?.isHidden) return 'paused';
  return 'live';
}

function labelEventStatus(e: EventDetailDto): string {
  if (!e.isActive) return 'черновик';
  if (e.override?.isHidden) return 'скрыто';
  return 'активно';
}

function sourceBadgeValue(source: string | null | undefined): 'ticketscloud' | 'teplohod' | 'manual' {
  const s = String(source ?? '').toUpperCase();
  if (s === 'TC' || s === 'TICKETSCLOUD') return 'ticketscloud';
  if (s === 'TEPLOHOD') return 'teplohod';
  return 'manual';
}

function backendReadinessBadgeStatus(status?: string | null): BadgeStatus {
  if (status === 'READY') return 'live';
  if (status === 'NEEDS_WORK') return 'incomplete';
  if (status === 'BLOCKED') return 'error';
  return 'draft';
}

function formatNumber(value?: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
}

function formatMoney(value?: number | null): string {
  if (value == null || value <= 0) return '-';
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(value / 100)) + ' ₽';
}

function formatDateTime(value?: string | number | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function safeHttpHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString();
  } catch {
    return null;
  }
  return null;
}

function widgetPayloadPresent(payload: Record<string, unknown> | null | undefined): boolean {
  return Boolean(payload && typeof payload === 'object' && Object.keys(payload).length > 0);
}

function minPositive(values: Array<number | null | undefined>): number | null {
  const clean = values.filter((v): v is number => typeof v === 'number' && v > 0);
  return clean.length ? Math.min(...clean) : null;
}

function eventSourceLabel(source: string | null | undefined): string {
  const normalized = sourceBadgeValue(source);
  if (normalized === 'ticketscloud') return 'Ticketscloud';
  if (normalized === 'teplohod') return 'Teplohod.info';
  return 'Manual';
}

function labelPurchaseStatus(status?: string | null): string {
  if (!status) return '-';
  return PURCHASE_STATUS_LABELS[status] ?? status;
}

function labelEntryType(entryType?: string | null): string {
  if (!entryType) return '-';
  return PURCHASE_ENTRY_LABELS[entryType] ?? entryType;
}

function labelProvider(provider?: string | null): string {
  if (!provider) return '-';
  return PROVIDER_LABELS[provider] ?? provider;
}

function labelBlockingReason(code: string): string {
  return BLOCKING_REASON_LABELS[code] ?? code;
}

function summarizePurchase(event: EventDetailDto): AdminExternalPurchaseEntryDto | null {
  return event.externalPurchaseEntry ?? null;
}

function sanitizeReturnTo(value: string | null): string {
  if (!value) return '/admin-v4/events';
  if (!value.startsWith('/admin-v4/events')) return '/admin-v4/events';
  if (value.startsWith('//') || value.includes('://')) return '/admin-v4/events';
  return value;
}

function eventsQueryFromReturnTo(returnTo: string): ListEventsQuery {
  const url = new URL(returnTo, 'http://admin.local');
  const p = url.searchParams;
  const query: ListEventsQuery = {
    page: Math.max(1, parseInt(p.get('page') ?? '1', 10) || 1),
    limit: 50,
    lite: true,
  };

  const search = p.get('q')?.trim();
  if (search) query.search = search;

  const active = p.get('active');
  if (active === 'true' || active === 'false') query.active = active;

  const source = p.get('source');
  if (source && source !== 'all') query.source = source;

  const hidden = p.get('hidden');
  if (hidden === 'true' || hidden === 'false') query.hidden = hidden;

  const isPast = p.get('isPast');
  if (isPast === 'true' || isPast === 'false') query.isPast = isPast;

  const isArchived = p.get('isArchived');
  if (isArchived === 'true' || isArchived === 'false') query.isArchived = isArchived;

  if (p.get('missingImage') === 'true') query.missingImage = 'true';

  const hasFutureSessions = p.get('hasFutureSessions');
  if (hasFutureSessions === 'true' || hasFutureSessions === 'false') query.hasFutureSessions = hasFutureSessions;

  const needsAttention = p.get('needsAttention');
  if (needsAttention === 'true' || needsAttention === 'false') query.needsAttention = needsAttention;

  const readyToPublish = p.get('readyToPublish');
  if (readyToPublish === 'true' || readyToPublish === 'false') query.readyToPublish = readyToPublish;

  const purchaseReadiness = p.get('purchaseReadiness');
  if (purchaseReadiness === 'READY' || purchaseReadiness === 'NOT_READY' || purchaseReadiness === 'MISSING') {
    query.purchaseReadiness = purchaseReadiness;
  }

  return query;
}

function detailHref(eventId: string, returnTo: string): string {
  return `/admin-v4/events/${eventId}?returnTo=${encodeURIComponent(returnTo)}`;
}

type QueueNavState = {
  currentPosition?: number;
  total: number;
  next?: EventListItemDto;
  nextHref?: string;
};

export function EventDetailPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab') as TabKey | null;
  const tab: TabKey = rawTab && EVENT_DETAIL_TAB_IDS.includes(rawTab) ? rawTab : 'overview';
  const backHref = sanitizeReturnTo(params.get('returnTo'));

  const [data, setData] = React.useState<EventDetailDto | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [mutating, setMutating] = React.useState(false);
  const [mutateError, setMutateError] = React.useState('');
  const [imageUrlDraft, setImageUrlDraft] = React.useState('');
  const [queueNav, setQueueNav] = React.useState<QueueNavState | null>(null);
  const [queueLoading, setQueueLoading] = React.useState(false);

  const setTab = (nextTab: TabKey) => {
    const next = new URLSearchParams(params);
    next.set('tab', nextTab);
    setParams(next, { replace: true });
  };

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await getEvent(id);
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки события');
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const loadQueueNav = React.useCallback(async () => {
    if (!id) return;
    setQueueLoading(true);
    try {
      const query = eventsQueryFromReturnTo(backHref);
      const page = query.page ?? 1;
      const limit = query.limit ?? 50;
      const currentPage = await listEvents(query);
      const index = currentPage.items.findIndex((item) => item.id === id);
      const totalPages = Math.max(1, Math.ceil((currentPage.total ?? 0) / limit));
      let next = index >= 0 ? currentPage.items[index + 1] : currentPage.items.find((item) => item.id !== id);

      if (!next && index >= 0 && page < totalPages) {
        const nextPage = await listEvents({ ...query, page: page + 1 });
        next = nextPage.items.find((item) => item.id !== id);
      }

      setQueueNav({
        currentPosition: index >= 0 ? (page - 1) * limit + index + 1 : undefined,
        total: currentPage.total ?? 0,
        next,
        nextHref: next ? detailHref(next.id, backHref) : undefined,
      });
    } catch {
      setQueueNav(null);
    } finally {
      setQueueLoading(false);
    }
  }, [backHref, id]);

  React.useEffect(() => {
    void loadQueueNav();
  }, [loadQueueNav]);

  const e = data;
  const effectiveImageUrl = e?.override?.imageUrl ?? e?.imageUrl ?? null;

  React.useEffect(() => {
    if (!e) return;
    setImageUrlDraft(String(effectiveImageUrl ?? ''));
  }, [e?.id, effectiveImageUrl]);

  const sessions = React.useMemo(() => [...(e?.sessions ?? [])].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()), [e]);
  const offers = React.useMemo(() => (e?.offers ?? []).filter((o) => !o.isDeleted), [e]);
  const now = Date.now();
  const futureSessions = sessions.filter((s) => new Date(s.startsAt).getTime() > now && s.isActive !== false && !s.canceledAt);
  const pastSessions = sessions.filter((s) => new Date(s.startsAt).getTime() <= now || s.canceledAt);
  const activeOffers = offers.filter((o) => (o.status ?? '').toUpperCase() === 'ACTIVE');
  const classification = e ? buildEventClassification(e) : null;
  const purchase = e ? summarizePurchase(e) : null;
  const priceFrom = e ? e.priceFromMin ?? minPositive([e.priceFrom, ...offers.map((o) => o.priceFrom)]) : null;

  const publishReadiness = React.useMemo(() => {
    if (!e) return null;

    const hasCategory = Boolean((e.override?.category ?? e.category ?? '').trim());
    const hasPrimarySubcategory = Boolean(classification?.primarySubcategory);
    const hasVenue = Boolean(e.venue?.id ?? e.venueShort?.id);
    const hasImage = Boolean((effectiveImageUrl ?? '').trim());
    const hasFutureSessions = futureSessions.length > 0 || (e.futureSessionsCount ?? 0) > 0;
    const hasPrice = Boolean(priceFrom && priceFrom > 0);
    const purchaseReady = purchase ? purchase.status === 'READY' && purchase.isValid : activeOffers.length > 0;

    return [
      { id: 'category', label: 'Категория', done: hasCategory, hint: hasCategory ? undefined : 'Заполните категорию события' },
      { id: 'primary', label: 'PRIMARY подкатегория', done: hasPrimarySubcategory, hint: hasPrimarySubcategory ? undefined : 'Нужна основная подкатегория для витрины' },
      { id: 'venue', label: 'Площадка', done: hasVenue, hint: hasVenue ? undefined : 'Нет связанной площадки' },
      { id: 'image', label: 'Обложка', done: hasImage, hint: hasImage ? undefined : 'Добавьте override.imageUrl' },
      { id: 'schedule', label: 'Будущие сеансы', done: hasFutureSessions, hint: hasFutureSessions ? undefined : 'Нет будущих активных сеансов' },
      { id: 'price', label: 'Цена', done: hasPrice, hint: hasPrice ? undefined : 'Нет положительной цены' },
      {
        id: 'purchase',
        label: 'Внешняя покупка',
        done: purchaseReady,
        hint: purchaseReady ? undefined : 'Проверьте оффер, виджет или deeplink поставщика',
      },
    ];
  }, [activeOffers.length, classification?.primarySubcategory, e, effectiveImageUrl, futureSessions.length, priceFrom, purchase]);

  async function toggleHidden() {
    if (!e) return;
    setMutateError('');
    setMutating(true);
    try {
      await patchEventHide(e.id, { isHidden: !Boolean(e.override?.isHidden) });
      await load();
      await loadQueueNav();
    } catch (err: unknown) {
      setMutateError(err instanceof Error ? err.message : 'Не удалось изменить видимость');
    } finally {
      setMutating(false);
    }
  }

  async function toggleActive() {
    if (!e) return;
    setMutateError('');
    setMutating(true);
    try {
      await patchEventActivation(e.id, { isActive: !Boolean(e.isActive) });
      await load();
      await loadQueueNav();
    } catch (err: unknown) {
      setMutateError(err instanceof Error ? err.message : 'Не удалось изменить активность');
    } finally {
      setMutating(false);
    }
  }

  async function saveMedia() {
    if (!e) return;
    setMutateError('');
    setMutating(true);
    try {
      const imageUrl = imageUrlDraft.trim();
      await patchEventMedia(e.id, { imageUrl: imageUrl ? imageUrl : null });
      await load();
      await loadQueueNav();
    } catch (err: unknown) {
      setMutateError(err instanceof Error ? err.message : 'Не удалось сохранить обложку');
    } finally {
      setMutating(false);
    }
  }

  return (
    <>
      <PageHeader
        title={e ? e.title : 'Событие'}
        description={e ? e.slug : undefined}
        meta={
          e ? (
            <>
              <SourceBadge source={sourceBadgeValue(e.source)} />
              <StatusBadge status={statusFromEvent(e)} label={labelEventStatus(e)} />
              {e.override?.isHidden ? (
                <Badge variant="outline" className="border-warning/30 bg-warning/10 font-normal text-warning-foreground">
                  скрыто из каталога
                </Badge>
              ) : null}
              {e.city ? (
                <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                  <MapPin className="mr-1 h-3.5 w-3.5" />
                  {e.city.name}
                </Badge>
              ) : null}
              <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                id: <span className="ml-1 font-mono">{e.id}</span>
              </Badge>
            </>
          ) : null
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to={backHref}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                К списку
              </Link>
            </Button>
            <Button size="sm" variant="ghost" onClick={load} disabled={loading} aria-label="Обновить">
              <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            </Button>
            {e?.slug ? (
              <>
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/events/${e.slug}?preview=1`} target="_blank" rel="noreferrer">
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/events/${e.slug}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Public
                  </Link>
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      {error ? <div className="mb-3 text-sm text-destructive">{error}</div> : null}
      {mutateError ? <div className="mb-3 text-sm text-destructive">{mutateError}</div> : null}

      {!e && loading ? (
        <Card className="border-border p-6 text-sm text-muted-foreground">Загрузка события...</Card>
      ) : null}

      {e ? (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <MetricCard title="Источник" value={eventSourceLabel(e.source)} hint={e.supplier?.name ?? e.importMeta?.sourceExternalId ?? undefined} />
            <MetricCard title="Будущие сеансы" value={formatNumber(e.futureSessionsCount ?? futureSessions.length)} hint={`всего ${formatNumber(sessions.length)}`} />
            <MetricCard title="Офферы" value={formatNumber(offers.length)} hint={`${formatNumber(activeOffers.length)} active`} />
            <MetricCard title="Цена от" value={formatMoney(priceFrom)} hint="по внешнему офферу" />
            <MetricCard title="Покупка" value={labelPurchaseStatus(purchase?.status)} hint={purchase ? labelEntryType(purchase.entryType) : 'нет externalPurchaseEntry'} />
            <MetricCard title="Готовность" value={e.readiness?.status ?? e.readinessSummary?.status ?? '-'} hint={`score ${e.readiness?.score ?? e.readinessSummary?.score ?? '-'}`} />
          </div>

          <Card className="mb-3 border-border p-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {TABS.map((item) => {
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={
                      'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ' +
                      (active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:bg-secondary')
                    }
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </Card>

          {tab === 'overview' ? (
            <>
              <Card className="mb-3 border-border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Операторский статус</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Событие импортируется из {eventSourceLabel(e.source)}. Продажи остаются на стороне поставщика, внутри Daibilet checkout не включаем.
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusBadge status={statusFromEvent(e)} label={labelEventStatus(e)} />
                      <SourceBadge source={sourceBadgeValue(e.source)} />
                      <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                        площадка: {e.venue?.title ?? e.venueShort?.name ?? 'не указана'}
                      </Badge>
                      {e.importMeta?.lastSyncedAt ? (
                        <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                          sync: {formatDateTime(e.importMeta.lastSyncedAt)}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={toggleHidden} disabled={mutating}>
                      <EyeOff className="mr-2 h-4 w-4" />
                      {e.override?.isHidden ? 'Показать' : 'Скрыть'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={toggleActive} disabled={mutating}>
                      {e.isActive ? 'Деактивировать' : 'Активировать'}
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="mb-3 border-border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-sm font-medium">Маршрут оператора</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      После правок вернитесь в исходную выборку или откройте одну из рабочих очередей.
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {queueNav?.nextHref ? (
                      <Button size="sm" variant="outline" asChild>
                        <Link to={queueNav.nextHref}>Следующее в очереди</Link>
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled>
                        {queueLoading ? 'Ищем следующий...' : 'Очередь пройдена'}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" asChild>
                      <Link to={backHref}>Вернуться в выборку</Link>
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/admin-v4/events?source=IMPORTED&needsAttention=true&view=needs_attention">Нужно внимание</Link>
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/admin-v4/events?source=IMPORTED&readyToPublish=true&view=ready_publish">К публикации</Link>
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/admin-v4/events?source=IMPORTED&purchaseReadiness=NOT_READY&view=purchase_blocked">Покупка не готова</Link>
                    </Button>
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  {queueNav?.currentPosition
                    ? `Позиция в текущей выборке: ${queueNav.currentPosition} / ${queueNav.total}`
                    : queueNav?.total
                      ? `Текущее событие уже не найдено в выборке, осталось: ${queueNav.total}`
                      : 'В текущей выборке больше нет событий.'}
                  {queueNav?.next ? ` Следующее: ${queueNav.next.title}` : ''}
                </div>
              </Card>

              {purchase ? <ExternalPurchasePanel purchase={purchase} /> : <MissingPurchasePanel source={e.source} activeOffers={activeOffers.length} />}

              {publishReadiness ? (
                <div className="mb-3">
                  <ReadinessChecklist title="Готовность к витрине" items={publishReadiness} />
                </div>
              ) : null}

              {e.readiness ? (
                <Card className="mb-3 border-border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-medium">Backend readiness</div>
                    <StatusBadge status={backendReadinessBadgeStatus(e.readiness.status)} label={e.readiness.status} />
                    <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                      score: {e.readiness.score}
                    </Badge>
                    <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                      source: {e.readiness.classificationSource}
                    </Badge>
                  </div>
                  {e.readiness.issues?.length ? (
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {e.readiness.issues.slice(0, 8).map((issue) => (
                        <div key={`${issue.code}-${issue.message}`} className="rounded-md border border-border bg-secondary/20 p-2 text-xs">
                          <div className="font-mono text-foreground">{issue.code}</div>
                          <div className="mt-1 text-muted-foreground">{issue.message}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-muted-foreground">Блокирующих замечаний backend не вернул.</div>
                  )}
                </Card>
              ) : null}
            </>
          ) : null}

          {tab === 'classification' && classification ? (
            <Card className="mb-3 border-border p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-sm font-medium">Классификация и теги</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Минимум для MVP: категория, одна PRIMARY-подкатегория и аккуратный набор структурных тегов.
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                    type: {classification.eventType}
                  </Badge>
                  <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                    category: {classification.category ?? '-'}
                  </Badge>
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-sm lg:grid-cols-2">
                <InfoRow label="PRIMARY" value={classification.primarySubcategory ? `${classification.primarySubcategory.name} · ${classification.primarySubcategory.slug}` : '-'} />
                <InfoRow label="SECONDARY" value={classification.secondarySubcategories.length ? classification.secondarySubcategories.map((s) => s.slug).join(', ') : '-'} />
              </div>

              <div className="mt-4">
                <TagGroupsGrid
                  groups={{
                    THEME: classification.tagsByGroup.THEME,
                    FORMAT: classification.tagsByGroup.FORMAT,
                    AUDIENCE: classification.tagsByGroup.AUDIENCE,
                    LANGUAGE: classification.tagsByGroup.LANGUAGE,
                    SPECIAL: classification.tagsByGroup.SPECIAL,
                    SEASON: classification.tagsByGroup.SEASON,
                    POPULAR: classification.tagsByGroup.POPULAR,
                    UNKNOWN: classification.tagsByGroup.UNKNOWN,
                  }}
                  showOther={false}
                  showUnknown
                />
              </div>

              {classification.unknownTagGroups.length ? (
                <div className="mt-3 text-xs text-warning-foreground">
                  Неизвестные группы тегов: {classification.unknownTagGroups.map((x) => `${x.group}:${x.tagSlug}`).join(', ')}
                </div>
              ) : null}

              <EventClassificationForm
                event={e}
                onUpdated={(next) => {
                  setData(next);
                  void loadQueueNav();
                }}
              />
            </Card>
          ) : null}

          {tab === 'schedule' ? (
            <div className="grid gap-3 xl:grid-cols-2">
              <DataTableShell
                columns={['Сеанс', 'Дата', 'Статус', 'Отмена']}
                loading={loading}
                empty={!loading && sessions.length === 0 ? <EmptyState icon={CalendarDays} title="Сеансов нет" description="Импорт не вернул расписание для события." /> : null}
              >
                {sessions.slice(0, 200).map((session) => (
                  <tr key={session.id} className="border-b border-border/60 hover:bg-secondary/40">
                    <td className="px-4 py-3 font-mono text-xs">{session.id}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(session.startsAt)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{session.isActive === false ? 'inactive' : 'active'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{session.canceledAt ? formatDateTime(session.canceledAt) : '-'}</td>
                  </tr>
                ))}
              </DataTableShell>

              <DataTableShell
                columns={['Оффер', 'Источник', 'Оператор', 'Цена', 'Sessions', 'Статус']}
                loading={loading}
                empty={!loading && offers.length === 0 ? <EmptyState icon={Ticket} title="Офферов нет" description="Нет внешнего оффера для покупки." /> : null}
              >
                {offers.map((offer) => (
                  <tr key={offer.id} className="border-b border-border/60 hover:bg-secondary/40">
                    <td className="px-4 py-3 font-mono text-xs">{offer.id}</td>
                    <td className="px-4 py-3">
                      <SourceBadge source={sourceBadgeValue(offer.source)} />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{offer.operator?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{formatMoney(offer.priceFrom)}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{offer._count?.sessions ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{offer.status ?? '-'}</td>
                  </tr>
                ))}
              </DataTableShell>

              <Card className="border-border p-4 xl:col-span-2">
                <div className="grid gap-2 text-sm md:grid-cols-4">
                  <InfoRow label="Будущие" value={formatNumber(e.futureSessionsCount ?? futureSessions.length)} />
                  <InfoRow label="Прошедшие/отмененные" value={formatNumber(pastSessions.length)} />
                  <InfoRow label="Ближайший" value={formatDateTime(e.nextSessionAt ?? futureSessions[0]?.startsAt)} />
                  <InfoRow label="Последний" value={formatDateTime(e.lastSessionAt ?? sessions[sessions.length - 1]?.startsAt)} />
                </div>
              </Card>
            </div>
          ) : null}

          {tab === 'media' ? (
            <Card className="mb-3 border-border p-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div>
                  <div className="text-sm font-medium">Обложка события</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Для импортированных событий сохраняем только override.imageUrl, исходные данные поставщика не меняем.
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input value={imageUrlDraft} onChange={(ev) => setImageUrlDraft(ev.target.value)} placeholder="https://..." className="h-9" />
                    <Button size="sm" onClick={saveMedia} disabled={mutating}>
                      <Save className="mr-2 h-4 w-4" />
                      Сохранить
                    </Button>
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    Текущее значение: {effectiveImageUrl ? <span className="font-mono">{effectiveImageUrl}</span> : '-'}
                  </div>
                </div>
                <div className="overflow-hidden rounded-md border border-border bg-secondary/20">
                  {effectiveImageUrl ? (
                    <img src={effectiveImageUrl} alt="" className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center text-muted-foreground">
                      <Image className="h-8 w-8" />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ) : null}

          {tab === 'source' ? (
            <Card className="mb-3 border-border p-4">
              <div className="text-sm font-medium">Источник и импорт</div>
              <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                <InfoRow label="Source" value={e.source} />
                <InfoRow label="External id" value={e.importMeta?.sourceExternalId ?? '-'} />
                <InfoRow label="Last synced" value={formatDateTime(e.importMeta?.lastSyncedAt)} />
                <InfoRow label="Sync status" value={e.importMeta?.syncStatus ?? '-'} />
                <InfoRow label="Supplier" value={e.supplier ? `${e.supplier.name} · ${e.supplier.slug}` : '-'} />
                <InfoRow label="Indexable" value={e.isIndexable == null ? '-' : e.isIndexable ? 'yes' : 'no'} />
              </div>
              <pre className="mt-4 max-h-[420px] overflow-auto rounded-md border border-border bg-secondary/30 p-3 text-[11px] text-muted-foreground">
                {JSON.stringify(
                  {
                    id: e.id,
                    source: e.source,
                    importMeta: e.importMeta,
                    override: e.override,
                    readiness: e.readiness,
                    externalPurchaseEntry: e.externalPurchaseEntry
                      ? { ...e.externalPurchaseEntry, widgetPayload: widgetPayloadPresent(e.externalPurchaseEntry.widgetPayload) ? '[present]' : null }
                      : null,
                  },
                  null,
                  2,
                )}
              </pre>
            </Card>
          ) : null}
        </>
      ) : null}
    </>
  );
}

function ExternalPurchasePanel({ purchase }: { purchase: AdminExternalPurchaseEntryDto }) {
  const href = safeHttpHref(purchase.deeplink);

  return (
    <Card className="mb-3 border-border p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-sm font-medium">Внешняя покупка</div>
          <div className="mt-1 text-xs text-muted-foreground">Покупатель уходит в виджет или ссылку поставщика. Внутреннюю оплату не показываем.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={purchase.status === 'READY' && purchase.isValid ? 'live' : 'error'} label={labelPurchaseStatus(purchase.status)} />
          <Badge variant="outline" className="border-border font-normal text-muted-foreground">
            {labelEntryType(purchase.entryType)}
          </Badge>
          <Badge variant="outline" className="border-border font-normal text-muted-foreground">
            {labelProvider(purchase.provider)}
          </Badge>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
        <InfoRow label="Configured" value={purchase.isConfigured ? 'yes' : 'no'} />
        <InfoRow label="Valid" value={purchase.isValid ? 'yes' : 'no'} />
        <InfoRow label="Widget payload" value={widgetPayloadPresent(purchase.widgetPayload) ? 'present' : '-'} />
      </div>

      {href ? (
        <div className="mt-3">
          <Button size="sm" variant="outline" asChild>
            <a href={href} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Открыть deeplink
            </a>
          </Button>
        </div>
      ) : null}

      {purchase.blockingReasons.length ? (
        <div className="mt-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground">
          {purchase.blockingReasons.map((reason) => (
            <div key={reason}>{labelBlockingReason(reason)}</div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function MissingPurchasePanel({ source, activeOffers }: { source: string; activeOffers: number }) {
  return (
    <Card className="mb-3 border-border p-4">
      <div className="text-sm font-medium">Внешняя покупка</div>
      <div className="mt-1 text-xs text-muted-foreground">
        Backend не вернул externalPurchaseEntry. Для {eventSourceLabel(source)} это означает, что оператор должен сверить офферы и источник.
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="outline" className="border-border font-normal text-muted-foreground">
          active offers: {activeOffers}
        </Badge>
        <StatusBadge status={activeOffers > 0 ? 'incomplete' : 'error'} label={activeOffers > 0 ? 'нужна проверка' : 'нет оффера'} />
      </div>
    </Card>
  );
}

function MetricCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <Card className="border-border p-3">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="mt-1 truncate text-lg font-semibold tabular-nums text-foreground">{value}</div>
      {hint ? <div className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</div> : null}
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-secondary/20 px-3 py-2">
      <div className="text-[11px] uppercase text-muted-foreground">{label}</div>
      <div className="mt-0.5 break-words text-sm text-foreground">{value}</div>
    </div>
  );
}
