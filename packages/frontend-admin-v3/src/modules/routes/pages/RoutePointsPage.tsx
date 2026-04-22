import { adminApi } from '@/api/client';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { Button } from '@/components/ui/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { Link, useParams } from 'react-router-dom';

type RouteDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  pointsOfInterest: string[];
  estimatedMinutes: number | null;
  isActive: boolean;
  updatedAt: string;
  _count: { points: number };
};

type RoutePointRow = {
  id: string;
  routeId: string;
  order: number;
  venueId: string | null;
  eventId: string | null;
  durationMinutes: number | null;
  description: string | null;
  titleOverride: string | null;
  isOptional: boolean;
  venue: { id: string; title: string; slug: string; cityId: string } | null;
  event: { id: string; title: string; slug: string } | null;
};

export function RoutePointsPage() {
  const { routeId } = useParams<{ routeId: string }>();
  const qc = useQueryClient();

  const routeQ = useQuery({
    queryKey: ['admin-route-detail', routeId],
    queryFn: async () => adminApi.get<RouteDetail>(`/admin/routes/${routeId}`),
    enabled: Boolean(routeId),
  });

  const pointsQ = useQuery({
    queryKey: ['admin-route-points', routeId],
    queryFn: async () => adminApi.get<{ items: RoutePointRow[] }>(`/admin/routes/${routeId}/points`),
    enabled: Boolean(routeId),
  });

  const [draft, setDraft] = React.useState({
    kind: 'venue' as 'venue' | 'event',
    venueId: '',
    eventId: '',
    durationMinutes: '',
    description: '',
    titleOverride: '',
    isOptional: false,
  });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editDraft, setEditDraft] = React.useState({
    kind: 'venue' as 'venue' | 'event',
    venueId: '',
    eventId: '',
    durationMinutes: '',
    description: '',
    titleOverride: '',
    isOptional: false,
  });

  const [error, setError] = React.useState<string | null>(null);

  const createM = useMutation({
    mutationFn: async () => {
      if (!routeId) throw new Error('routeId required');
      const venueId = draft.kind === 'venue' ? draft.venueId.trim() : '';
      const eventId = draft.kind === 'event' ? draft.eventId.trim() : '';
      return adminApi.post(`/admin/routes/${routeId}/points`, {
        venueId: venueId || undefined,
        eventId: eventId || undefined,
        durationMinutes: draft.durationMinutes.trim() ? Number(draft.durationMinutes) : undefined,
        description: draft.description.trim() || undefined,
        titleOverride: draft.titleOverride.trim() || undefined,
        isOptional: draft.isOptional,
      });
    },
    onSuccess: async () => {
      setError(null);
      await qc.invalidateQueries({ queryKey: ['admin-route-points', routeId] });
      await qc.invalidateQueries({ queryKey: ['admin-route-detail', routeId] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Ошибка'),
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => adminApi.delete(`/admin/route-points/${id}`),
    onSuccess: async () => {
      setError(null);
      await qc.invalidateQueries({ queryKey: ['admin-route-points', routeId] });
      await qc.invalidateQueries({ queryKey: ['admin-route-detail', routeId] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Ошибка'),
  });

  const patchM = useMutation({
    mutationFn: async (args: { id: string; body: Record<string, unknown> }) => {
      return adminApi.patch(`/admin/route-points/${args.id}`, args.body);
    },
    onSuccess: async () => {
      setError(null);
      setEditingId(null);
      await qc.invalidateQueries({ queryKey: ['admin-route-points', routeId] });
      await qc.invalidateQueries({ queryKey: ['admin-route-detail', routeId] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Ошибка'),
  });

  async function reorderAll(items: RoutePointRow[]) {
    if (!routeId) return;
    setError(null);
    const payload = items.map((p, idx) => ({ id: p.id, order: idx }));
    await adminApi.post(`/admin/routes/${routeId}/points/reorder`, { items: payload });
    await qc.invalidateQueries({ queryKey: ['admin-route-points', routeId] });
  }

  if (!routeId) return <ErrorState title="Некорректный маршрут" description="Не указан routeId." />;

  if (routeQ.isLoading || pointsQ.isLoading) return <LoadingState label="Загрузка…" />;
  if (routeQ.isError) {
    return (
      <ErrorState
        title="Не удалось загрузить маршрут"
        description={routeQ.error instanceof Error ? routeQ.error.message : 'Ошибка'}
        onRetry={() => routeQ.refetch()}
      />
    );
  }
  if (pointsQ.isError) {
    return (
      <ErrorState
        title="Не удалось загрузить точки"
        description={pointsQ.error instanceof Error ? pointsQ.error.message : 'Ошибка'}
        onRetry={() => pointsQ.refetch()}
      />
    );
  }

  const route = routeQ.data;
  const items = pointsQ.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={route ? `Маршрут: ${route.name}` : 'Маршрут'}
        subtitle={route ? `${route.slug} · точек: ${route._count.points}` : undefined}
        actions={
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/admin-v3/routes">К списку маршрутов</Link>
          </Button>
        }
      />

      {route?.description ? <div className="text-sm text-muted-foreground whitespace-pre-wrap">{route.description}</div> : null}

      <section className="rounded-lg border bg-card p-4 space-y-3">
        <div className="font-medium">Добавить точку</div>

        <div className="grid gap-2 sm:grid-cols-3">
          <label className="grid gap-1 sm:col-span-1">
            <span className="text-xs text-muted-foreground">Тип привязки</span>
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={draft.kind}
              onChange={(e) => setDraft((s) => ({ ...s, kind: e.target.value as 'venue' | 'event' }))}
            >
              <option value="venue">Venue</option>
              <option value="event">Event</option>
            </select>
          </label>

          {draft.kind === 'venue' ? (
            <label className="grid gap-1 sm:col-span-2">
              <span className="text-xs text-muted-foreground">venueId (uuid)</span>
              <input
                className="h-9 rounded-md border border-input bg-background px-2 text-sm font-mono"
                value={draft.venueId}
                onChange={(e) => setDraft((s) => ({ ...s, venueId: e.target.value }))}
              />
            </label>
          ) : (
            <label className="grid gap-1 sm:col-span-2">
              <span className="text-xs text-muted-foreground">eventId (uuid)</span>
              <input
                className="h-9 rounded-md border border-input bg-background px-2 text-sm font-mono"
                value={draft.eventId}
                onChange={(e) => setDraft((s) => ({ ...s, eventId: e.target.value }))}
              />
            </label>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-4">
          <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">durationMinutes</span>
            <input
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={draft.durationMinutes}
              onChange={(e) => setDraft((s) => ({ ...s, durationMinutes: e.target.value }))}
            />
          </label>
          <label className="grid gap-1 sm:col-span-3">
            <span className="text-xs text-muted-foreground">titleOverride</span>
            <input
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={draft.titleOverride}
              onChange={(e) => setDraft((s) => ({ ...s, titleOverride: e.target.value }))}
            />
          </label>
        </div>

        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">description</span>
          <textarea
            className="min-h-[72px] rounded-md border border-input bg-background px-2 py-2 text-sm"
            value={draft.description}
            onChange={(e) => setDraft((s) => ({ ...s, description: e.target.value }))}
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.isOptional} onChange={(e) => setDraft((s) => ({ ...s, isOptional: e.target.checked }))} />
          optional
        </label>

        {error ? <div className="text-sm text-destructive">{error}</div> : null}

        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={createM.isPending} onClick={() => createM.mutate()}>
            {createM.isPending ? 'Добавление…' : 'Добавить'}
          </Button>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <div className="mb-3 font-medium">Точки (порядок)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">target</th>
                <th className="px-2 py-2">meta</th>
                <th className="w-44 px-2 py-2">actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-8 text-center text-muted-foreground">
                    Пока нет точек
                  </td>
                </tr>
              ) : (
                items.map((p, idx) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-2 py-2 align-top font-mono text-xs">{p.order}</td>
                    <td className="px-2 py-2 align-top">
                      {p.venueId ? (
                        <div>
                          <div className="font-medium">Venue</div>
                          <div className="text-xs text-muted-foreground font-mono">{p.venueId}</div>
                          {p.venue ? (
                            <div className="mt-1 text-xs">
                              {p.venue.title}{' '}
                              {p.venue.slug ? (
                                <span className="text-muted-foreground">({p.venue.slug})</span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium">Event</div>
                          <div className="text-xs text-muted-foreground font-mono">{p.eventId}</div>
                          {p.event ? <div className="mt-1 text-xs">{p.event.title}</div> : null}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 align-top text-xs text-muted-foreground">
                      <div>optional: {p.isOptional ? 'да' : 'нет'}</div>
                      {p.durationMinutes != null ? <div>duration: {p.durationMinutes}m</div> : null}
                      {p.titleOverride ? <div>title: {p.titleOverride}</div> : null}
                      {p.description ? <div className="mt-1 whitespace-pre-wrap">{p.description}</div> : null}
                    </td>
                    <td className="px-2 py-2 align-top">
                      <div className="flex flex-col gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={patchM.isPending}
                          onClick={() => {
                            setError(null);
                            setEditingId(p.id);
                            const kind: 'venue' | 'event' = p.venueId ? 'venue' : 'event';
                            setEditDraft({
                              kind,
                              venueId: p.venueId ?? '',
                              eventId: p.eventId ?? '',
                              durationMinutes: p.durationMinutes != null ? String(p.durationMinutes) : '',
                              description: p.description ?? '',
                              titleOverride: p.titleOverride ?? '',
                              isOptional: p.isOptional,
                            });
                          }}
                        >
                          Редактировать
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={idx === 0}
                          onClick={async () => {
                            const next = [...items];
                            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                            await reorderAll(next);
                          }}
                        >
                          Вверх
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={idx >= items.length - 1}
                          onClick={async () => {
                            const next = [...items];
                            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                            await reorderAll(next);
                          }}
                        >
                          Вниз
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={deleteM.isPending}
                          onClick={() => deleteM.mutate(p.id)}
                        >
                          Удалить
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editingId ? (
        <section className="rounded-lg border bg-card p-4 space-y-3">
          <div className="font-medium">Редактирование точки</div>

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="grid gap-1 sm:col-span-1">
              <span className="text-xs text-muted-foreground">Тип привязки</span>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={editDraft.kind}
                onChange={(e) => setEditDraft((s) => ({ ...s, kind: e.target.value as 'venue' | 'event' }))}
              >
                <option value="venue">Venue</option>
                <option value="event">Event</option>
              </select>
            </label>

            {editDraft.kind === 'venue' ? (
              <label className="grid gap-1 sm:col-span-2">
                <span className="text-xs text-muted-foreground">venueId (uuid)</span>
                <input
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm font-mono"
                  value={editDraft.venueId}
                  onChange={(e) => setEditDraft((s) => ({ ...s, venueId: e.target.value }))}
                />
              </label>
            ) : (
              <label className="grid gap-1 sm:col-span-2">
                <span className="text-xs text-muted-foreground">eventId (uuid)</span>
                <input
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm font-mono"
                  value={editDraft.eventId}
                  onChange={(e) => setEditDraft((s) => ({ ...s, eventId: e.target.value }))}
                />
              </label>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">durationMinutes</span>
              <input
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={editDraft.durationMinutes}
                onChange={(e) => setEditDraft((s) => ({ ...s, durationMinutes: e.target.value }))}
              />
            </label>
            <label className="grid gap-1 sm:col-span-3">
              <span className="text-xs text-muted-foreground">titleOverride</span>
              <input
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={editDraft.titleOverride}
                onChange={(e) => setEditDraft((s) => ({ ...s, titleOverride: e.target.value }))}
              />
            </label>
          </div>

          <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">description</span>
            <textarea
              className="min-h-[72px] rounded-md border border-input bg-background px-2 py-2 text-sm"
              value={editDraft.description}
              onChange={(e) => setEditDraft((s) => ({ ...s, description: e.target.value }))}
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={editDraft.isOptional}
              onChange={(e) => setEditDraft((s) => ({ ...s, isOptional: e.target.checked }))}
            />
            optional
          </label>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={patchM.isPending}
              onClick={() => {
                if (!editingId) return;
                const venueId = editDraft.kind === 'venue' ? editDraft.venueId.trim() : '';
                const eventId = editDraft.kind === 'event' ? editDraft.eventId.trim() : '';
                patchM.mutate({
                  id: editingId,
                  body: {
                    venueId: editDraft.kind === 'venue' ? venueId || null : null,
                    eventId: editDraft.kind === 'event' ? eventId || null : null,
                    durationMinutes: editDraft.durationMinutes.trim() ? Number(editDraft.durationMinutes) : null,
                    description: editDraft.description.trim() ? editDraft.description.trim() : null,
                    titleOverride: editDraft.titleOverride.trim() ? editDraft.titleOverride.trim() : null,
                    isOptional: editDraft.isOptional,
                  },
                });
              }}
            >
              {patchM.isPending ? 'Сохранение…' : 'Сохранить'}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={patchM.isPending} onClick={() => setEditingId(null)}>
              Отмена
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
