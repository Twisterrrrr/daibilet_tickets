import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { FilterBar, FilterField, FilterFieldsGrid } from '@/components/shared/filters/FilterBar';
import { SearchInput } from '@/components/shared/filters/SearchInput';
import { DataTableShell } from '@/components/shared/table/DataTableShell';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useListPageState } from '@/hooks/useListPageState';
import { fetchAdminCitiesList, fetchAdminRegionOptions, type AdminCityListItem } from '@/modules/cities/api/cities';
import { readBool01, readEnum, readString } from '@/shared/url-state/parse';
import { setBool01, setOrDelete } from '@/shared/url-state/serialize';
import { useUrlState } from '@/shared/url-state/useUrlState';
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { Link } from 'react-router-dom';

const READINESS: Array<{ id: '' | 'READY' | 'NEEDS_WORK' | 'BLOCKED'; label: string }> = [
  { id: '', label: 'Все' },
  { id: 'READY', label: 'Готово' },
  { id: 'NEEDS_WORK', label: 'Нужна доработка' },
  { id: 'BLOCKED', label: 'Заблокировано' },
];

const FILTER_SELECT =
  'h-9 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm';

type CityListUrlFilters = {
  readinessStatus: '' | 'READY' | 'NEEDS_WORK' | 'BLOCKED';
  regionId: string;
  isActive: '' | 'yes' | 'no';
  hasEvents: boolean;
  hasVenues: boolean;
  hasLandings: boolean;
  hasSeo: boolean;
};

function formatDt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
}

function readinessBadgeClass(s: string | undefined): string {
  switch (s) {
    case 'READY':
      return 'border-emerald-600/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200';
    case 'BLOCKED':
      return 'border-destructive/40 bg-destructive/10 text-destructive';
    case 'NEEDS_WORK':
    default:
      return 'border-muted-foreground/30 bg-muted/50';
  }
}

