import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Lock, Pencil, Plus, RefreshCcw, Trash2, XCircle } from 'lucide-react';

import { adminApi } from '@/api/client';
import { CreateSessionDialog } from '@/components/events/CreateSessionDialog';
import { DeleteSessionDialog } from '@/components/events/DeleteSessionDialog';
import { EditSessionDialog } from '@/components/events/EditSessionDialog';
import { CancelSessionDialog } from '@/components/events/StopSessionDialog';
import { DragLayer } from '@/components/events/DragLayer';
import { useSessionDrag } from '@/components/events/useSessionDrag';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDateRu, formatTimeRu, LockReason } from '@/lib/sessions';

export type AdminEventSessionRow = {
  id: string;
  startsAt: string;
  endsAt?: string | null;
  capacity?: number | null;
  soldCount: number;
  locked: boolean;
  lockReason?: LockReason;
  isCancelled: boolean;
  canceledAt?: string | null;
  cancelReason?: string | null;
};

type AdminEventSessionsRange = {
  eventId: string;
  from: string;
  to: string;
  cancelledCount: number;
  rows: AdminEventSessionRow[];
};

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function lockLabel(reason?: LockReason) {
  switch (reason) {
    case 'SOLD':
      return 'Есть продажи';
    case 'PAST':
      return 'Прошло';
    case 'IMPORTED':
      return 'Импорт';
    case 'OTHER':
      return 'Заблокировано';
    default:
      return 'Заблокировано';
  }
}

function lockTooltip(reason?: LockReason) {
  switch (reason) {
    case 'SOLD':
      return 'Нельзя менять/удалять: есть продажи.';
    case 'PAST':
      return 'Нельзя менять/удалять: сеанс уже прошёл.';
    case 'IMPORTED':
      return 'Нельзя менять/удалять: импортный сеанс.';
    default:
      return 'Действие недоступно.';
  }
}

async function fetchSessionsRange(eventId: string, from?: string, to?: string, includeCancelled?: boolean) {
  const qs = new URLSearchParams();
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  if (includeCancelled) qs.set('includeCancelled', '1');
  const q = qs.toString() ? `?${qs.toString()}` : '';
  return adminApi.get<AdminEventSessionsRange>(`/admin/events/${eventId}/sessions${q}`);
}

type Props = {
  eventId: string;
  eventSource?: string;
  defaultDays?: 30 | 90 | 180;
  onEditSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
};

