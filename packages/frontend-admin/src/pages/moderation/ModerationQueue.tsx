import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminApi } from '@/api/client';
import { CheckCircle, XCircle, Clock, Eye } from 'lucide-react';

export function ModerationQueuePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = () => {
    adminApi.get('/admin/moderation/queue').then((res: any) => {
      setEvents(res.items || []);
      setTotal(res.total || 0);
    });
  };

  useEffect(() => { load(); }, []);

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
      <h1 className="text-xl font-semibold">Очередь модерации ({total})</h1>

      {/* Reject dialog */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-[400px] space-y-4 shadow-xl">
            <h3 className="font-semibold">Причина отклонения</h3>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} placeholder="Укажите причину..." />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setRejectId(null); setRejectReason(''); }}
                className="px-4 py-2 border rounded-lg text-sm">Отмена</button>
              <button onClick={reject} disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50">Отклонить</button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card divide-y">
        {events.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            Нет событий на модерации
          </div>
        )}
        {events.map((event) => (
          <div key={event.id} className="p-4 flex items-start gap-4">
            {event.imageUrl ? (
              <img src={event.imageUrl} alt="" className="w-20 h-20 rounded-lg object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                <Eye className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium">{event.title}</h3>
                {event.moderationStatus === 'PENDING_REVIEW' && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Ожидает
                  </span>
                )}
                {event.moderationStatus === 'AUTO_APPROVED' && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                    Авто (пост-модерация)
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {event.city?.name} | Оператор: {event.operator?.companyName || event.operator?.name || '—'}
                {' '} (Trust: {event.operator?.trustLevel})
                {' '} | {event._count?.offers || 0} офферов
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => approve(event.id)}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700">
                <CheckCircle className="h-3.5 w-3.5" /> Одобрить
              </button>
              <button onClick={() => setRejectId(event.id)}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700">
                <XCircle className="h-3.5 w-3.5" /> Отклонить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