export function CitiesListPage() {
  const list = useListPageState();
  const { state: cf, setState: setCf } = useUrlState<CityListUrlFilters>({
    defaults: {
      readinessStatus: '',
      regionId: '',
      isActive: '',
      hasEvents: false,
      hasVenues: false,
      hasLandings: false,
      hasSeo: false,
    },
    parse: (sp) => ({
      readinessStatus: readEnum(sp, 'readinessStatus', ['' as const, 'READY', 'NEEDS_WORK', 'BLOCKED'], ''),
      regionId: readString(sp, 'regionId', ''),
      isActive: readEnum(sp, 'isActive', ['' as const, 'yes', 'no'], ''),
      hasEvents: readBool01(sp, 'hasEvents') ?? false,
      hasVenues: readBool01(sp, 'hasVenues') ?? false,
      hasLandings: readBool01(sp, 'hasLandings') ?? false,
      hasSeo: readBool01(sp, 'hasSeo') ?? false,
    }),
    serialize: (state, sp) => {
      setOrDelete(sp, 'readinessStatus', state.readinessStatus);
      setOrDelete(sp, 'regionId', state.regionId);
      setOrDelete(sp, 'isActive', state.isActive);
      setBool01(sp, 'hasEvents', state.hasEvents, false);
      setBool01(sp, 'hasVenues', state.hasVenues, false);
      setBool01(sp, 'hasLandings', state.hasLandings, false);
      setBool01(sp, 'hasSeo', state.hasSeo, false);
      return sp;
    },
  });

  const regionsQ = useQuery({
    queryKey: ['admin-city-region-options'],
    queryFn: () => fetchAdminRegionOptions().then((r) => r.items ?? []),
    staleTime: 120_000,
  });

  const citiesQ = useQuery({
    queryKey: [
      'admin-cities-list',
      {
        q: list.debouncedQ,
        page: list.page,
        pageSize: list.pageSize,
        ...cf,
      },
    ],
    queryFn: () =>
      fetchAdminCitiesList({
        page: list.page,
        limit: list.pageSize,
        search: list.debouncedQ || undefined,
        readinessStatus: cf.readinessStatus || undefined,
        regionId: cf.regionId || undefined,
        isActive: cf.isActive === 'yes' ? true : cf.isActive === 'no' ? false : undefined,
        hasEvents: cf.hasEvents || undefined,
        hasVenues: cf.hasVenues || undefined,
        hasLandings: cf.hasLandings || undefined,
        hasSeo: cf.hasSeo || undefined,
      }),
    placeholderData: (p) => p,
  });

  const items = citiesQ.data?.items ?? [];
  const total = citiesQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / list.pageSize));

  const siteBase = (import.meta as unknown as { env?: { VITE_PUBLIC_SITE_URL?: string } }).env?.VITE_PUBLIC_SITE_URL?.replace(
    /\/$/,
    '',
  );

  if (citiesQ.isLoading && !citiesQ.data) {
    return <LoadingState label="Загрузка городов…" />;
  }
  if (citiesQ.isError) {
    return (
      <ErrorState
        title="Не удалось загрузить список"
        description={citiesQ.error instanceof Error ? citiesQ.error.message : 'Ошибка'}
        onRetry={() => citiesQ.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Города"
        subtitle="SEO-хабы каталога: контент, готовность, связи с событиями, площадками и лендингами"
      />

      <FilterBar>
        <FilterFieldsGrid className="xl:grid-cols-5">
          <FilterField label="Поиск" className="sm:col-span-2 lg:col-span-2 xl:col-span-2">
            <SearchInput value={list.q} onChange={(e) => list.setQ(e.target.value)} placeholder="Название, адрес в URL…" />
          </FilterField>
          <FilterField label="Регион">
            <select
              className={FILTER_SELECT}
              value={cf.regionId}
              onChange={(e) => {
                setCf({ regionId: e.target.value }, { history: 'replace' });
                list.setPageReplace(1);
              }}
            >
              <option value="">Все</option>
              {(regionsQ.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Готовность">
            <select
              className={FILTER_SELECT}
              value={cf.readinessStatus}
              onChange={(e) => {
                setCf({ readinessStatus: (e.target.value || '') as typeof cf.readinessStatus }, { history: 'replace' });
                list.setPageReplace(1);
              }}
            >
              {READINESS.map((x) => (
                <option key={x.id || 'all'} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Публикация">
            <select
              className={FILTER_SELECT}
              value={cf.isActive}
              onChange={(e) => {
                setCf({ isActive: e.target.value as '' | 'yes' | 'no' }, { history: 'replace' });
                list.setPageReplace(1);
              }}
            >
              <option value="">Все</option>
              <option value="yes">Видим</option>
              <option value="no">Скрыт</option>
            </select>
          </FilterField>
        </FilterFieldsGrid>

        <div className="mt-3 w-full border-t border-border/60 pt-3">
          <div className="flex w-full flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-dashed border-border/80 bg-muted/15 px-3 py-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={cf.hasEvents}
                onChange={() => {
                  setCf({ hasEvents: !cf.hasEvents }, { history: 'replace' });
                  list.setPageReplace(1);
                }}
              />
              Есть события
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={cf.hasVenues}
                onChange={() => {
                  setCf({ hasVenues: !cf.hasVenues }, { history: 'replace' });
                  list.setPageReplace(1);
                }}
              />
              Есть площадки
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={cf.hasLandings}
                onChange={() => {
                  setCf({ hasLandings: !cf.hasLandings }, { history: 'replace' });
                  list.setPageReplace(1);
                }}
              />
              Есть лендинги
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={cf.hasSeo}
                onChange={() => {
                  setCf({ hasSeo: !cf.hasSeo }, { history: 'replace' });
                  list.setPageReplace(1);
                }}
              />
              Заполнены мета-теги для SEO
            </label>
          </div>
        </div>
      </FilterBar>

      <DataTableShell>
        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Всего: {total} · стр. {list.page} / {totalPages}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={list.page <= 1} onClick={() => list.setPage(list.page - 1)}>
              Назад
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={list.page >= totalPages}
              onClick={() => list.setPage(list.page + 1)}
            >
              Вперёд
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto p-2">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs font-medium uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-3">Город</th>
                <th className="px-3 py-3">Готовность</th>
                <th className="px-3 py-3">Каталог</th>
                <th className="px-3 py-3">Мета / SEO</th>
                <th className="w-44 px-3 py-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    Нет городов по фильтру
                  </td>
                </tr>
              ) : (
                items.map((row) => <CityListRow key={row.id} row={row} siteBase={siteBase} />)
              )}
            </tbody>
          </table>
        </div>
      </DataTableShell>
    </div>
  );
}

function CityListRow({ row, siteBase }: { row: AdminCityListItem; siteBase?: string }) {
  const rs = row.readinessStatus;
  const score = row.readinessScore;
  const signals = row.readinessKeySignals ?? [];
  const st = row.stats;
  const flags = row.flags;  const eventsHref = `/admin-v3/events?city=${encodeURIComponent(row.slug)}`;
  const venuesHref = `/admin-v3/venues?city=${encodeURIComponent(row.slug)}`;
  const landingsHref = `/admin-v3/landings?city=${encodeURIComponent(row.slug)}`;
  const publicPath = `/cities/${encodeURIComponent(row.slug)}`;
  const publicAbs = siteBase ? `${siteBase}${publicPath}` : null;  return (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="align-top px-3 py-3">
        <div className="font-medium leading-snug">
          <Link className="text-primary hover:underline" to={`/admin-v3/cities/${row.id}`}>
            {row.name}
          </Link>
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {row.region ? `${row.region.name}` : 'Регион не привязан'}
        </div>
        <div className="mt-1 font-mono text-[11px] text-muted-foreground">{row.slug}</div>
      </td>
      <td className="align-top px-3 py-3">
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="outline" className={readinessBadgeClass(rs)}>
            {rs ?? '—'}
          </Badge>
          <Badge variant={row.isActive ? 'outline' : 'danger'}>{row.isActive ? 'Видим' : 'Скрыт'}</Badge>
        </div>
        {score != null ? <div className="mt-1 text-xs text-muted-foreground">Готовность: {score}/100</div> : null}
        {signals.length > 0 ? (
          <ul className="mt-1 max-w-[280px] list-inside list-disc text-xs text-muted-foreground">
            {signals.slice(0, 3).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        ) : null}
      </td>
      <td className="align-top px-3 py-3 text-xs">
        <div>События: {st.eventsCount} (активн. каталог: {st.activeEventsCount}, будущие: {st.futureEventsCount})</div>
        <div>Площадки: {st.venuesCount} (ACTIVE: {st.activeVenuesCount})</div>
        <div>Лендинги: {st.landingsCount} (ACTIVE: {st.activeLandingsCount})</div>
        <div>Подборки: {st.collectionsCount}</div>
      </td>
      <td className="align-top px-3 py-3 text-xs">
        <div>Описание: {flags.hasDescription ? 'да' : 'нет'}</div>
        <div>Мета-теги: {flags.hasSeo ? 'да' : 'нет'}</div>
        <div>Обложка: {flags.hasCover ? 'да' : 'нет'}</div>
        <div className="mt-1 text-muted-foreground">Обновлено: {formatDt(row.updatedAt)}</div>
      </td>
      <td className="align-top px-3 py-3">
        <div className="flex flex-col gap-1">
          <Button type="button" size="sm" variant="secondary" asChild>
            <Link to={`/admin-v3/cities/${row.id}`}>Карточка</Link>
          </Button>
          {publicAbs ? (
            <Button type="button" size="sm" variant="outline" asChild>
              <a href={publicAbs} target="_blank" rel="noreferrer">
                Публичная страница
              </a>
            </Button>
          ) : (
            <div className="text-[11px] text-muted-foreground">URL: {publicPath}</div>
          )}
          <Button type="button" size="sm" variant="ghost" asChild>
            <Link to={eventsHref}>События (фильтр)</Link>
          </Button>
          <Button type="button" size="sm" variant="ghost" asChild>
            <Link to={venuesHref}>Площадки</Link>
          </Button>
          <Button type="button" size="sm" variant="ghost" asChild>
            <Link to={landingsHref}>Лендинги</Link>
          </Button>
        </div>
      </td>
    </tr>
  );
}
