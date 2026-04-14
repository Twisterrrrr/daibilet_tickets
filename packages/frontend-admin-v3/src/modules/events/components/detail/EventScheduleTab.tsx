import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';

type SessionsRangeResponse = {
  eventId: string;
  from: string;
  to: string;
  cancelledCount: number;
  rows: Array<{
    id: string;
    startsAt: string;
    endsAt?: string | null;
    capacity?: number | null;
    soldCount: number;
    locked: boolean;
    lockReason?: 'SOLD' | 'PAST' | 'IMPORTED' | 'OTHER';
    isCancelled: boolean;
    canceledAt?: string | null;
    cancelReason?: string | null;
  }>;
};

export function EventScheduleTab({
  eventId,
  importedLocked,
}: {
  eventId: string;
  importedLocked: boolean;
}) {
  const q = useQuery({
    queryKey: ['admin-event-sessions-range', eventId],
    queryFn: async () => {
      const res = await adminApi.get<SessionsRangeResponse>(
        `/admin/events/${encodeURIComponent(eventId)}/sessions?includeCancelled=true`,
      );
      return res;
    },
  });

  if (q.isLoading) {
    return <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">Загрузка расписания…</div>;
  }
  if (q.isError) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
        {q.error instanceof Error ? q.error.message : 'Ошибка загрузки сеансов'}
      </div>
    );
  }

  const rows = q.data?.rows ?? [];

  return (
    <div className="space-y-3">
      {importedLocked ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Импортное событие: создание и правка сеансов через эту админку недоступны (только просмотр).
        </div>
      ) : (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Ручное событие: создание сеансов — через API{' '}
          <span className="font-mono text-xs">POST /admin/events/:id/sessions</span> или смежные инструменты.
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Начало</th>
              <th className="px-4 py-3 text-center">Ёмкость</th>
              <th className="px-4 py-3 text-center">Продано</th>
              <th className="px-4 py-3 text-center">Блокировка</th>
              <th className="px-4 py-3 text-center">Статус</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Нет сеансов в выбранном диапазоне
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="px-4 py-3">{new Date(r.startsAt).toLocaleString('ru-RU')}</td>
                  <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">
                    {r.capacity ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{r.soldCount}</td>
                  <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                    {r.locked ? (
                      <span title={r.lockReason ?? ''}>{r.lockReason ?? 'заблокирован'}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.isCancelled ? (
                      <Badge variant="danger">отменён</Badge>
                    ) : (
                      <Badge variant="outline">активен</Badge>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
