import { AlertTriangle, CheckCircle, Clock, Eye, EyeOff, Plus, Trash2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { EmptyState, ErrorState, FilterBar, LoadingState, PageHeader, SectionCard, StatusBadge } from '@daibilet/shared-ui';

import { Button } from '@/components/ui/button';

import { api } from '../../lib/api';

const STATUS_ICONS: Record<string, { icon: any; label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  APPROVED: { icon: CheckCircle, label: 'Одобрено', tone: 'success' },
  AUTO_APPROVED: { icon: CheckCircle, label: 'Авто', tone: 'success' },
  PENDING_REVIEW: { icon: Clock, label: 'На модерации', tone: 'warning' },
  REJECTED: { icon: XCircle, label: 'Отклонено', tone: 'danger' },
  DRAFT: { icon: EyeOff, label: 'Черновик', tone: 'neutral' },
};

export default function EventsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [trustInfo, setTrustInfo] = useState<{ activeEventsCount: number; activeEventsLimit: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [query, setQuery] = useState<string>(searchParams.get('q') || '');
  const [readinessFilter, setReadinessFilter] = useState<string>(searchParams.get('readiness') || 'all');

  const loadEvents = (status = statusFilter) => {
    setLoading(true);
    setLoadError(null);
    api
      .get<{ items: any[]; total: number }>(`/supplier/events${status !== 'all' ? `?status=${encodeURIComponent(status)}` : ''}`)
      .then((res) => {
        setEvents(res.items);
        setTotal(res.total);
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Не удалось загрузить события');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api
      .get<{
        trust?: { activeEventsCount: number; activeEventsLimit: number };
      }>('/supplier/dashboard')
      .then((res) => {
        if (res.trust && typeof res.trust.activeEventsCount === 'number' && typeof res.trust.activeEventsLimit === 'number') {
          setTrustInfo({
            activeEventsCount: res.trust.activeEventsCount,
            activeEventsLimit: res.trust.activeEventsLimit,
          });
        }
      })
      .catch(() => {
        setTrustInfo(null);
      });
  }, []);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (statusFilter !== 'all') next.set('status', statusFilter);
    else next.delete('status');
    if (readinessFilter !== 'all') next.set('readiness', readinessFilter);
    else next.delete('readiness');
    if (query.trim()) next.set('q', query.trim());
    else next.delete('q');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, readinessFilter, query]);

  useEffect(() => {
    loadEvents(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleDelete = async (event: any) => {
    if (!event.id) return;
    const status = event.moderationStatus as string;
    if (!['DRAFT', 'REJECTED'].includes(status)) return;
    if (!window.confirm('Удалить это событие? Его нельзя будет восстановить из кабинета поставщика.')) return;
    setDeletingId(event.id);
    try {
      await api.del(`/supplier/events/${event.id}`);
      loadEvents();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Не удалось удалить событие');
    } finally {
      setDeletingId(null);
    }
  };

  const visibleEvents = events.filter((event) => {
    const q = query.trim().toLowerCase();
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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Мои события"
        subtitle={`Всего: ${total}`}
        actions={
          <Button asChild>
            <Link to="/events/new">
              <Plus className="h-4 w-4" />
              Создать событие
            </Link>
          </Button>
        }
      />

      {trustInfo && trustInfo.activeEventsLimit > 0 && (
        <SectionCard>
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <AlertTriangle
                className={`h-4 w-4 ${
                  trustInfo.activeEventsCount >= trustInfo.activeEventsLimit ? 'text-red-500' : 'text-amber-500'
                }`}
              />
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-medium text-slate-900">
                Лимит активных событий: {trustInfo.activeEventsCount} из {trustInfo.activeEventsLimit}
              </p>
              <p className="text-xs text-slate-600">
                {trustInfo.activeEventsCount >= trustInfo.activeEventsLimit
                  ? 'Вы достигли текущего лимита. Чтобы опубликовать новые события, деактивируйте часть существующих или улучшите уровень доверия через заполнение профиля и работу с каталогом.'
                  : 'По мере роста уровня доверия лимит будет увеличиваться автоматически.'}
              </p>
            </div>
          </div>
        </SectionCard>
      )}

      <FilterBar
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
          className="h-9 w-[240px] rounded-md border px-3 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border px-3 text-sm"
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
          className="h-9 rounded-md border px-3 text-sm"
        >
          <option value="all">Любая готовность</option>
          <option value="issues">Есть проблемы</option>
          <option value="ready">Готово к публикации</option>
        </select>
      </FilterBar>

      {loading && <LoadingState label="Загружаем ваши события..." />}

      {!loading && loadError && (
        <ErrorState
          title="Не удалось загрузить события"
          description={loadError}
          action={
            <Button type="button" variant="outline" onClick={() => loadEvents()}>
              Повторить
            </Button>
          }
        />
      )}

      {!loading && !loadError && visibleEvents.length === 0 && (
        <EmptyState title="У вас пока нет событий" description="Создайте первое событие, чтобы начать продажи." />
      )}

      {!loadError && visibleEvents.length > 0 && (
        <SectionCard>
          {visibleEvents.map((event) => {
            const st = STATUS_ICONS[event.moderationStatus] || STATUS_ICONS.DRAFT;
            const canDelete = ['DRAFT', 'REJECTED'].includes(event.moderationStatus);
            const rating = event.rating != null ? Number(event.rating) : 0;
            const reviewsCount = typeof event.reviewCount === 'number' ? event.reviewCount : event._count?.reviews || 0;
            const hasRating = reviewsCount > 0 && rating > 0;
            const readinessLabel = !event.imageUrl || (event._count?.offers || 0) === 0 ? 'Требует доработки' : 'Готово';

            return (
              <div key={event.id} className="flex items-center gap-4 p-4 transition-colors hover:bg-gray-50">
                <Link to={`/events/${event.id}`} className="flex flex-1 items-center gap-4">
                  {event.imageUrl ? (
                    <img src={event.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100">
                      <Eye className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{event.title}</p>
                    <p className="text-sm text-gray-500">
                      {event.city?.name} | {event._count?.offers || 0} офферов
                      {hasRating && (
                        <>
                          {' '}
                          · Рейтинг {rating.toFixed(1)} ({reviewsCount})
                        </>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{readinessLabel}</p>
                  </div>
                  <span className="inline-flex items-center gap-1">
                    <st.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <StatusBadge tone={st.tone} label={st.label} />
                  </span>
                  {event.moderationNote && (
                    <span className="max-w-[200px] truncate text-xs text-red-500">{event.moderationNote}</span>
                  )}
                </Link>
                {canDelete && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(event)}
                    disabled={deletingId === event.id}
                    className="border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                    {deletingId === event.id ? 'Удаление…' : 'Удалить'}
                  </Button>
                )}
              </div>
            );
          })}
        </SectionCard>
      )}
    </div>
  );
}
