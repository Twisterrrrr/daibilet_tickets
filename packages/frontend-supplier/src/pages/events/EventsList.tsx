import { CheckCircle, Clock, Eye, EyeOff, Plus, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

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

  useEffect(() => {
    api.get<{ items: any[]; total: number }>('/supplier/events').then((res) => {
      setEvents(res.items);
      setTotal(res.total);
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Мои события ({total})</h1>
        <Link
          to="/events/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          <Plus className="h-4 w-4" /> Создать событие
        </Link>
      </div>

      <div className="bg-white rounded-xl border divide-y">
        {events.length === 0 && (
          <div className="p-8 text-center text-gray-500">У вас пока нет событий. Создайте первое!</div>
        )}
        {events.map((event) => {
          const st = STATUS_ICONS[event.moderationStatus] || STATUS_ICONS.DRAFT;
          return (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
            >
              {event.imageUrl ? (
                <img src={event.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Eye className="h-6 w-6 text-gray-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{event.title}</p>
                <p className="text-sm text-gray-500">
                  {event.city?.name} | {event._count?.offers || 0} офферов
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <st.icon className={`h-4 w-4 ${st.color}`} />
                <span className={`text-xs ${st.color}`}>{st.label}</span>
              </div>
              {event.moderationNote && (
                <span className="text-xs text-red-500 max-w-[200px] truncate">{event.moderationNote}</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
