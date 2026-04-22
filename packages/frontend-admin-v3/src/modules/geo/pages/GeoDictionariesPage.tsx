import { adminApi } from '@/api/client';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

type CityOption = { id: string; slug: string; name: string };

type District = { id: string; cityId: string; name: string; slug: string; description: string | null };
type MetroStation = {
  id: string;
  cityId: string;
  name: string;
  slug: string;
  lineName: string | null;
  lineColor: string | null;
};

type TabId = 'districts' | 'metro';

export function GeoDictionariesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = React.useState<TabId>('districts');
  const [cityId, setCityId] = React.useState<string>('');

  const citiesQ = useQuery({
    queryKey: ['admin-cities-options-v3'],
    queryFn: async () => {
      const res = await adminApi.get<{ items: CityOption[] }>('/admin/cities?limit=1000');
      return res.items ?? [];
    },
    staleTime: 60_000,
  });

  React.useEffect(() => {
    if (cityId) return;
    const first = (citiesQ.data ?? [])[0];
    if (first?.id) setCityId(first.id);
  }, [cityId, citiesQ.data]);

  const districtsQ = useQuery({
    queryKey: ['admin-geo-districts-v3', cityId],
    queryFn: async () => {
      if (!cityId) return [];
      const res = await adminApi.get<{ items: District[] }>(`/admin/geo/districts?cityId=${encodeURIComponent(cityId)}`);
      return res.items ?? [];
    },
    enabled: Boolean(cityId),
    staleTime: 10_000,
  });

  const metroQ = useQuery({
    queryKey: ['admin-geo-metro-v3', cityId],
    queryFn: async () => {
      if (!cityId) return [];
      const res = await adminApi.get<{ items: MetroStation[] }>(
        `/admin/geo/metro-stations?cityId=${encodeURIComponent(cityId)}`,
      );
      return res.items ?? [];
    },
    enabled: Boolean(cityId),
    staleTime: 10_000,
  });

  const [createError, setCreateError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [districtDraft, setDistrictDraft] = React.useState({ name: '', slug: '', description: '' });
  const [metroDraft, setMetroDraft] = React.useState({ name: '', slug: '', lineName: '', lineColor: '' });

  const canUse = Boolean(cityId);

  async function invalidate() {
    await qc.invalidateQueries({ queryKey: ['admin-geo-districts-v3', cityId] });
    await qc.invalidateQueries({ queryKey: ['admin-geo-metro-v3', cityId] });
  }

  if (citiesQ.isLoading && !citiesQ.data) return <LoadingState label="Загрузка…" />;
  if (citiesQ.isError) {
    return (
      <ErrorState
        title="Не удалось загрузить города"
        description={citiesQ.error instanceof Error ? citiesQ.error.message : 'Ошибка'}
        onRetry={() => citiesQ.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="География" subtitle="Справочники районов и метро (переход от строк в карточке площадки)" />

      <section className="rounded-lg border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 sm:col-span-1">
            <span className="text-xs text-muted-foreground">Город</span>
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
            >
              {(citiesQ.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.slug})
                </option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-2 flex flex-wrap items-end gap-2">
            <Button type="button" size="sm" variant={tab === 'districts' ? 'secondary' : 'outline'} onClick={() => setTab('districts')}>
              Районы
            </Button>
            <Button type="button" size="sm" variant={tab === 'metro' ? 'secondary' : 'outline'} onClick={() => setTab('metro')}>
              Метро
            </Button>
          </div>
        </div>
      </section>

      {tab === 'districts' ? (
        <section className="rounded-lg border bg-card p-4 space-y-3">
          <div className="font-medium">Районы</div>

          <div className="grid gap-2 sm:grid-cols-4">
            <input
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              placeholder="Название"
              value={districtDraft.name}
              onChange={(e) => setDistrictDraft((s) => ({ ...s, name: e.target.value }))}
            />
            <input
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              placeholder="Слаг"
              value={districtDraft.slug}
              onChange={(e) => setDistrictDraft((s) => ({ ...s, slug: e.target.value }))}
            />
            <input
              className="h-9 rounded-md border border-input bg-background px-2 text-sm sm:col-span-2"
              placeholder="Описание (необязательно)"
              value={districtDraft.description}
              onChange={(e) => setDistrictDraft((s) => ({ ...s, description: e.target.value }))}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!canUse || saving}
              onClick={async () => {
                setCreateError(null);
                setSaving(true);
                try {
                  await adminApi.post('/admin/geo/districts', {
                    cityId,
                    name: districtDraft.name,
                    slug: districtDraft.slug,
                    description: districtDraft.description || undefined,
                  });
                  setDistrictDraft({ name: '', slug: '', description: '' });
                  await invalidate();
                } catch (e) {
                  setCreateError(e instanceof Error ? e.message : 'Ошибка создания');
                } finally {
                  setSaving(false);
                }
              }}
            >
              Добавить
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => void districtsQ.refetch()}>
              Обновить
            </Button>
          </div>

          {createError ? <div className="text-sm text-destructive">{createError}</div> : null}

          {districtsQ.isLoading && !districtsQ.data ? (
            <LoadingState label="Загрузка районов…" />
          ) : districtsQ.isError ? (
            <ErrorState
              title="Не удалось загрузить районы"
              description={districtsQ.error instanceof Error ? districtsQ.error.message : 'Ошибка'}
              onRetry={() => districtsQ.refetch()}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2">Название</th>
                    <th className="px-2 py-2">Слаг</th>
                    <th className="px-2 py-2">Описание</th>
                    <th className="w-24 px-2 py-2">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {(districtsQ.data ?? []).map((d) => (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="px-2 py-2">{d.name}</td>
                      <td className="px-2 py-2 font-mono text-xs">{d.slug}</td>
                      <td className="px-2 py-2 text-xs text-muted-foreground">{d.description ?? '—'}</td>
                      <td className="px-2 py-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={saving}
                          onClick={async () => {
                            setSaving(true);
                            setCreateError(null);
                            try {
                              await adminApi.delete(`/admin/geo/districts/${d.id}`);
                              await invalidate();
                            } catch (e) {
                              setCreateError(e instanceof Error ? e.message : 'Ошибка удаления');
                            } finally {
                              setSaving(false);
                            }
                          }}
                        >
                          Удалить
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {tab === 'metro' ? (
        <section className="rounded-lg border bg-card p-4 space-y-3">
          <div className="font-medium">Метро</div>

          <div className="grid gap-2 sm:grid-cols-4">
            <input
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              placeholder="Название"
              value={metroDraft.name}
              onChange={(e) => setMetroDraft((s) => ({ ...s, name: e.target.value }))}
            />
            <input
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              placeholder="Слаг"
              value={metroDraft.slug}
              onChange={(e) => setMetroDraft((s) => ({ ...s, slug: e.target.value }))}
            />
            <input
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              placeholder="Линия (название)"
              value={metroDraft.lineName}
              onChange={(e) => setMetroDraft((s) => ({ ...s, lineName: e.target.value }))}
            />
            <input
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              placeholder="Цвет линии"
              value={metroDraft.lineColor}
              onChange={(e) => setMetroDraft((s) => ({ ...s, lineColor: e.target.value }))}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!canUse || saving}
              onClick={async () => {
                setCreateError(null);
                setSaving(true);
                try {
                  await adminApi.post('/admin/geo/metro-stations', {
                    cityId,
                    name: metroDraft.name,
                    slug: metroDraft.slug,
                    lineName: metroDraft.lineName || undefined,
                    lineColor: metroDraft.lineColor || undefined,
                  });
                  setMetroDraft({ name: '', slug: '', lineName: '', lineColor: '' });
                  await invalidate();
                } catch (e) {
                  setCreateError(e instanceof Error ? e.message : 'Ошибка создания');
                } finally {
                  setSaving(false);
                }
              }}
            >
              Добавить
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => void metroQ.refetch()}>
              Обновить
            </Button>
          </div>

          {createError ? <div className="text-sm text-destructive">{createError}</div> : null}

          {metroQ.isLoading && !metroQ.data ? (
            <LoadingState label="Загрузка станций…" />
          ) : metroQ.isError ? (
            <ErrorState
              title="Не удалось загрузить станции"
              description={metroQ.error instanceof Error ? metroQ.error.message : 'Ошибка'}
              onRetry={() => metroQ.refetch()}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2">Название</th>
                    <th className="px-2 py-2">Слаг</th>
                    <th className="px-2 py-2">Линия</th>
                    <th className="px-2 py-2">Цвет</th>
                    <th className="w-24 px-2 py-2">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {(metroQ.data ?? []).map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="px-2 py-2">{m.name}</td>
                      <td className="px-2 py-2 font-mono text-xs">{m.slug}</td>
                      <td className="px-2 py-2 text-xs text-muted-foreground">{m.lineName ?? '—'}</td>
                      <td className="px-2 py-2 text-xs text-muted-foreground">{m.lineColor ?? '—'}</td>
                      <td className="px-2 py-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={saving}
                          onClick={async () => {
                            setSaving(true);
                            setCreateError(null);
                            try {
                              await adminApi.delete(`/admin/geo/metro-stations/${m.id}`);
                              await invalidate();
                            } catch (e) {
                              setCreateError(e instanceof Error ? e.message : 'Ошибка удаления');
                            } finally {
                              setSaving(false);
                            }
                          }}
                        >
                          Удалить
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

