import { AlertTriangle, CheckCircle, Clock, Eye, EyeOff, Plus, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState, LoadingState, PageHeader, SectionCard } from '@daibilet/shared-ui';

import { api } from '../../lib/api';

const STATUS_ICONS: Record<string, any> = {
  APPROVED: { icon: CheckCircle, color: 'text-green-600', label: 'Одобрено' },
  AUTO_APPROVED: { icon: CheckCircle, color: 'text-blue-600', label: 'Авто' },
  PENDING_REVIEW: { icon: Clock, color: 'text-orange-500', label: 'На модерации' },
  REJECTED: { icon: XCircle, color: 'text-red-500', label: 'Отклонено' },
  DRAFT: { icon: EyeOff, color: 'text-gray-400', label: 'Черновик' },
};

export default function EventsList() {
  const [events, setEvents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [trustInfo, setTrustInfo] = useState<{ activeEventsCount: number; activeEventsLimit: number } | null>(null);

  useEffect(() => {
    setLoading(true);

    api
      .get<{ items: any[]; total: number }>('/supplier/events')
      .then((res) => {
        setEvents(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));

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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Мои события"
        subtitle={`Всего: ${total}`}
        actions={
          <Link
            to="/events/new"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Создать событие
          </Link>
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

      {!loading && events.length === 0 && (
        <EmptyState title="У вас пока нет событий" description="Создайте первое событие, чтобы начать продажи." />
      )}

      {events.length > 0 && (
        <SectionCard>
          {events.map((event) => {
            const st = STATUS_ICONS[event.moderationStatus] || STATUS_ICONS.DRAFT;
            return (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-gray-50"
              >
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
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <st.icon className={`h-4 w-4 ${st.color}`} />
                  <span className={`text-xs ${st.color}`}>{st.label}</span>
                </div>
                {event.moderationNote && (
                  <span className="max-w-[200px] truncate text-xs text-red-500">{event.moderationNote}</span>
                )}
              </Link>
            );
          })}
        </SectionCard>
      )}
    </div>
  );
}
