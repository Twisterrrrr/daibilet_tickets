import { adminApi } from '@/api/client';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { FilterBar, FilterField } from '@/components/shared/filters/FilterBar';
import { SearchInput } from '@/components/shared/filters/SearchInput';
import { DataTableShell } from '@/components/shared/table/DataTableShell';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useListPageState } from '@/hooks/useListPageState';
import {
  fetchAdminVenuesList,
  type AdminVenueCandidateRow,
  type VenueImportSource,
  type VenueLifecycleStatus,
  type VenueSourceType,
} from '@/modules/venues/api/candidates';
import { venueLifecycleLabelRu, VENUE_LIFECYCLE_LABEL_RU } from '@/modules/venues/utils/venue-lifecycle-labels';
import { readBool01, readEnum } from '@/shared/url-state/parse';
import { setBool01, setOrDelete } from '@/shared/url-state/serialize';
import { useUrlState } from '@/shared/url-state/useUrlState';
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { Link } from 'react-router-dom';

type CityOption = { slug: string; name: string };

const LIFECYCLE: Array<{ id: '' | VenueLifecycleStatus; label: string }> = [
  { id: '', label: 'Все' },
  ...(['DRAFT', 'ACTIVE', 'MERGED', 'REJECTED'] as const).map((id) => ({
    id,
    label: VENUE_LIFECYCLE_LABEL_RU[id],
  })),
];

const READINESS: Array<{ id: '' | 'READY' | 'NEEDS_WORK' | 'NEEDS_REVIEW' | 'BLOCKED'; label: string }> = [
  { id: '', label: 'Все' },
  { id: 'READY', label: 'Готово' },
  { id: 'NEEDS_WORK', label: 'Нужна доработка' },
  { id: 'NEEDS_REVIEW', label: 'На проверке' },
  { id: 'BLOCKED', label: 'Заблокировано' },
];

const SOURCE: Array<{ id: '' | VenueSourceType; label: string }> = [
  { id: '', label: 'Все' },
  { id: 'MANUAL', label: 'Вручную' },
  { id: 'IMPORTED', label: 'Импорт' },
];

const IMPORT: Array<{ id: '' | VenueImportSource; label: string }> = [
  { id: '', label: 'Все' },
  { id: 'TICKETSCLOUD', label: 'TicketsCloud' },
  { id: 'TEPLOHOD', label: 'Теплоход' },
];

function formatDt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
}

function readinessBadgeClass(s: string | undefined): string {
  switch (s) {
    case 'READY':
      return 'border-emerald-600/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200';
    case 'NEEDS_REVIEW':
      return 'border-amber-600/40 bg-amber-500/10 text-amber-900 dark:text-amber-100';
    case 'BLOCKED':
      return 'border-destructive/40 bg-destructive/10 text-destructive';
    case 'NEEDS_WORK':
    default:
      return 'border-muted-foreground/30 bg-muted/50';
  }
}

type VenuesListUrlFilters = {
  lifecycle: '' | VenueLifecycleStatus;
  sourceType: '' | VenueSourceType;
  importSource: '' | VenueImportSource;
  needsReviewOnly: boolean;
  hasMergeTarget: '' | 'yes' | 'no';
  whitelist: '' | 'yes' | 'no';
  sort: 'updatedAt' | 'confidenceScore';
  order: 'asc' | 'desc';
  readinessStatus: '' | 'READY' | 'NEEDS_WORK' | 'NEEDS_REVIEW' | 'BLOCKED';
};

