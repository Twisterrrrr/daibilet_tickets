import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { HubReadinessPanel } from '@/components/shared/hub-readiness/HubReadinessPanel';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getAdminErrorDisplay } from '@/lib/get-admin-error-message';
import { fetchAdminCity, patchAdminCity, type AdminCityDetail } from '@/modules/cities/api/cities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { Link, useParams } from 'react-router-dom';

type TabId = 'main' | 'content' | 'media' | 'seo' | 'catalog' | 'landings' | 'extra';

const TAB_LABEL: Record<TabId, string> = {
  main: 'Основное',
  content: 'Контент',
  media: 'Медиа',
  seo: 'SEO',
  catalog: 'События и площадки',
  landings: 'Лендинги и связи',
  extra: 'Дополнительно',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

export function CityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = React.useState<TabId>('main');

  const detailQ = useQuery({
    queryKey: ['admin-city-detail', id],
    queryFn: () => fetchAdminCity(id!),
    enabled: Boolean(id),
  });

  const [draft, setDraft] = React.useState<AdminCityDetail | null>(null);
  React.useEffect(() => {
    if (detailQ.data) setDraft(detailQ.data);
  }, [detailQ.data]);

  const saveM = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('Нет данных');
      return patchAdminCity(draft.id, {
        name: draft.name,
        description: draft.description === '' || draft.description == null ? undefined : draft.description,
        heroImage: draft.heroImage === '' || draft.heroImage == null ? undefined : draft.heroImage,
        metaTitle: draft.metaTitle === '' || draft.metaTitle == null ? undefined : draft.metaTitle,
        metaDescription:
          draft.metaDescription === '' || draft.metaDescription == null ? undefined : draft.metaDescription,
        timezone: draft.timezone ?? undefined,
        lat:
          draft.lat === null || draft.lat === undefined || draft.lat === ''
            ? undefined
            : Number(draft.lat as string | number),
        lng:
          draft.lng === null || draft.lng === undefined || draft.lng === ''
            ? undefined
            : Number(draft.lng as string | number),
        isFeatured: draft.isFeatured,
        isActive: draft.isActive,
        isCatalogHub: draft.isCatalogHub,
        catalogHubStatus: draft.catalogHubStatus,
        version: draft.version,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-city-detail', id] });
      await qc.invalidateQueries({ queryKey: ['admin-cities-list'] });
    },
  });

  const siteBase = (import.meta as unknown as { env?: { VITE_PUBLIC_SITE_URL?: string } }).env?.VITE_PUBLIC_SITE_URL?.replace(
    /\/$/,
    '',
  );

  if (!id) {
    return <ErrorState title="Некорректный ID" description="Не указан идентификатор города." />;
  }

  if (detailQ.isLoading) return <LoadingState label="Загрузка города…" />;
  if (detailQ.isError || !draft) {
    const meta = detailQ.error ? getAdminErrorDisplay(detailQ.error) : null;
    return (
      <ErrorState
        title="Не удалось загрузить город"
        description={meta?.title ?? 'Ошибка'}
        onRetry={() => detailQ.refetch()}
      />
    );
  }

  const v = draft;
  const readiness = v.readiness;
  const stats = v.stats;
  const publicPath = v.seo?.publicPath ?? `/cities/${v.slug}`;
  const publicAbs = siteBase ? `${siteBase}${publicPath}` : null;
  const errSave = saveM.error ? getAdminErrorDisplay(saveM.error) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={v.name}
        subtitle={`Город · ${v.slug}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => saveM.mutate()} disabled={saveM.isPending}>
              {saveM.isPending ? 'Сохранение…' : 'Сохранить'}
            </Button>
            {publicAbs ? (
              <Button type="button" size="sm" variant="outline" asChild>
                <a href={publicAbs} target="_blank" rel="noreferrer">
                  Публичная страница
                </a>
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">Публичный URL: {publicPath}</span>
            )}
          </div>
        }
      />

      {errSave ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errSave.title}
        </div>
      ) : null}

      {readiness ? (
        <section className="rounded-lg border bg-card p-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">Готовность</span>
            <Badge variant="outline">{readiness.status}</Badge>
            <span className="text-muted-foreground">{readiness.score}/100</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-destructive">Блокеры</div>
              <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                {readiness.blockers.length ? readiness.blockers.map((x) => <li key={x}>{x}</li>) : <li>—</li>}
              </ul>
            </div>
            <div>
              <div className="text-xs font-medium text-amber-800 dark:text-amber-200">Предупреждения</div>
              <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                {readiness.warnings.length ? readiness.warnings.map((x) => <li key={x}>{x}</li>) : <li>—</li>}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <HubReadinessPanel title="Каталожный хаб (витрина)" snapshot={v.hubReadiness} />

      <div className="flex flex-wrap gap-1 border-b pb-2">
        {(Object.keys(TAB_LABEL) as TabId[]).map((k) => (
          <Button key={k} type="button" size="sm" variant={tab === k ? 'secondary' : 'ghost'} onClick={() => setTab(k)}>
            {TAB_LABEL[k]}
          </Button>
        ))}
      </div>

      {tab === 'main' ? (
        <section className="rounded-lg border bg-card p-5 text-sm space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Название</span>
              <Input value={v.name} onChange={(e) => setDraft({ ...v, name: e.target.value })} />
            </label>
            <Field label="Слаг (только чтение)">
              <span className="font-mono text-xs">{v.slug}</span>
            </Field>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(v.isActive)}
                onChange={(e) => setDraft({ ...v, isActive: e.target.checked })}
              />
              Видимость (активен в справочнике)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(v.isFeatured)}
                onChange={(e) => setDraft({ ...v, isFeatured: e.target.checked })}
              />
              Избранный
            </label>
            <div className="sm:col-span-2 rounded-md border border-dashed p-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Каталожный хаб</div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(v.isCatalogHub)}
                  onChange={(e) => setDraft({ ...v, isCatalogHub: e.target.checked })}
                />
                Город — витринная точка входа в каталог
              </label>
              <label className="flex flex-col gap-1 max-w-xs">
                <span className="text-xs text-muted-foreground">Статус хаба</span>
                <select
                  className="rounded border bg-background px-2 py-1.5 text-sm"
                  value={v.catalogHubStatus ?? 'DISABLED'}
                  onChange={(e) =>
                    setDraft({
                      ...v,
                      catalogHubStatus: e.target.value as 'DRAFT' | 'ACTIVE' | 'DISABLED',
                    })
                  }
                >
                  <option value="DISABLED">Выключен</option>
                  <option value="DRAFT">Черновик</option>
                  <option value="ACTIVE">Активен</option>
                </select>
              </label>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Регионы</div>
            <div className="mt-1 text-sm">
              {(v.regions ?? []).length ? (
                <ul className="list-inside list-disc">
                  {(v.regions ?? []).map((r) => (
                    <li key={r.id}>
                      {r.name} <span className="font-mono text-xs text-muted-foreground">({r.slug})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-muted-foreground">Не привязан к региону (связь RegionCity)</span>
              )}
            </div>
          </div>
          {v.hubForRegions?.length ? (
            <div>
              <div className="text-xs text-muted-foreground">Хаб для регионов</div>
              <ul className="mt-1 list-inside list-disc text-sm">
                {v.hubForRegions.map((r) => (
                  <li key={r.id}>{r.name}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === 'content' ? (
        <section className="rounded-lg border bg-card p-5 text-sm space-y-3">
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Описание / SEO-текст</span>
            <textarea
              className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={v.description ?? ''}
              onChange={(e) => setDraft({ ...v, description: e.target.value })}
            />
          </label>
        </section>
      ) : null}

      {tab === 'media' ? (
        <section className="rounded-lg border bg-card p-5 text-sm space-y-3">
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Главное изображение (URL)</span>
            <Input value={v.heroImage ?? ''} onChange={(e) => setDraft({ ...v, heroImage: e.target.value })} />
          </label>
          {v.heroImage ? (
            <a className="break-all text-primary hover:underline" href={v.heroImage} target="_blank" rel="noreferrer">
              Открыть изображение
            </a>
          ) : null}
          <div className="text-xs text-muted-foreground">
            Медиа-готовность: {v.flags?.hasCover ? 'обложка задана' : 'нет обложки'}
          </div>
        </section>
      ) : null}

      {tab === 'seo' ? (
        <section className="rounded-lg border bg-card p-5 text-sm space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Заголовок страницы (meta title)</span>
              <Input value={v.metaTitle ?? ''} onChange={(e) => setDraft({ ...v, metaTitle: e.target.value })} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Описание (meta description)</span>
              <Input value={v.metaDescription ?? ''} onChange={(e) => setDraft({ ...v, metaDescription: e.target.value })} />
            </label>
          </div>
          <div className="rounded-md bg-muted/40 p-3 text-xs">
            <div>
              <span className="text-muted-foreground">H1 (превью):</span> {v.seo?.h1Preview ?? v.name}
            </div>
            <div className="mt-1">
              <span className="text-muted-foreground">Публичный путь:</span>{' '}
              <span className="font-mono">{publicPath}</span>
            </div>
            {publicAbs ? (
              <div className="mt-1">
                <span className="text-muted-foreground">Абсолютный URL:</span>{' '}
                <a className="text-primary hover:underline" href={publicAbs} target="_blank" rel="noreferrer">
                  {publicAbs}
                </a>
              </div>
            ) : null}
            <div className="mt-1 text-muted-foreground">
              Индексируемость (подсказка): {v.seo?.indexableHint === false ? 'нет' : 'да (город активен)'}
            </div>
          </div>
        </section>
      ) : null}

      {tab === 'catalog' ? (
        <section className="rounded-lg border bg-card p-5 text-sm space-y-4">
          {stats ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="События (всего)">
                <span>{stats.eventsCount}</span>
              </Field>
              <Field label="События (активные в каталоге)">
                <span>{stats.activeEventsCount}</span>
              </Field>
              <Field label="События (с будущими сеансами)">
                <span>{stats.futureEventsCount}</span>
              </Field>
              <Field label="Площадки">
                <span>
                  {stats.venuesCount} (ACTIVE: {stats.activeVenuesCount})
                </span>
              </Field>
              <Field label="Лендинги">
                <span>
                  {stats.landingsCount} (ACTIVE: {stats.activeLandingsCount})
                </span>
              </Field>
              <Field label="Подборки">
                <span>{stats.collectionsCount}</span>
              </Field>
            </div>
          ) : (
            <p className="text-muted-foreground">Нет сводной статистики</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to={`/admin-v3/events?city=${encodeURIComponent(v.slug)}`}>События в городе</Link>
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to={`/admin-v3/venues?city=${encodeURIComponent(v.slug)}`}>Площадки в городе</Link>
            </Button>
          </div>
        </section>
      ) : null}

      {tab === 'landings' ? (
        <section className="rounded-lg border bg-card p-5 text-sm space-y-4">
          <p className="text-xs text-muted-foreground">
            Лендинги с привязкой к городу. Тематические хабы без cityId настраиваются отдельно.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="py-2">Название</th>
                  <th className="py-2">Статус</th>
                  <th className="py-2">Индексация</th>
                </tr>
              </thead>
              <tbody>
                {(v.relatedLandings ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-muted-foreground">
                      Нет лендингов для этого города
                    </td>
                  </tr>
                ) : (
                  (v.relatedLandings ?? []).map((l) => (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="py-2">
                        <Link className="font-medium text-primary hover:underline" to={`/admin-v3/landings/${l.id}`}>
                          {l.title}
                        </Link>
                        <div className="font-mono text-[11px] text-muted-foreground">{l.slug}</div>
                      </td>
                      <td className="py-2">
                        {l.status} {l.isActive ? '' : '(выкл.)'}
                      </td>
                      <td className="py-2">{l.isIndexable ? 'да' : 'нет'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to={`/admin-v3/landings?city=${encodeURIComponent(v.slug)}`}>Все лендинги (фильтр по городу)</Link>
          </Button>
        </section>
      ) : null}

      {tab === 'extra' ? (
        <section className="rounded-lg border bg-card p-5 text-sm space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Часовой пояс</span>
              <Input value={v.timezone ?? ''} onChange={(e) => setDraft({ ...v, timezone: e.target.value })} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Широта</span>
              <Input
                value={v.lat != null ? String(v.lat) : ''}
                onChange={(e) => setDraft({ ...v, lat: e.target.value === '' ? null : e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Долгота</span>
              <Input
                value={v.lng != null ? String(v.lng) : ''}
                onChange={(e) => setDraft({ ...v, lng: e.target.value === '' ? null : e.target.value })}
              />
            </label>
            <Field label="Версия (оптимистичная блокировка)">
              <span>{v.version ?? '—'}</span>
            </Field>
            <Field label="Создан">
              <span>{v.createdAt ? new Date(v.createdAt).toLocaleString('ru-RU') : '—'}</span>
            </Field>
            <Field label="Обновлён">
              <span>{v.updatedAt ? new Date(v.updatedAt).toLocaleString('ru-RU') : '—'}</span>
            </Field>
            <Field label="ID">
              <span className="font-mono text-xs">{v.id}</span>
            </Field>
          </div>
        </section>
      ) : null}
    </div>
  );
}
