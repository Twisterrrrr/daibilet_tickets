import { CheckCircle, Clock, Eye, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState, PageHeader, SectionCard } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';

type SortBy = 'created_desc' | 'trust_asc';

export function ModerationQueuePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<SortBy>('created_desc');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = () => {
    const params = sortBy === 'trust_asc' ? '?sortBy=trust_asc' : '';
    adminApi.get(`/admin/moderation/queue${params}`).then((res: any) => {
      setEvents(res.items || []);
      setTotal(res.total || 0);
    });
  };

  useEffect(() => {
    load();
  }, [sortBy]);

  const approve = async (id: string) => {
    try {
      await adminApi.post(`/admin/moderation/${id}/approve`);
      toast.success('Событие одобрено');
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const reject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    try {
      await adminApi.post(`/admin/moderation/${rejectId}/reject`, { reason: rejectReason });
      toast.success('Событие отклонено');
      setRejectId(null);
      setRejectReason('');
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Модерация событий"
        subtitle={`В очереди: ${total}`}
      />

      {/* Reject dialog */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[400px] space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <h3 className="font-semibold">Причина отклонения</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              rows={3}
              placeholder="Укажите причину..."
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setRejectId(null);
                  setRejectReason('');
                }}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Отмена
              </button>
              <button
                onClick={reject}
                disabled={!rejectReason.trim()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                Отклонить
              </button>
            </div>
          </div>
        </div>
      )}

      <SectionCard
        headerRight={
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="created_desc">По дате (новые первыми)</option>
            <option value="trust_asc">По trust (низкий приоритет)</option>
          </select>
        }
      >
        {events.length === 0 ? (
          <EmptyState
            title="Нет событий на модерации"
            description="Все отправленные события уже рассмотрены."
          />
        ) : (
          <div className="divide-y">
            {events.map((event) => (
            <div key={event.id} className="flex items-start gap-4 p-4">
              {event.imageUrl ? (
                <img src={event.imageUrl} alt="" className="h-20 w-20 rounded-lg object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-muted">
                  <Eye className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="font-medium">{event.title}</h3>
                  {event.moderationStatus === 'PENDING_REVIEW' && (
                    <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
                      <Clock className="h-3 w-3" /> Ожидает
                    </span>
                  )}
                  {event.moderationStatus === 'AUTO_APPROVED' && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Авто (пост-модерация)</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {event.city?.name} | Оператор: {event.operator?.companyName || event.operator?.name || '—'} (Trust:{' '}
                  {event.operator?.trustLevel}) | {event._count?.offers || 0} офферов
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => approve(event.id)}
                  className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700"
                >
                  <CheckCircle className="h-3.5 w-3.5" /> Одобрить
                </button>
                <button
                  onClick={() => setRejectId(event.id)}
                  className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700"
                >
                  <XCircle className="h-3.5 w-3.5" /> Отклонить
                </button>
              </div>
            </div>
          ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