export function ScheduleTab({
  eventId,
  eventSource,
  defaultDays = 30,
  onEditSession,
  onDeleteSession,
}: Props) {
  const [from, setFrom] = useState<string>(() => isoToday());
  const [to, setTo] = useState<string>(() => addDaysIso(isoToday(), defaultDays));
  const [editing, setEditing] = useState<AdminEventSessionRow | null>(null);
  const [deleting, setDeleting] = useState<AdminEventSessionRow | null>(null);
  const [stopping, setStopping] = useState<AdminEventSessionRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [includeCancelled, setIncludeCancelled] = useState(false);

  const query = useQuery({
    queryKey: ['admin', 'eventSessionsRange', eventId, from, to, includeCancelled],
    queryFn: () => fetchSessionsRange(eventId, from, to, includeCancelled),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  const rows = useMemo(() => query.data?.rows ?? [], [query.data]);
  const cancelledCount = query.data?.cancelledCount ?? 0;
  const isImported = eventSource && eventSource !== 'MANUAL';

  const gridConfig = useMemo(
    () => ({
      slotMinutes: 15,
      slotPx: 24,
      dayStartHour: 8,
      dayEndHourExclusive: 24,
    }),
    [],
  );

  const todayDateStr = isoToday();

  const intervalsForDay = useMemo(() => {
    const dayRows = rows.filter((r) => isoToDateInput(r.startsAt) === todayDateStr);
    return dayRows.map((r) => {
      const start = new Date(r.startsAt).getTime();
      const end =
        r.endsAt != null ? new Date(r.endsAt).getTime() : start + gridConfig.slotMinutes * 60_000;
      return {
        sessionId: r.id,
        startMs: start,
        endMs: end,
        isCancelled: r.isCancelled,
        isLocked: !!r.locked,
      };
    });
  }, [rows, gridConfig.slotMinutes, todayDateStr]);

  const { drag, onSessionPointerDown, cancelDrag } = useSessionDrag({
    config: gridConfig,
    intervalsForDay,
    canDragSession: (sessionId) => {
      const s = rows.find((r) => r.id === sessionId);
      if (!s) return false;
      if (isImported) return false;
      if (s.locked || s.isCancelled) return false;
      return true;
    },
    getSessionById: (sessionId) => {
      const s = rows.find((r) => r.id === sessionId);
      if (!s) return null;
      // В PR2-9 не делаем полноценную тайм-линию, поэтому позиция ghost условная,
      // но стабильная по отношению к таблице.
      const index = rows.findIndex((r) => r.id === sessionId);
      const topPx = 240 + index * 40; // грубая привязка к строке таблицы
      const leftPx = 200;
      const widthPx = 260;
      const heightPx = 32;
      return {
        startIso: s.startsAt,
        endIso: s.endsAt ?? undefined,
        topPx,
        leftPx,
        widthPx,
        heightPx,
        dayDate: isoToDateInput(s.startsAt),
      };
    },
    onDropValid: (sessionId, prefillStartIso) => {
      const s = rows.find((r) => r.id === sessionId);
      if (!s) return;
      // Открываем диалог редактирования; PR2-9: пользователь подтверждает время руками.
      setEditing(s);
      // В следующем PR можно добавить prefillStartIso в EditDialog.
    },
  });

  const preset = (days: 30 | 90 | 180) => {
    const f = isoToday();
    setFrom(f);
    setTo(addDaysIso(f, days));
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Расписание
            </CardTitle>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => preset(30)}>
                30 дней
              </Button>
              <Button variant="outline" size="sm" onClick={() => preset(90)}>
                90 дней
              </Button>
              <Button variant="outline" size="sm" onClick={() => preset(180)}>
                180 дней
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => query.refetch()}
                disabled={query.isFetching}
                className="gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                Обновить
              </Button>

              {!isImported && (
                <Button variant="default" size="sm" className="gap-2" onClick={() => setCreating(true)}>
                  <Plus className="h-4 w-4" />
                  Добавить сеанс
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Период:</span>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px]" />
              <span className="text-muted-foreground">—</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[150px]" />
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border border-input bg-background text-primary"
                checked={includeCancelled}
                onChange={(e) => setIncludeCancelled(e.target.checked)}
              />
              <span>
                Показывать отменённые
                {cancelledCount > 0 ? ` (${cancelledCount})` : ''}
              </span>
            </label>

            {isImported && (
              <div className="text-xs text-muted-foreground">
                Импортное событие: сеансы доступны только для просмотра.
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {query.isLoading && <div className="text-sm text-muted-foreground">Загрузка сеансов…</div>}

          {query.isError && <div className="text-sm text-destructive">Не удалось загрузить сеансы.</div>}

          {!query.isLoading && !query.isError && rows.length === 0 && (
            <div className="text-sm text-muted-foreground">В выбранном диапазоне сеансов нет.</div>
          )}

          {!query.isLoading && !query.isError && rows.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Время</TableHead>
                    <TableHead className="text-right">Вместимость</TableHead>
                    <TableHead className="text-right">Продано</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const date = formatDateRu(r.startsAt);
                    const time = formatTimeRu(r.startsAt);
                    const cap = r.capacity ?? '—';
                    const sold = r.soldCount ?? 0;

                    const locked = !!r.locked;
                    const isCancelled = !!r.isCancelled;
                    const reason = r.lockReason;

                    let statusBadge;
                    if (isCancelled) {
                      const canceledAtLabel = r.canceledAt ? `${formatDateRu(r.canceledAt)} ${formatTimeRu(r.canceledAt)}` : '';
                      const tooltipLines: string[] = ['Сеанс отменён.'];
                      if (r.cancelReason) {
                        tooltipLines.push(`Причина: ${r.cancelReason}.`);
                      }
                      if (canceledAtLabel) {
                        tooltipLines.push(`Дата отмены: ${canceledAtLabel}.`);
                      }
                      statusBadge = (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Отменён
                            </Badge>
                          </TooltipTrigger>
                          {tooltipLines.length > 0 && (
                            <TooltipContent className="space-y-1">
                              {tooltipLines.map((line) => (
                                <p key={line}>{line}</p>
                              ))}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      );
                    } else if (locked) {
                      statusBadge = (
                        <Badge variant="destructive" className="gap-1">
                          <Lock className="h-3 w-3" />
                          {lockLabel(reason)}
                        </Badge>
                      );
                    } else {
                      statusBadge = <Badge variant="outline">Можно редактировать</Badge>;
                    }

                    const canEdit = !locked && !isImported && !isCancelled;
                    const canCancel = !locked && !isImported && !isCancelled;
                    let canDelete = false;
                    if (isCancelled) {
                      canDelete = !isImported && r.soldCount === 0;
                    } else {
                      canDelete = !isImported && !locked;
                    }

                    return (
                      <TableRow
                        key={r.id}
                        className={isCancelled ? 'opacity-60' : undefined}
                        onPointerDown={(e) => onSessionPointerDown(e as any, r.id)}
                      >
                        <TableCell className="font-medium">{date}</TableCell>
                        <TableCell>{time}</TableCell>
                        <TableCell className="text-right">{cap}</TableCell>
                        <TableCell className="text-right">{sold}</TableCell>
                        <TableCell>{statusBadge}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!canEdit}
                                    onClick={() => setEditing(r)}
                                    className="gap-2"
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Изменить
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {!canEdit && (
                                <TooltipContent>
                                  {isImported
                                    ? 'Импортное событие: редактирование недоступно.'
                                    : lockTooltip(reason)}
                                </TooltipContent>
                              )}
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!canCancel}
                                    onClick={() => setStopping(r)}
                                    className="gap-2"
                                  >
                                    <XCircle className="h-4 w-4" />
                                    Отменить
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {!canCancel && (
                                <TooltipContent>
                                  {isImported
                                    ? 'Импортное событие: отмена недоступна.'
                                    : lockTooltip(reason)}
                                </TooltipContent>
                              )}
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                      disabled={!canDelete}
                                    onClick={() => setDeleting(r)}
                                    className="gap-2"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Удалить
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {!canDelete && (
                                <TooltipContent>
                                  {isImported
                                    ? 'Импортное событие: удаление недоступно.'
                                    : lockTooltip(reason)}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <EditSessionDialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        eventId={eventId}
        session={editing}
        defaultStartIso={drag.phase === 'dragging' && drag.sessionId === editing?.id ? drag.proposed.startIso : undefined}
      />

      <DeleteSessionDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        eventId={eventId}
        session={deleting}
      />

      <CancelSessionDialog
        open={!!stopping}
        onOpenChange={(open) => {
          if (!open) setStopping(null);
        }}
        eventId={eventId}
        session={stopping}
      />

      <CreateSessionDialog
        open={creating}
        onOpenChange={(open) => {
          if (!open) setCreating(false);
        }}
        eventId={eventId}
      />

      <DragLayer drag={drag} />
    </TooltipProvider>
  );
}

