import { AlertTriangle, Calendar, CheckCircle, Clock, Eye, EyeOff, Plus, Trash2, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useSupplierEventsList, useSupplierTrustLimit } from '@/shared/hooks/use-supplier-events-list';
import type { SupplierEventRow } from '@/shared/hooks/use-supplier-events-list';
import {
  EmptyState,
  ErrorPanel,
  FilterRow,
  LoadingBlock,
  PageHeader,
  SectionCard,
} from '@/shared/ui/page-primitives';
import { PageGlyph } from '@/shared/ui/page-glyph';
import { cn } from '@/shared/lib/cn';

const STATUS: Record<
  string,
  { icon: typeof CheckCircle; label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  APPROVED: { icon: CheckCircle, label: 'Одобрено', tone: 'success' },
  AUTO_APPROVED: { icon: CheckCircle, label: 'Авто', tone: 'success' },
  PENDING_REVIEW: { icon: Clock, label: 'На модерации', tone: 'warning' },
  REJECTED: { icon: XCircle, label: 'Отклонено', tone: 'danger' },
  DRAFT: { icon: EyeOff, label: 'Черновик', tone: 'neutral' },
};

function StatusChipFixed({ tone, label }: { tone: 'success' | 'warning' | 'danger' | 'neutral'; label: string }) {
  const toneClass = {
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger-foreground',
    neutral: 'bg-surface-alt text-text-muted',
  };
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', toneClass[tone])}>{label}</span>
  );
}

export function EventsListPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [readinessFilter, setReadinessFilter] = useState('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { items, total, loading, error, reload, removeEvent } = useSupplierEventsList(statusFilter);
  const trustInfo = useSupplierTrustLimit();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((event) => {
      const hasReadinessIssue = !event.imageUrl || (event._count?.offers || 0) === 0;
      const matchesReadiness =
        readinessFilter === 'all' ||
        (readinessFilter === 'issues' && hasReadinessIssue) ||
        (readinessFilter === 'ready' && !hasReadinessIssue);
      const matchesSearch =
        !q ||
        String(event.title || '').toLowerCase().includes(q) ||
        String(event.city?.name || '').toLowerCase().includes(q) ||
        String(event.slug || '').toLowerCase().includes(q);
      return matchesSearch && matchesReadiness;
    });
  }, [items, query, readinessFilter]);

  const handleDelete = async (event: SupplierEventRow) => {
    if (!event.id) return;
    const st = event.moderationStatus as string;
    if (!['DRAFT', 'REJECTED'].includes(st)) return;
    if (!window.confirm('Удалить это событие? Восстановить из кабинета будет нельзя.')) return;
    setDeletingId(event.id);
    try {
      await removeEvent(event.id);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Не удалось удалить');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Мои события"
        subtitle={`Всего в каталоге запроса: ${total}`}
        glyph={<PageGlyph icon={Calendar} tone="mint" />}
        actions={
          <Link
            to="/events/new"
            className="inline-flex min-h-control items-center gap-2 rounded-control bg-accent px-4 py-2 text-label font-medium text-accent-foreground shadow-none no-underline transition-opacity hover:opacity-92"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Создать
          </Link>
        }
      />

      {trustInfo && trustInfo.activeEventsLimit > 0 && (
        <SectionCard>
          <div className="flex items-start gap-3">
            <AlertTriangleInline atLimit={trustInfo.activeEventsCount >= trustInfo.activeEventsLimit} />
            <div className="text-small">
              <p className="font-medium text-text-primary">
                Лимит активных: {trustInfo.activeEventsCount} / {trustInfo.activeEventsLimit}
              </p>
              <p className="mt-1 text-text-muted">
                {trustInfo.activeEventsCount >= trustInfo.activeEventsLimit
                  ? 'Достигнут лимит. Деактивируйте события или улучшите уровень доверия.'
                  : 'Лимит будет расти вместе с уровнем доверия.'}
              </p>
            </div>
          </div>
        </SectionCard>
      )}

      <FilterRow
        onReset={() => {
          setStatusFilter('all');
          setQuery('');
          setReadinessFilter('all');
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск: название, URL, город"
          className="h-9 min-w-[200px] rounded-control border border-border-soft px-3 text-small"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-control border border-border-soft px-3 text-small"
        >
          <option value="all">Все статусы</option>
          <option value="PENDING_REVIEW">На модерации</option>
          <option value="REJECTED">Отклонено</option>
          <option value="DRAFT">Черновик</option>
          <option value="AUTO_APPROVED">Авто</option>
          <option value="APPROVED">Одобрено</option>
        </select>
        <select
          value={readinessFilter}
          onChange={(e) => setReadinessFilter(e.target.value)}
          className="h-9 rounded-control border border-border-soft px-3 text-small"
        >
          <option value="all">Готовность</option>
          <option value="issues">Есть проблемы</option>
          <option value="ready">Готово</option>
        </select>
      </FilterRow>

      {loading && <LoadingBlock label="Загружаем события…" />}

      {!loading && error ? (
        <ErrorPanel title="Ошибка" description={error} onRetry={reload} />
      ) : null}

      {!loading && !error && visible.length === 0 ? (
        <EmptyState title="Нет событий по фильтру" description="Измените фильтр или создайте событие." />
      ) : null}

      {!loading && !error && visible.length > 0 ? (
        <SectionCard>
          <div className="divide-y divide-border-soft">
            {visible.map((event) => {
              const st = STATUS[event.moderationStatus] || STATUS.DRAFT;
              const Icon = st.icon;
              const canDelete = ['DRAFT', 'REJECTED'].includes(event.moderationStatus);
              const reviewsCount =
                typeof event.reviewCount === 'number' ? event.reviewCount : event._count?.reviews || 0;
              const rating = event.rating != null ? Number(event.rating) : 0;
              const hasRating = reviewsCount > 0 && rating > 0;
              const readinessLabel =
                !event.imageUrl || (event._count?.offers || 0) === 0 ? 'Требует доработки' : 'Готово';

              return (
                <div key={event.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <Link to={`/events/${event.id}`} className="flex min-w-0 flex-1 items-center gap-4 no-underline">
                    {event.imageUrl ? (
                      <img src={event.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-alt">
                        <Eye className="h-6 w-6 text-text-muted" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-text-primary">{event.title}</p>
                      <p className="text-small text-text-muted">
                        {event.city?.name} · офферов {event._count?.offers || 0}
                        {hasRating ? ` · ★ ${rating.toFixed(1)} (${reviewsCount})` : ''}
                      </p>
                      <p className="text-[11px] text-text-muted">{readinessLabel}</p>
                      {event.moderationNote ? (
                        <p className="mt-1 truncate text-[11px] text-danger-foreground">{event.moderationNote}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Icon className="h-3.5 w-3.5 text-text-muted" />
                      <StatusChipFixed tone={st.tone} label={st.label} />
                    </div>
                  </Link>
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => void handleDelete(event)}
                      disabled={deletingId === event.id}
                      className="shrink-0 rounded-control border border-danger/30 px-3 py-1.5 text-label text-danger hover:bg-danger-soft disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-1">
                        <Trash2 className="h-3 w-3" />
                        {deletingId === event.id ? '…' : 'Удалить'}
                      </span>
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

function AlertTriangleInline({ atLimit }: { atLimit: boolean }) {
  return <AlertTriangle className={cn('mt-0.5 h-4 w-4 shrink-0', atLimit ? 'text-danger' : 'text-warning')} />;
}