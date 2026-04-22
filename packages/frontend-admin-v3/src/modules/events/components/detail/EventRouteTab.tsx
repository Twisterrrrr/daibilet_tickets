import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import {
  deleteAdminEventRoute,
  fetchAdminEventRoute,
  putAdminEventRoute,
  type AdminEventRouteDto,
  type PutEventRouteBody,
  type RoutePointTargetType,
} from '@/modules/events/api/event-route';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { Link } from 'react-router-dom';

type DraftPoint = {
  key: string;
  targetType: RoutePointTargetType;
  venueId: string;
  eventId: string;
  titleOverride: string;
  description: string;
  durationMinutes: string;
  isOptional: boolean;
};

function emptyPoint(): DraftPoint {
  return {
    key: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `k-${Math.random().toString(36).slice(2)}`,
    targetType: 'VENUE',
    venueId: '',
    eventId: '',
    titleOverride: '',
    description: '',
    durationMinutes: '',
    isOptional: false,
  };
}

function fromDto(d: AdminEventRouteDto['points'][0]): DraftPoint {
  return {
    key: d.id,
    targetType: d.targetType,
    venueId: d.venueId ?? '',
    eventId: d.eventId ?? '',
    titleOverride: d.titleOverride ?? '',
    description: d.description ?? '',
    durationMinutes: d.durationMinutes != null ? String(d.durationMinutes) : '',
    isOptional: d.isOptional,
  };
}

function toPayload(points: DraftPoint[]): PutEventRouteBody['points'] {
  return points.map((p, idx) => ({
    order: idx,
    targetType: p.targetType,
    venueId: p.targetType === 'VENUE' ? p.venueId.trim() : null,
    eventId: p.targetType === 'EVENT' ? p.eventId.trim() : null,
    titleOverride: p.titleOverride.trim() || null,
    description: p.description.trim() || null,
    durationMinutes: p.durationMinutes.trim() ? Number.parseInt(p.durationMinutes, 10) : null,
    isOptional: p.isOptional,
  }));
}

