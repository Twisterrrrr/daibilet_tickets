import * as React from 'react';
import { cn } from '@/shared/lib/cn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export type EventRowStatus = 'draft' | 'review' | 'published' | 'archived';
export type EventSource = 'imported' | 'api' | 'manual' | string;
export type EventReadiness = 'ready' | 'needs-work' | 'blocked';

export interface EventListRowData {
  id: string;
  title: string;
  slug: string;

  city?: string | null;
  venueName?: string | null;
  source: EventSource;
  status: EventRowStatus;
  isActive: boolean;

  categoryLabel?: string | null;
  subcategories?: string[];

  readiness: {
    state: EventReadiness;
    score: number; // 0..100
    issues: string[];
  };

  commerce?: {
    priceFrom?: string | null;
    activeOffersCount?: number;
  };

  schedule?: {
    modeLabel?: string | null;
    nextSessionLabel?: string | null;
    futureSessionsCount?: number;
  };
}

export function EventsListRow({
  item,
  selected = false,
  onSelect,
  onOpen,
  onArchive,
}: {
  item: EventListRowData;
  selected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
  onOpen?: (id: string) => void;
  onArchive?: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        'grid min-h-[92px] grid-cols-[40px_1.8fr_220px_220px_220px_124px] items-stretch border-b bg-background',
        selected && 'bg-muted/30',
      )}
    >
      <div className="flex items-center justify-center px-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect?.(item.id, e.target.checked)}
          aria-label={`Select ${item.title}`}
        />
      </div>

      <div className="flex min-w-0 items-center px-3 py-3">
        <EventIdentityCell item={item} onOpen={onOpen} />
      </div>

      <div className="flex items-center px-3 py-3">
        <EventReadinessCell readiness={item.readiness} />
      </div>

      <div className="flex items-center px-3 py-3">
        <EventCommerceCell commerce={item.commerce} />
      </div>

      <div className="flex items-center px-3 py-3">
        <EventScheduleCell schedule={item.schedule} />
      </div>

      <div className="flex items-center justify-end gap-2 px-3 py-3">
        <Button type="button" size="sm" variant="outline" onClick={() => onOpen?.(item.id)}>
          Открыть
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onArchive?.(item.id)}>
          В архив
        </Button>
      </div>
    </div>
  );
}

function EventIdentityCell({ item, onOpen }: { item: EventListRowData; onOpen?: (id: string) => void }) {
  const showSource = (() => {
    const s = String(item.source || '').toUpperCase();
    if (!s || s === 'MANUAL') return null;
    if (s === 'TICKETSCLOUD') return 'TC';
    if (s === 'TEPLOHOD') return 'TEP';
    return s;
  })();

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpen?.(item.id)}
            className="block max-w-full text-left text-sm font-semibold leading-5 hover:underline"
            title={item.title}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {item.title}
          </button>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {item.city ? <span className="truncate">{item.city}</span> : null}
            {item.venueName ? <span className="truncate">{item.venueName}</span> : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge status={item.status} />
        {showSource ? (
          <Badge variant="outline" className="font-mono text-[11px]">
            {showSource}
          </Badge>
        ) : null}
        {item.isActive ? <Badge variant="outline">Активно</Badge> : <Badge variant="outline">Неактивно</Badge>}
        {item.categoryLabel ? (
          <Badge variant="outline" className="max-w-[220px] truncate">
            {item.categoryLabel}
          </Badge>
        ) : null}
      </div>

      {item.subcategories?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {item.subcategories.slice(0, 3).map((sub) => (
            <Badge key={sub} variant="outline" className="font-normal">
              {sub}
            </Badge>
          ))}
          {item.subcategories.length > 3 ? <Badge variant="outline">+{item.subcategories.length - 3}</Badge> : null}
        </div>
      ) : null}
    </div>
  );
}

function EventReadinessCell({ readiness }: { readiness: EventListRowData['readiness'] }) {
  const labelMap: Record<EventReadiness, string> = {
    ready: 'Ок',
    'needs-work': 'Нужна проверка',
    blocked: 'Блок',
  };

  const tone: Record<EventReadiness, 'outline' | 'warning' | 'danger'> = {
    ready: 'outline',
    'needs-work': 'warning',
    blocked: 'danger',
  };

  const clamped = Math.max(0, Math.min(100, Math.round(readiness.score)));

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={tone[readiness.state]}>{labelMap[readiness.state]}</Badge>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{clamped}%</span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full',
            readiness.state === 'ready' && 'bg-emerald-500',
            readiness.state === 'needs-work' && 'bg-amber-500',
            readiness.state === 'blocked' && 'bg-red-500',
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>

      {readiness.issues.length ? (
        <div className="flex flex-wrap gap-1.5">
          {readiness.issues.slice(0, 2).map((issue) => (
            <Badge key={issue} variant="outline" className="max-w-[180px] truncate">
              {issue}
            </Badge>
          ))}
          {readiness.issues.length > 2 ? <Badge variant="outline">+{readiness.issues.length - 2}</Badge> : null}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">К публикации готово</div>
      )}
    </div>
  );
}

function EventCommerceCell({ commerce }: { commerce: EventListRowData['commerce'] | undefined }) {
  const priceFrom = commerce?.priceFrom ?? null;
  const offers = commerce?.activeOffersCount;
  return (
    <div className="w-full space-y-2">
      <div className="text-sm font-medium">{priceFrom ? `от ${priceFrom}` : 'Цена не задана'}</div>
      {typeof offers === 'number' ? (
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">Категорий с ценой: {offers}</Badge>
        </div>
      ) : null}
    </div>
  );
}

function EventScheduleCell({ schedule }: { schedule: EventListRowData['schedule'] | undefined }) {
  return (
    <div className="w-full space-y-2">
      <div className="text-sm font-medium">{schedule?.modeLabel ?? 'Расписание'}</div>
      <div className="text-sm text-muted-foreground">{schedule?.nextSessionLabel ?? 'Нет ближайшего сеанса'}</div>
      {typeof schedule?.futureSessionsCount === 'number' ? (
        <div className="text-xs text-muted-foreground">Будущих сеансов: {schedule.futureSessionsCount}</div>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: EventRowStatus }) {
  const map: Record<EventRowStatus, { label: string; className: string }> = {
    draft: { label: 'Draft', className: 'border-transparent bg-muted text-foreground' },
    review: {
      label: 'Review',
      className: 'border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
    },
    published: {
      label: 'Published',
      className: 'border-transparent bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
    },
    archived: {
      label: 'Archived',
      className: 'border-transparent bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    },
  };
  const cfg = map[status];
  return <Badge className={cn('font-medium', cfg.className)}>{cfg.label}</Badge>;
}

