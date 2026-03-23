import { AlertTriangle, CheckCircle, Clock, Eye, EyeOff, Plus, Trash2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState, ErrorState, LoadingState, PageHeader, SectionCard, StatusBadge } from '@daibilet/shared-ui';

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
  const [events, setEvents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [trustInfo, setTrustInfo] = useState<{ activeEventsCount: number; activeEventsLimit: number } | null>(null);

  const loadEvents = () => {
    setLoading(true);
    setLoadError(null);
    api
      .get<{ items: any[]; total: number }>('/supplier/events')
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
    setLoading(true);
    loadEvents();

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

      {loading && <LoadingState label="Загружаем ваши события..." />}

      {!loading && loadError && (
        <ErrorState
          title="Не удалось загрузить события"
          description={loadError}
          action={
            <Button type="button" variant="outline" onClick={loadEvents}>
              Повторить
            </Button>
          }
        />
      )}

      {!loading && !loadError && events.length === 0 && (
        <EmptyState title="У вас пока нет событий" description="Создайте первое событие, чтобы начать продажи." />
      )}

      {!loadError && events.length > 0 && (
        <SectionCard>
          {events.map((event) => {
            const st = STATUS_ICONS[event.moderationStatus] || STATUS_ICONS.DRAFT;
            const canDelete = ['DRAFT', 'REJECTED'].includes(event.moderationStatus);
            const rating = event.rating != null ? Number(event.rating) : 0;
            const reviewsCount = typeof event.reviewCount === 'number' ? event.reviewCount : event._count?.reviews || 0;
            const hasRating = reviewsCount > 0 && rating > 0;

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
