import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';

/** Диапазон по умолчанию: с сейчас до +365 дней (лимит бэкенда), только просмотр. */
const RANGE_DAYS = 365;

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
    isActive: boolean;
    canceledAt?: string | null;
    cancelReason?: string | null;
  }>;
};

function remainingPlaces(cap: number | null | undefined, sold: number): string {
  if (cap == null) return '—';
  return String(Math.max(0, cap - sold));
}

function formatRange(fromIso: string, toIso: string): string {
  try {
    const a = new Date(fromIso);
    const b = new Date(toIso);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return '';
    return `${a.toLocaleDateString('ru-RU')} — ${b.toLocaleDateString('ru-RU')}`;
  } catch {
    return '';
  }
}

export function EventScheduleTab({
  eventId,
  importedLocked,
  scheduleSummary,
}: {
  eventId: string;
  importedLocked: boolean;
  scheduleSummary?: { nextSessionAt: string | null; futureSessionsCount: number } | null;
}) {
  const [showCancelled, setShowCancelled] = React.useState(false);

  const q = useQuery({
    queryKey: ['admin-event-sessions-range', eventId, showCancelled],
    queryFn: async () => {
      const from = new Date();
      const to = new Date(from.getTime() + RANGE_DAYS * 24 * 60 * 60 * 1000);
      const sp = new URLSearchParams();
      sp.set('from', from.toISOString());
      sp.set('to', to.toISOString());
      sp.set('includeCancelled', showCancelled ? 'true' : 'false');
      const res = await adminApi.get<SessionsRangeResponse>(
        `/admin/events/${encodeURIComponent(eventId)}/sessions?${sp.toString()}`,
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

  const data = q.data;
  const rows = data?.rows ?? [];
  const now = Date.now();

  const futureAvailableCount = rows.filter((r) => {
    if (r.isCancelled || !r.isActive) return false;
    const t = new Date(r.startsAt).getTime();
    return !Number.isNaN(t) && t >= now;
  }).length;

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Только просмотр.</span> Расписание загружается из API; редактирование здесь не
        предусмотрено.
        {scheduleSummary?.futureSessionsCount != null ? (
          <span className="ml-1">
            По сводке события: будущих активных сеансов ≈{' '}
            <span className="tabular-nums text-foreground">{scheduleSummary.futureSessionsCount}</span>.
          </span>
        ) : null}
      </div>

      {importedLocked ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Импортное событие: изменение слотов из этой админки недоступно; ниже — актуальные сеансы из источника (read-only).
        </div>
      ) : (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Ручное событие: создание и правка сеансов — через API или legacy-админку; здесь только обзор на горизонте {RANGE_DAYS} дней.
        </div>
      )}

      {data ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Период: {formatRange(data.from, data.to)}</span>
          <span>
            В таблице: <span className="tabular-nums text-foreground">{rows.length}</span> слотов
            {showCancelled ? (
              <>
                {' '}
                (отменённых в периоде: <span className="tabular-nums">{data.cancelledCount}</span>)
              </>
            ) : null}
            ; ориентировочно доступных вперёд:{' '}
            <span className="tabular-nums text-foreground">{futureAvailableCount}</span>
          </span>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
            Показывать отменённые
          </label>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Начало</th>
              <th className="px-4 py-3 text-center">Ёмкость</th>
              <th className="px-4 py-3 text-center">Продано</th>
              <th className="px-4 py-3 text-center">Осталось</th>
              <th className="px-4 py-3 text-center">В продаже</th>
              <th className="px-4 py-3 text-center">Блокировка правок</th>
              <th className="px-4 py-3 text-center">Статус</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  Нет сеансов в выбранном диапазоне
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(r.startsAt).toLocaleString('ru-RU')}</td>
                  <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{r.capacity ?? '—'}</td>
                  <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{r.soldCount}</td>
                  <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">
                    {remainingPlaces(r.capacity, r.soldCount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {!r.isCancelled && r.isActive ? (
                      <Badge variant="success">да</Badge>
                    ) : !r.isCancelled && !r.isActive ? (
                      <Badge variant="warning">пауза</Badge>
                    ) : (
                      <Badge variant="outline">—</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                    {r.locked ? (
                      <span title={r.lockReason ?? ''}>{r.lockReason ?? 'да'}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.isCancelled ? (
                      <Badge variant="danger">отменён</Badge>
                    ) : (
                      <Badge variant="outline">не отменён</Badge>
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