export function VenuesListPage() {
  const list = useListPageState();
  const { state: vf, setState: setVf, reset: resetVf } = useUrlState<VenuesListUrlFilters>({
    defaults: {
      lifecycle: '',
      sourceType: '',
      importSource: '',
      needsReviewOnly: false,
      hasMergeTarget: '',
      whitelist: '',
      sort: 'updatedAt',
      order: 'desc',
      readinessStatus: '',
    },
    parse: (sp) => {
      return {
        lifecycle: readEnum(sp, 'lifecycle', ['' as const, 'DRAFT', 'ACTIVE', 'MERGED', 'REJECTED'], ''),
        sourceType: readEnum(sp, 'sourceType', ['' as const, 'MANUAL', 'IMPORTED'], ''),
        importSource: readEnum(sp, 'importSource', ['' as const, 'TICKETSCLOUD', 'TEPLOHOD'], ''),
        needsReviewOnly: readBool01(sp, 'needsReviewOnly') ?? false,
        hasMergeTarget: readEnum(sp, 'hasMergeTarget', ['' as const, 'yes', 'no'], ''),
        whitelist: readEnum(sp, 'whitelist', ['' as const, 'yes', 'no'], ''),
        sort: readEnum(sp, 'sort', ['updatedAt' as const, 'confidenceScore'], 'updatedAt'),
        order: readEnum(sp, 'order', ['asc' as const, 'desc'], 'desc'),
        readinessStatus: readEnum(sp, 'readinessStatus', ['' as const, 'READY', 'NEEDS_WORK', 'NEEDS_REVIEW', 'BLOCKED'], ''),
      };
    },
    serialize: (state, sp) => {
      setOrDelete(sp, 'lifecycle', state.lifecycle);
      setOrDelete(sp, 'sourceType', state.sourceType);
      setOrDelete(sp, 'importSource', state.importSource);
      setBool01(sp, 'needsReviewOnly', state.needsReviewOnly, false);
      setOrDelete(sp, 'hasMergeTarget', state.hasMergeTarget);
      setOrDelete(sp, 'whitelist', state.whitelist);
      setOrDelete(sp, 'readinessStatus', state.readinessStatus);
      if (state.sort !== 'updatedAt') sp.set('sort', state.sort);
      else sp.delete('sort');
      if (state.order !== 'desc') sp.set('order', state.order);
      else sp.delete('order');
      return sp;
    },
  });

  const citiesQ = useQuery({
    queryKey: ['admin-cities-options'],
    queryFn: async () => {
      const res = await adminApi.get<{ items: CityOption[] }>('/admin/cities?limit=1000');
      return res.items ?? [];
    },
    staleTime: 60_000,
  });

  const venuesQ = useQuery({
    queryKey: [
      'admin-venues-list',
      {
        q: list.debouncedQ,
        page: list.page,
        pageSize: list.pageSize,
        city: list.city,
        ...vf,
      },
    ],
    queryFn: () =>
      fetchAdminVenuesList({
        page: list.page,
        limit: list.pageSize,
        search: list.debouncedQ || undefined,
        citySlug: list.city || undefined,
        lifecycleStatus: vf.lifecycle || undefined,
        sourceType: vf.sourceType || undefined,
        importSource: vf.importSource || undefined,
        needsReview: vf.needsReviewOnly ? true : undefined,
        hasMergeTarget: vf.hasMergeTarget === 'yes' ? true : vf.hasMergeTarget === 'no' ? false : undefined,
        venuePageWhitelist: vf.whitelist === 'yes' ? true : vf.whitelist === 'no' ? false : undefined,
        readinessStatus: vf.readinessStatus || undefined,
        sort: vf.sort,
        order: vf.order,
      }),
    placeholderData: (p) => p,
  });

  const items = venuesQ.data?.items ?? [];
  const total = venuesQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / list.pageSize));

  if (venuesQ.isLoading && !venuesQ.data) {
    return <LoadingState label="Загрузка площадок…" />;
  }
  if (venuesQ.isError) {
    return (
      <ErrorState
        title="Не удалось загрузить список"
        description={venuesQ.error instanceof Error ? venuesQ.error.message : 'Ошибка'}
        onRetry={() => venuesQ.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Площадки"
        subtitle="Каталог площадок: готовность, модерация, связи с событиями"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to="/admin-v3/venues/candidates">Кандидаты (импорт)</Link>
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to="/admin-v3/venues/automation">Автомодерация</Link>
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to="/admin-v3/venues/analytics">Аналитика модерации</Link>
            </Button>
          </div>
        }
      />

      <FilterBar>
        <FilterField label="Поиск">
          <SearchInput
            value={list.q}
            onChange={(e) => list.setQ(e.target.value)}
            placeholder="Название, адрес…"
          />
        </FilterField>
        <FilterField label="Город">
          <select
            className="h-9 w-full min-w-[160px] rounded-md border border-input bg-background px-2 text-sm"
            value={list.city}
            onChange={(e) => list.setCity(e.target.value)}
          >
            <option value="">Все</option>
            {(citiesQ.data ?? []).map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Статус ЖЦ">
          <select
            className="h-9 w-full min-w-[140px] rounded-md border border-input bg-background px-2 text-sm"
            value={vf.lifecycle}
            onChange={(e) => {
              setVf({ lifecycle: (e.target.value || '') as '' | VenueLifecycleStatus }, { history: 'replace' });
              list.setPageReplace(1);
            }}
          >
            {LIFECYCLE.map((x) => (
              <option key={x.id || 'all'} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Готовность (БД)">
          <select
            className="h-9 w-full min-w-[160px] rounded-md border border-input bg-background px-2 text-sm"
            value={vf.readinessStatus}
            onChange={(e) => {
              setVf({ readinessStatus: (e.target.value || '') as typeof vf.readinessStatus }, { history: 'replace' });
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
        <FilterField label="Источник">
          <select
            className="h-9 w-full min-w-[120px] rounded-md border border-input bg-background px-2 text-sm"
            value={vf.sourceType}
            onChange={(e) => {
              setVf({ sourceType: (e.target.value || '') as '' | VenueSourceType }, { history: 'replace' });
              list.setPageReplace(1);
            }}
          >
            {SOURCE.map((x) => (
              <option key={x.id || 'all'} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Импорт">
          <select
            className="h-9 w-full min-w-[130px] rounded-md border border-input bg-background px-2 text-sm"
            value={vf.importSource}
            onChange={(e) => {
              setVf({ importSource: (e.target.value || '') as '' | VenueImportSource }, { history: 'replace' });
              list.setPageReplace(1);
            }}
          >
            {IMPORT.map((x) => (
              <option key={x.id || 'all'} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Сортировка">
          <div className="flex gap-1">
            <select
              className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
              value={vf.sort}
              onChange={(e) => {
                setVf({ sort: e.target.value as 'updatedAt' | 'confidenceScore' }, { history: 'replace' });
                list.setPageReplace(1);
              }}
            >
              <option value="updatedAt">По дате обновления</option>
              <option value="confidenceScore">По уверенности</option>
            </select>
            <select
              className="h-9 w-[88px] rounded-md border border-input bg-background px-2 text-sm"
              value={vf.order}
              onChange={(e) => {
                setVf({ order: e.target.value as 'asc' | 'desc' }, { history: 'replace' });
                list.setPageReplace(1);
              }}
            >
              <option value="desc">↓</option>
              <option value="asc">↑</option>
            </select>
          </div>
        </FilterField>
        <FilterField label="Флаги">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={vf.needsReviewOnly}
              onChange={(e) => {
                setVf({ needsReviewOnly: e.target.checked }, { history: 'replace' });
                list.setPageReplace(1);
              }}
            />
            Требует проверки
          </label>
          <label className="mt-1 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Merge target</span>
            <select
              className="h-8 rounded-md border border-input bg-background px-1 text-xs"
              value={vf.hasMergeTarget}
              onChange={(e) => {
                setVf({ hasMergeTarget: e.target.value as '' | 'yes' | 'no' }, { history: 'replace' });
                list.setPageReplace(1);
              }}
            >
              <option value="">—</option>
              <option value="yes">Есть</option>
              <option value="no">Нет</option>
            </select>
          </label>
          <label className="mt-1 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">SEO whitelist</span>
            <select
              className="h-8 rounded-md border border-input bg-background px-1 text-xs"
              value={vf.whitelist}
              onChange={(e) => {
                setVf({ whitelist: e.target.value as '' | 'yes' | 'no' }, { history: 'replace' });
                list.setPageReplace(1);
              }}
            >
              <option value="">—</option>
              <option value="yes">Да</option>
              <option value="no">Нет</option>
            </select>
          </label>
        </FilterField>
      </FilterBar>

      <DataTableShell>
        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Всего: {total} · стр. {list.page} / {totalPages}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={list.page <= 1}
              onClick={() => list.setPage(list.page - 1)}
            >
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
                <th className="px-3 py-3">Площадка</th>
                <th className="px-3 py-3">Готовность</th>
                <th className="px-3 py-3">События</th>
                <th className="px-3 py-3">Источник / мета</th>
                <th className="w-44 px-3 py-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    Нет площадок по фильтру
                  </td>
                </tr>
              ) : (
                items.map((row) => <VenueListRow key={row.id} row={row} />)
              )}
            </tbody>
          </table>
        </div>
      </DataTableShell>
    </div>
  );
}

function VenueListRow({ row }: { row: AdminVenueCandidateRow }) {
  const rs = row.readinessStatus;
  const score = row.readinessScore;
  const signals = row.readinessKeySignals ?? [];
  const active = row.activeEventsCount ?? 0;
  const future = row.futureEventsCount ?? 0;
  const rel = row.relatedEventsCount ?? row.eventsCount;  return (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="align-top px-3 py-3">
        <div className="font-medium leading-snug">
          <Link className="text-primary hover:underline" to={`/admin-v3/venues/${row.id}`}>
            {row.title}
          </Link>
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {row.city.name}
          {row.displayAddress ? ` · ${row.displayAddress}` : ''}
        </div>
        <div className="mt-1 font-mono text-[11px] text-muted-foreground">{row.slug}</div>
      </td>
      <td className="align-top px-3 py-3">
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="outline" className={readinessBadgeClass(rs)}>
            {rs ?? '—'}
          </Badge>
          <Badge variant="default">{venueLifecycleLabelRu(row.lifecycleStatus)}</Badge>
          {row.needsReview ? (
            <Badge variant="outline" className="border-amber-500/50">
              Проверка
            </Badge>
          ) : null}
        </div>
        {score != null ? (
          <div className="mt-1 text-xs text-muted-foreground">Готовность: {score}/100</div>
        ) : null}
        {signals.length > 0 ? (
          <ul className="mt-1 max-w-[280px] list-inside list-disc text-xs text-muted-foreground">
            {signals.slice(0, 3).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        ) : null}
      </td>
      <td className="align-top px-3 py-3 text-xs">
        <div>Всего: {rel}</div>
        <div>Активных: {active}</div>
        <div>С будущими сеансами: {future}</div>
        {row.mergedFromCount != null && row.mergedFromCount > 0 ? (
          <div className="mt-1 text-muted-foreground">Влито дублей: {row.mergedFromCount}</div>
        ) : null}
      </td>
      <td className="align-top px-3 py-3 text-xs">
        <div>
          {row.sourceType} {row.importSource ? `· ${row.importSource}` : ''}
        </div>
        <div className="mt-1 text-muted-foreground">Обновлено: {formatDt(row.updatedAt)}</div>
        {row.isVenuePageWhitelisted != null ? (
          <div className="mt-1">SEO whitelist: {row.isVenuePageWhitelisted ? 'да' : 'нет'}</div>
        ) : null}
        {row.mergeTargetSummary ? (
          <div className="mt-1">
            Merge →{' '}
            <Link className="text-primary hover:underline" to={`/admin-v3/venues/${row.mergeTargetSummary.id}`}>
              {row.mergeTargetSummary.title}
            </Link>
          </div>
        ) : null}
      </td>
      <td className="align-top px-3 py-3">
        <div className="flex flex-col gap-1">
          <Button type="button" size="sm" variant="secondary" asChild>
            <Link to={`/admin-v3/venues/${row.id}`}>Карточка</Link>
          </Button>
          {row.lifecycleStatus === 'DRAFT' && row.sourceType === 'IMPORTED' ? (
            <Button type="button" size="sm" variant="outline" asChild>
              <Link to="/admin-v3/venues/candidates">К кандидатам</Link>
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="ghost" asChild>
            <Link to={`/admin-v3/events?venueId=${encodeURIComponent(row.id)}`}>События</Link>
          </Button>
        </div>
      </td>
    </tr>
  );
}