export function EventRouteTab({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['admin-event-route', eventId],
    queryFn: () => fetchAdminEventRoute(eventId),
  });

  const [title, setTitle] = React.useState('');
  const [summary, setSummary] = React.useState('');
  const [isPublished, setIsPublished] = React.useState(false);
  const [version, setVersion] = React.useState(0);
  const [points, setPoints] = React.useState<DraftPoint[]>([]);
  const [draftStarted, setDraftStarted] = React.useState(false);

  React.useEffect(() => {
    if (q.data === undefined) return;
    if (q.data === null) {
      if (!draftStarted) {
        setTitle('');
        setSummary('');
        setVersion(0);
        setPoints([]);
      }
      return;
    }
    const r = q.data;
    setTitle(r.title ?? '');
    setSummary(r.summary ?? '');
    setIsPublished(r.isPublished);
    setVersion(r.version);
    setPoints(r.points.length ? r.points.map(fromDto) : []);
  }, [q.data, draftStarted]);

  React.useEffect(() => {
    setDraftStarted(false);
  }, [eventId]);

  const saveM = useMutation({
    mutationFn: () =>
      putAdminEventRoute(eventId, {
        title: title.trim() || null,
        summary: summary.trim() || null,
        isPublished,
        version: q.data != null ? version : undefined,
        points: toPayload(points),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-event-route', eventId] });
      await qc.invalidateQueries({ queryKey: ['admin-event', eventId] });
    },
  });

  const deleteM = useMutation({
    mutationFn: () => deleteAdminEventRoute(eventId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-event-route', eventId] });
      setTitle('');
      setSummary('');
      setIsPublished(false);
      setPoints([]);
      setDraftStarted(false);
    },
  });

  const move = (idx: number, dir: -1 | 1) => {
    setPoints((prev) => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const n = [...prev];
      [n[idx], n[j]] = [n[j], n[idx]];
      return n;
    });
  };

  if (q.isLoading) return <LoadingState label="Загрузка маршрута…" />;
  if (q.isError) {
    return (
      <ErrorState
        title="Не удалось загрузить маршрут"
        description={q.error instanceof Error ? q.error.message : 'Ошибка'}
        onRetry={() => q.refetch()}
      />
    );
  }

  const hasRoute = Boolean(q.data?.id);
  const warnings = q.data?.warnings ?? [];
  const showEditor = hasRoute || draftStarted;

  return (
    <div className="space-y-6">
      {!hasRoute && !draftStarted ? (
        <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center">
          <div className="text-sm font-medium">Маршрут ещё не создан</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Создайте упорядоченный список точек (площадки или события). Публикация на витрине — только при включённом флаге.
          </p>
          <Button
            type="button"
            className="mt-4"
            onClick={() => {
              setPoints([emptyPoint()]);
              setDraftStarted(true);
            }}
          >
            Создать маршрут
          </Button>
        </div>
      ) : null}

      {showEditor && (
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <div className="text-sm font-medium">Параметры маршрута</div>
          {warnings.length ? (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
              <div className="font-medium">Предупреждения (не блокируют сохранение)</div>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {warnings.map((w, i) => (
                  <li key={`${w.code}-${i}`}>
                    {w.code}
                    {w.message ? ` — ${w.message}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Заголовок</div>
              <input
                className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Напр. Маршрут прогулки"
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
                Опубликовать на витрине
              </label>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Краткое описание</div>
            <textarea
              className="mt-1 min-h-[72px] w-full rounded-md border bg-background p-2 text-sm"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Опционально: вводный текст к маршруту"
            />
          </div>

          <div className="border-t pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">Точки маршрута</div>
              <Button type="button" variant="outline" size="sm" onClick={() => setPoints((p) => [...p, emptyPoint()])}>
                Добавить точку
              </Button>
            </div>
            <div className="mt-4 space-y-4">
              {points.map((p, idx) => (
                <div key={p.key} className="rounded-md border bg-background p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">#{idx + 1}</span>
                    <div className="flex gap-1">
                      <Button type="button" variant="outline" size="sm" disabled={idx === 0} onClick={() => move(idx, -1)}>
                        Вверх
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={idx === points.length - 1}
                        onClick={() => move(idx, 1)}
                      >
                        Вниз
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setPoints((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        Удалить
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Тип цели</div>
                      <select
                        className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                        value={p.targetType}
                        onChange={(e) =>
                          setPoints((prev) =>
                            prev.map((x) =>
                              x.key === p.key ? { ...x, targetType: e.target.value as RoutePointTargetType } : x,
                            ),
                          )
                        }
                      >
                        <option value="VENUE">Площадка</option>
                        <option value="EVENT">Событие</option>
                      </select>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{p.targetType === 'VENUE' ? 'UUID площадки' : 'UUID события'}</div>
                      <input
                        className="mt-1 h-9 w-full rounded-md border bg-background px-2 font-mono text-xs"
                        value={p.targetType === 'VENUE' ? p.venueId : p.eventId}
                        onChange={(e) =>
                          setPoints((prev) =>
                            prev.map((x) =>
                              x.key === p.key
                                ? p.targetType === 'VENUE'
                                  ? { ...x, venueId: e.target.value }
                                  : { ...x, eventId: e.target.value }
                                : x,
                            ),
                          )
                        }
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      />
                    </div>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Заголовок (переопределение)</div>
                      <input
                        className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                        value={p.titleOverride}
                        onChange={(e) =>
                          setPoints((prev) => prev.map((x) => (x.key === p.key ? { ...x, titleOverride: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Длительность (мин)</div>
                      <input
                        className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm tabular-nums"
                        value={p.durationMinutes}
                        onChange={(e) =>
                          setPoints((prev) => prev.map((x) => (x.key === p.key ? { ...x, durationMinutes: e.target.value } : x)))
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-xs text-muted-foreground">Описание точки</div>
                    <textarea
                      className="mt-1 min-h-[56px] w-full rounded-md border bg-background p-2 text-sm"
                      value={p.description}
                      onChange={(e) =>
                        setPoints((prev) => prev.map((x) => (x.key === p.key ? { ...x, description: e.target.value } : x)))
                      }
                    />
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={p.isOptional}
                      onChange={(e) =>
                        setPoints((prev) => prev.map((x) => (x.key === p.key ? { ...x, isOptional: e.target.checked } : x)))
                      }
                    />
                    Опциональная точка
                  </label>
                </div>
              ))}
              {points.length === 0 ? <div className="text-sm text-muted-foreground">Нет точек — добавьте хотя бы одну.</div> : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button
              type="button"
              disabled={saveM.isPending}
              onClick={() => saveM.mutate()}
            >
              {saveM.isPending ? 'Сохранение…' : 'Сохранить маршрут'}
            </Button>
            {hasRoute ? (
              <Button
                type="button"
                variant="destructive"
                disabled={deleteM.isPending}
                onClick={() => {
                  if (!confirm('Удалить маршрут и все точки?')) return;
                  deleteM.mutate();
                }}
              >
                Удалить маршрут
              </Button>
            ) : null}
            <Button type="button" variant="outline" asChild>
              <Link to={`/admin-v3/routes`}>Список маршрутов (legacy)</Link>
            </Button>
          </div>
          {saveM.isError ? (
            <div className="text-sm text-destructive">
              {saveM.error instanceof Error ? saveM.error.message : 'Ошибка сохранения'}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
