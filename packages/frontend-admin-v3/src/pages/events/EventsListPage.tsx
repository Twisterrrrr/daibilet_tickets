import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { FilterField, FilterFieldsGrid } from '@/components/shared/filters/FilterBar';
import { QuickFilters, type QuickFilterItem } from '@/components/shared/filters/QuickFilters';
import { SearchInput } from '@/components/shared/filters/SearchInput';
import { DataTableShell } from '@/components/shared/table/DataTableShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useListPageState } from '@/hooks/useListPageState';
import { fetchAdminEventsList } from '@/modules/events/api/queries';
import { adminApi } from '@/api/client';
import { EventsTable } from '@/modules/events/components/table/EventsTable';
import { topGroupLabels, type TopGroup } from '@/config/top-groups';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { readBool01, readEnum, readInt, readString } from '@/shared/url-state/parse';
import { setBool01, setOrDelete } from '@/shared/url-state/serialize';
import { useUrlState } from '@/shared/url-state/useUrlState';

type CityOption = { slug: string; name: string };

type BatchArchiveSource = 'TICKETSCLOUD' | 'TEPLOHOD';

type BatchArchiveDryRunItem = {
  id: string;
  title: string;
  source: string;
  lastSessionAt: string | null;
};

type BatchArchiveDryRunResult = {
  dryRun?: boolean;
  archivedCount?: number;
  count: number;
  ids: string[];
  items: BatchArchiveDryRunItem[];
};

function formatDateTimeRu(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU');
}

function summarizeLastSessionRange(items: BatchArchiveDryRunItem[]): string {
  const dates = items
    .map((i) => (i.lastSessionAt ? new Date(i.lastSessionAt) : null))
    .filter((d): d is Date => Boolean(d && !Number.isNaN(d.getTime())));
  if (dates.length === 0) return '—';
  dates.sort((a, b) => a.getTime() - b.getTime());
  return `${dates[0]!.toLocaleDateString('ru-RU')} → ${dates[dates.length - 1]!.toLocaleDateString('ru-RU')}`;
}

const TOP_GROUPS: Array<{ id: '' | TopGroup; label: string; disabled?: boolean }> = [
  { id: '', label: 'Все' },
  { id: 'excursions', label: topGroupLabels.excursions },
  { id: 'museums', label: topGroupLabels.museums },
  { id: 'events', label: topGroupLabels.events },
  { id: 'activities', label: topGroupLabels.activities },
  { id: 'entertainment', label: topGroupLabels.entertainment },
];

const STATUSES: Array<{ id: string; label: string }> = [
  { id: '', label: 'Все' },
  { id: 'active', label: 'Активные' },
  { id: 'inactive', label: 'Неактивные' },
  { id: 'hidden', label: 'Скрытые (ручное скрытие)' },
];

function readIntOrNull(sp: URLSearchParams, key: string): number | null {
  const raw = sp.get(key);
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

type EventsListUrlExtras = {
  quick: string;
  section: '' | TopGroup;
  subcategory: string;
  hasNoSubcategory: boolean;
  hasMultipleSubcategories: boolean;
  isPast: boolean;
  isArchived: boolean;
  pastDays: number | null;
  sortBy: 'updatedAt' | 'title' | 'city' | 'source';
  sortDir: 'asc' | 'desc';
  operator: string;
  hasFutureSessions: '' | 'true' | 'false';
  hasCategoryPrices: '' | 'true' | 'false';
  filtersOpen: boolean;
};

export function EventsListPage() {
  const list = useListPageState();
  const qc = useQueryClient();
  const { state: ef, setState: setEf, reset: resetEf } = useUrlState<EventsListUrlExtras>({
    defaults: {
      quick: 'all',
      section: '',
      subcategory: '',
      hasNoSubcategory: false,
      hasMultipleSubcategories: false,
      isPast: false,
      isArchived: false,
      pastDays: null,
      sortBy: 'updatedAt',
      sortDir: 'desc',
      operator: '',
      hasFutureSessions: '',
      hasCategoryPrices: '',
      filtersOpen: true,
    },
    parse: (sp) => ({
      quick: readString(sp, 'quick', 'all'),
      section: readString(sp, 'section', '') as '' | TopGroup,
      subcategory: readString(sp, 'subcategory', ''),
      hasNoSubcategory: readBool01(sp, 'hasNoSubcategory') ?? false,
      hasMultipleSubcategories: readBool01(sp, 'hasMultipleSubcategories') ?? false,
      isPast: readBool01(sp, 'isPast') ?? false,
      isArchived: readBool01(sp, 'isArchived') ?? false,
      pastDays: readIntOrNull(sp, 'pastDays'),
      sortBy: readEnum(sp, 'sortBy', ['updatedAt' as const, 'title', 'city', 'source'], 'updatedAt'),
      sortDir: readEnum(sp, 'sortDir', ['asc' as const, 'desc'], 'desc'),
      operator: readString(sp, 'operator', ''),
      hasFutureSessions: readEnum(sp, 'hasFutureSessions', ['' as const, 'true', 'false'], ''),
      hasCategoryPrices: readEnum(sp, 'hasCategoryPrices', ['' as const, 'true', 'false'], ''),
      filtersOpen: (readBool01(sp, 'filtersOpen') ?? true) === true,
    }),
    serialize: (s, sp) => {
      setOrDelete(sp, 'quick', s.quick !== 'all' ? s.quick : '');
      setOrDelete(sp, 'section', s.section);
      setOrDelete(sp, 'subcategory', s.subcategory);
      setBool01(sp, 'hasNoSubcategory', s.hasNoSubcategory, false);
      setBool01(sp, 'hasMultipleSubcategories', s.hasMultipleSubcategories, false);
      setBool01(sp, 'isPast', s.isPast, false);
      setBool01(sp, 'isArchived', s.isArchived, false);
      if (s.pastDays != null) sp.set('pastDays', String(s.pastDays));
      else sp.delete('pastDays');
      if (s.sortBy !== 'updatedAt') sp.set('sortBy', s.sortBy);
      else sp.delete('sortBy');
      if (s.sortDir !== 'desc') sp.set('sortDir', s.sortDir);
      else sp.delete('sortDir');
      setOrDelete(sp, 'operator', s.operator);
      setOrDelete(sp, 'hasFutureSessions', s.hasFutureSessions);
      setOrDelete(sp, 'hasCategoryPrices', s.hasCategoryPrices);
      // filtersOpen: omit when open=true; write 0 when closed
      if (s.filtersOpen) sp.delete('filtersOpen');
      else sp.set('filtersOpen', '0');
      return sp;
    },
  });

  const [batchOpen, setBatchOpen] = React.useState<boolean>(false);
  const [batchConfirmOpen, setBatchConfirmOpen] = React.useState<boolean>(false);
  const [batchConfirmText, setBatchConfirmText] = React.useState<string>('');
  const [batchSource, setBatchSource] = React.useState<BatchArchiveSource>('TICKETSCLOUD');
  const [batchOlderThanDays, setBatchOlderThanDays] = React.useState<number>(90);
  const [batchTake, setBatchTake] = React.useState<number>(500);
  const [batchRunning, setBatchRunning] = React.useState<boolean>(false);
  const [batchError, setBatchError] = React.useState<string | null>(null);
  const [batchResult, setBatchResult] = React.useState<BatchArchiveDryRunResult | null>(null);

  const quick = ef.quick;
  const section = ef.section;
  const subcategory = ef.subcategory;
  const hasNoSubcategory = ef.hasNoSubcategory;
  const hasMultipleSubcategories = ef.hasMultipleSubcategories;
  const showPast = ef.isPast;
  const showArchived = ef.isArchived;
  const pastDays = ef.pastDays;
  const filtersOpen = ef.filtersOpen;
  const sortBy = ef.sortBy;
  const sortDir = ef.sortDir;
  const operatorSlug = ef.operator;
  const hasFutureSessionsFilter = ef.hasFutureSessions;
  const hasCategoryPricesFilter = ef.hasCategoryPrices;
  const [columnsOpen, setColumnsOpen] = React.useState<boolean>(false);
  const [visibleCols, setVisibleCols] = React.useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('admin_v3_events_columns');
      if (!raw) return ['main', 'source', 'location', 'next', 'sessions', 'price', 'quality', 'status', 'issues', 'override', 'actions'];
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')
        ? (parsed as string[])
        : ['main', 'source', 'location', 'next', 'sessions', 'price', 'quality', 'status', 'issues', 'override', 'actions'];
    } catch {
      return ['main', 'source', 'location', 'next', 'sessions', 'price', 'quality', 'status', 'issues', 'override', 'actions'];
    }
  });
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  async function runBatchDryRun() {
    setBatchRunning(true);
    setBatchError(null);
    try {
      const res = await adminApi.post<BatchArchiveDryRunResult>('/admin/events/archive/batch', {
        dryRun: true,
        source: batchSource,
        olderThanDays: Math.max(1, Math.min(3650, Math.floor(batchOlderThanDays))),
        take: Math.max(1, Math.min(2000, Math.floor(batchTake))),
      });
      setBatchResult(res);
    } catch (e) {
      setBatchError(e instanceof Error ? e.message : 'Ошибка пробного прогона');
      setBatchResult(null);
    } finally {
      setBatchRunning(false);
    }
  }

  async function runBatchExecute() {
    setBatchRunning(true);
    setBatchError(null);
    try {
      const res = await adminApi.post<BatchArchiveDryRunResult>('/admin/events/archive/batch', {
        dryRun: false,
        source: batchSource,
        olderThanDays: Math.max(1, Math.min(3650, Math.floor(batchOlderThanDays))),
        take: Math.max(1, Math.min(2000, Math.floor(batchTake))),
      });
      setBatchResult(res);
      setBatchConfirmOpen(false);
      setBatchConfirmText('');
      await qc.invalidateQueries({ queryKey: ['admin-events'] });
    } catch (e) {
      setBatchError(e instanceof Error ? e.message : 'Ошибка выполнения');
    } finally {
      setBatchRunning(false);
    }
  }

  const effectiveStatus = quick === 'all' ? list.status : quick;
  const active =
    effectiveStatus === 'active' ? 'true' : effectiveStatus === 'inactive' ? 'false' : undefined;
  const hidden = effectiveStatus === 'hidden' ? 'true' : undefined;
  const missingImage = quick === 'noImage' ? 'true' : undefined;
  const hasOverride = quick === 'override' ? 'true' : undefined;
  const issuesPreset = quick === 'apiIssues' ? ('api' as const) : undefined;

  const query = useQuery({
    queryKey: [
      'admin-events',
      {
        q: list.debouncedQ,
        page: list.page,
        pageSize: list.pageSize,
        active,
        hidden,
        missingImage,
        hasOverride,
        issuesPreset,
        city: list.city,
        section,
        subcategory,
        hasNoSubcategory,
        hasMultipleSubcategories,
        sortBy,
        sortDir,
        operatorSlug,
        hasFutureSessionsFilter,
        hasCategoryPricesFilter,
      },
    ],
    queryFn: () =>
      fetchAdminEventsList({
        q: list.debouncedQ,
        page: list.page,
        limit: list.pageSize,
        active,
        hidden,
        missingImage,
        hasOverride,
        issuesPreset,
        city: list.city || undefined,
        section: section || undefined,
        subcategory: subcategory || undefined,
        hasNoSubcategory: hasNoSubcategory ? 'true' : undefined,
        hasMultipleSubcategories: hasMultipleSubcategories ? 'true' : undefined,
        isPast: showPast ? 'true' : undefined,
        isArchived: showArchived ? 'true' : undefined,
        pastDays: pastDays ?? undefined,
        sortBy,
        sortDir,
        operator: operatorSlug || undefined,
        hasFutureSessions: hasFutureSessionsFilter || undefined,
        hasCategoryPrices: hasCategoryPricesFilter || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  function toggleCol(key: string, next: boolean) {
    setVisibleCols((prev) => {
      const set = new Set(prev);
      if (next) set.add(key);
      else set.delete(key);
      const out = Array.from(set);
      try {
        localStorage.setItem('admin_v3_events_columns', JSON.stringify(out));
      } catch {
        // ignore
      }
      return out;
    });
  }

  function onSort(nextBy: 'updatedAt' | 'title' | 'city' | 'source') {
    if (sortBy === nextBy) {
      setEf({ sortDir: sortDir === 'asc' ? 'desc' : 'asc' }, { history: 'replace' });
    } else {
      setEf({ sortBy: nextBy, sortDir: 'desc' }, { history: 'replace' });
    }
    list.setPageReplace(1);
  }

  const quickItems: QuickFilterItem[] = [
    { id: 'all', label: 'Все' },
    { id: 'active', label: 'Активные' },
    { id: 'archived', label: 'Архив' },
    { id: 'past7', label: 'Прошедшие 7 дней' },
    { id: 'past30', label: 'Прошедшие 30 дней' },
    { id: 'apiIssues', label: 'Критичные проблемы (gate)' },
    { id: 'seoIssues', label: 'Не индексируется' },
    { id: 'override', label: 'Есть перекрытие слоя' },
    { id: 'noImage', label: 'Без фото' },
  ];

  const items = query.data?.items ?? [];

  React.useEffect(() => {
    // keep selection valid across filters/paging
    const ids = new Set((query.data?.items ?? []).map((x) => x.id));
    setSelectedIds((prev) => prev.filter((id) => ids.has(id)));
  }, [query.data?.items]);

  const citiesQuery = useQuery({
    queryKey: ['admin-cities-options'],
    queryFn: async () => {
      const res = await adminApi.get<{ items: CityOption[] }>('/admin/cities?limit=1000');
      const raw = Array.isArray(res.items) ? res.items : [];
      return raw.filter((c) => typeof c.slug === 'string' && typeof c.name === 'string');
    },
  });

  const suppliersQuery = useQuery({
    queryKey: ['admin-suppliers-options'],
    queryFn: async () => {
      const res = await adminApi.get<{ items: Array<{ slug: string; name: string }> }>(
        '/admin/suppliers?limit=500&isActive=true',
      );
      const raw = Array.isArray(res.items) ? res.items : [];
      return raw.filter((s) => typeof s.slug === 'string' && typeof s.name === 'string');
    },
    staleTime: 120_000,
  });

  const subcategoriesQuery = useQuery({
    queryKey: ['admin-event-subcategories-options'],
    queryFn: async () => {
      const rows = await adminApi.get<
        Array<{ id: string; slug: string; nameRu: string; isActive: boolean; layer?: string | null; type?: string | null }>
      >('/admin/subcategories?forEntity=event&layer=PRIMARY');
      const raw = Array.isArray(rows) ? rows : [];
      return raw
        .filter((s) => s && typeof s.id === 'string' && typeof s.slug === 'string' && typeof s.nameRu === 'string')
        .filter((s) => Boolean(s.isActive))
        .map((s) => ({ id: s.id, slug: s.slug, name: s.nameRu }));
    },
    staleTime: 60_000,
  });

  async function toggleArchive(id: string, nextArchived: boolean) {
    await adminApi.patch(`/admin/events/${id}/archive`, { isArchived: nextArchived });
    await qc.invalidateQueries({ queryKey: ['admin-events'] });
    await qc.invalidateQueries({ queryKey: ['admin-event-summary', id] });
  }

  function toggleSelect(id: string, nextSelected: boolean) {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      if (nextSelected) set.add(id);
      else set.delete(id);
      return Array.from(set);
    });
  }

  function toggleSelectAllOnPage(nextSelected: boolean, idsOnPage: string[]) {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      if (nextSelected) {
        for (const id of idsOnPage) set.add(id);
      } else {
        for (const id of idsOnPage) set.delete(id);
      }
      return Array.from(set);
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="События"
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setBatchOpen(true)}>
              Архивирование
            </Button>
            <Button type="button" variant="outline" onClick={() => query.refetch()}>
              Обновить
            </Button>
          </div>
        }
      />

      {batchOpen ? (
        <div
          className="fixed inset-0 z-40"
          role="dialog"
          aria-modal="true"
          aria-label="Массовое архивирование (пробный прогон)"
          onClick={(e) => {
            const target = e.target as HTMLElement | null;
            if (target?.dataset?.overlay === '1') setBatchOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-black/30" data-overlay="1" />
          <div className="absolute right-0 top-0 h-full w-full max-w-[620px] overflow-y-auto border-l bg-background p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Архивирование импортных событий</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Сначала проверка без изменений, затем архивирование с подтверждением.
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setBatchOpen(false)}>
                Закрыть
              </Button>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Поставщик</div>
                  <select
                    className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={batchSource}
                    onChange={(e) => setBatchSource(e.target.value as BatchArchiveSource)}
                    disabled={batchRunning}
                  >
                    <option value="TICKETSCLOUD">Ticketscloud</option>
                    <option value="TEPLOHOD">Teplohod</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Старше дней</div>
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={batchOlderThanDays}
                    onChange={(e) => setBatchOlderThanDays(Number(e.target.value))}
                    disabled={batchRunning}
                  />
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Лимит записей</div>
                  <input
                    type="number"
                    min={1}
                    max={2000}
                    className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={batchTake}
                    onChange={(e) => setBatchTake(Number(e.target.value))}
                    disabled={batchRunning}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" onClick={() => runBatchDryRun()} disabled={batchRunning}>
                  {batchRunning ? 'Выполняю…' : 'Проверить (без изменений)'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={batchRunning || !batchResult?.ids?.length}
                  onClick={() => {
                    setBatchConfirmOpen(true);
                    setBatchConfirmText('');
                  }}
                  title="Архивировать найденные события (требует подтверждения)"
                >
                  Архивировать…
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => runBatchDryRun()}
                  disabled={batchRunning}
                  title="Повторить с теми же параметрами"
                >
                  Повторить
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!batchResult?.ids?.length}
                  onClick={async () => {
                    const text = (batchResult?.ids ?? []).join('\n');
                    try {
                      await navigator.clipboard.writeText(text);
                    } catch {
                      // fallback
                      const ta = document.createElement('textarea');
                      ta.value = text;
                      document.body.appendChild(ta);
                      ta.select();
                      document.execCommand('copy');
                      ta.remove();
                    }
                  }}
                >
                  Скопировать ID
                </Button>
              </div>

              {batchError ? (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                  {batchError}
                </div>
              ) : null}

              <div className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-medium">Результат</div>
                  <div className="text-xs text-muted-foreground">
                    {batchResult ? (
                      <>
                        Найдено: <span className="tabular-nums text-foreground">{batchResult.count}</span>
                        {' · '}
                        Диапазон дат последнего сеанса:{' '}
                        <span className="text-foreground">{summarizeLastSessionRange(batchResult.items ?? [])}</span>
                        {batchResult.dryRun === false ? (
                          <>
                            {' · '}
                            Архивировано: <span className="tabular-nums text-foreground">{batchResult.archivedCount ?? '—'}</span>
                          </>
                        ) : null}
                      </>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>

                {batchResult ? (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left">ID</th>
                          <th className="px-3 py-2 text-left">Название</th>
                          <th className="px-3 py-2 text-left">Источник</th>
                          <th className="px-3 py-2 text-left">Последний сеанс</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(batchResult.items ?? []).slice(0, 500).map((it) => (
                          <tr key={it.id} className="border-b">
                            <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{it.id}</td>
                            <td className="px-3 py-2">
                              <div className="truncate font-medium">{it.title}</div>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{it.source}</td>
                            <td className="px-3 py-2 text-muted-foreground">{formatDateTimeRu(it.lastSessionAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(batchResult.items ?? []).length > 500 ? (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Показаны первые 500 строк из {batchResult.items.length}.
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-muted-foreground">
                    Запустите пробный прогон без изменений, чтобы увидеть кандидатов.
                  </div>
                )}
              </div>
            </div>

            {batchConfirmOpen ? (
              <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Подтверждение массового архивирования">
                <div
                  className="absolute inset-0 bg-black/40"
                  onClick={() => {
                    if (!batchRunning) setBatchConfirmOpen(false);
                  }}
                />
                <div className="absolute left-1/2 top-1/2 w-[min(520px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-5 shadow-xl">
                  <div className="text-sm font-medium">Подтверждение архивирования</div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Будут архивированы импортные события ({batchSource}), найденные по текущим параметрам.
                    <div className="mt-1">
                      Кандидатов: <span className="tabular-nums text-foreground">{batchResult?.count ?? 0}</span>
                    </div>
                    <div className="mt-2">
                      Для подтверждения введите <span className="font-mono text-foreground">ARCHIVE</span> латиницей.
                    </div>
                  </div>
                  <input
                    className="mt-3 h-9 w-full rounded-md border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={batchConfirmText}
                    onChange={(e) => setBatchConfirmText(e.target.value)}
                    placeholder="ARCHIVE"
                    disabled={batchRunning}
                  />
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setBatchConfirmOpen(false)} disabled={batchRunning}>
                      Отмена
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      disabled={batchRunning || batchConfirmText.trim().toUpperCase() !== 'ARCHIVE' || !batchResult?.ids?.length}
                      onClick={() => runBatchExecute()}
                    >
                      Архивировать
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <QuickFilters
        items={quickItems}
        activeId={quick}
        onChange={(id) => {
          setEf({ quick: id }, { history: 'replace' });
          if (id === 'archived') {
            setEf(
              { isArchived: true, isPast: false, pastDays: null, hasFutureSessions: '', hasCategoryPrices: '' },
              { history: 'replace' },
            );
          } else if (id === 'past7') {
            setEf(
              { isArchived: false, isPast: true, pastDays: 7, hasFutureSessions: '', hasCategoryPrices: '' },
              { history: 'replace' },
            );
          } else if (id === 'past30') {
            setEf(
              { isArchived: false, isPast: true, pastDays: 30, hasFutureSessions: '', hasCategoryPrices: '' },
              { history: 'replace' },
            );
          } else if (id === 'active') {
            setEf(
              { isArchived: false, isPast: false, pastDays: null, hasFutureSessions: '', hasCategoryPrices: '' },
              { history: 'replace' },
            );
          } else if (id === 'seoIssues') {
            setEf(
              {
                isArchived: false,
                isPast: false,
                pastDays: null,
                // Interpret "SEO issues" minimally as "not indexable" => no future sessions.
                hasFutureSessions: 'false',
                hasCategoryPrices: '',
              },
              { history: 'replace' },
            );
          } else {
            setEf(
              { isArchived: false, isPast: false, pastDays: null, hasFutureSessions: '', hasCategoryPrices: '' },
              { history: 'replace' },
            );
          }
          list.setPageReplace(1);
        }}
      />

      <div className="rounded-lg border bg-card p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setEf({ filtersOpen: !filtersOpen }, { history: 'replace' })}
          aria-expanded={filtersOpen}
        >
          <div className="text-sm font-medium">Фильтры</div>
          <div className="text-xs text-muted-foreground">{filtersOpen ? 'Свернуть' : 'Развернуть'}</div>
        </button>

        {filtersOpen ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  list.reset();
                  resetEf({ history: 'replace' });
                }}
              >
                Сбросить все фильтры
              </Button>
            </div>
            <FilterFieldsGrid>
              <FilterField label="Поиск" className="sm:col-span-2 lg:col-span-2">
                <SearchInput
                  value={list.q}
                  onChange={(e) => list.setQ(e.target.value)}
                  placeholder="Название, адрес в URL или внешний ID"
                />
              </FilterField>
              <FilterField label="Статус">
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={list.status}
                  onChange={(e) => list.setStatus(e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="Оператор (поставщик)">
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={operatorSlug}
                  onChange={(e) => {
                    setEf({ operator: e.target.value }, { history: 'replace' });
                    list.setPageReplace(1);
                  }}
                >
                  <option value="">Все</option>
                  {(suppliersQuery.data ?? []).map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="Город">
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={list.city}
                  onChange={(e) => list.setCity(e.target.value)}
                >
                  <option value="">Все</option>
                  {(citiesQuery.data ?? []).map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="Категория">
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={section}
                  onChange={(e) => {
                    setEf({ section: e.target.value as '' | TopGroup }, { history: 'replace' });
                    list.setPageReplace(1);
                  }}
                >
                  {TOP_GROUPS.map((g) => (
                    <option key={g.id || 'all'} value={g.id} disabled={Boolean(g.disabled)}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="Подкатегория">
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={subcategory}
                  onChange={(e) => {
                    setEf({ subcategory: e.target.value }, { history: 'replace' });
                    list.setPageReplace(1);
                  }}
                >
                  <option value="">Все</option>
                  {(subcategoriesQuery.data ?? []).map((s) => (
                    <option key={s.id} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </FilterField>
            </FilterFieldsGrid>

            <div className="mt-4 flex flex-col gap-4 border-t border-border/80 pt-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-xs font-medium text-muted-foreground">Будущие сеансы</span>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="rounded border-input"
                    checked={hasFutureSessionsFilter === 'true'}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setEf(
                        {
                          hasFutureSessions: on
                            ? 'true'
                            : hasFutureSessionsFilter === 'true'
                              ? ''
                              : hasFutureSessionsFilter,
                        },
                        { history: 'replace' },
                      );
                      list.setPageReplace(1);
                    }}
                  />
                  Есть
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="rounded border-input"
                    checked={hasFutureSessionsFilter === 'false'}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setEf(
                        {
                          hasFutureSessions: on
                            ? 'false'
                            : hasFutureSessionsFilter === 'false'
                              ? ''
                              : hasFutureSessionsFilter,
                        },
                        { history: 'replace' },
                      );
                      list.setPageReplace(1);
                    }}
                  />
                  Нет
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-xs font-medium text-muted-foreground">Категории и цены</span>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="rounded border-input"
                    checked={hasCategoryPricesFilter === 'true'}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setEf(
                        {
                          hasCategoryPrices: on
                            ? 'true'
                            : hasCategoryPricesFilter === 'true'
                              ? ''
                              : hasCategoryPricesFilter,
                        },
                        { history: 'replace' },
                      );
                      list.setPageReplace(1);
                    }}
                  />
                  Есть цена
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="rounded border-input"
                    checked={hasCategoryPricesFilter === 'false'}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setEf(
                        {
                          hasCategoryPrices: on
                            ? 'false'
                            : hasCategoryPricesFilter === 'false'
                              ? ''
                              : hasCategoryPricesFilter,
                        },
                        { history: 'replace' },
                      );
                      list.setPageReplace(1);
                    }}
                  />
                  Нет цены
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium leading-none">
                  <input
                    type="checkbox"
                    className="rounded border-input"
                    checked={hasNoSubcategory}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setEf(
                        { hasNoSubcategory: next, hasMultipleSubcategories: next ? false : hasMultipleSubcategories },
                        { history: 'replace' },
                      );
                      list.setPageReplace(1);
                    }}
                  />
                  Без подкатегории
                </label>

                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium leading-none">
                  <input
                    type="checkbox"
                    className="rounded border-input"
                    checked={hasMultipleSubcategories}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setEf(
                        { hasMultipleSubcategories: next, hasNoSubcategory: next ? false : hasNoSubcategory },
                        { history: 'replace' },
                      );
                      list.setPageReplace(1);
                    }}
                  />
                  &gt; 1 подкатегории
                </label>

                <div className="flex min-w-[min(100%,280px)] flex-1 flex-wrap items-center justify-between gap-2 rounded-md border border-dashed bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  <span>Ошибки API / SEO-проблемы</span>
                  <Badge variant="outline" className="text-xs">
                    Скоро
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-2" />
        )}
      </div>

      <DataTableShell
        toolbar={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {query.isFetching ? 'Обновление…' : null}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {query.data ? (
                <>
                  Найдено: <span className="tabular-nums text-foreground">{query.data.total}</span>
                </>
              ) : (
                '—'
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => setColumnsOpen((v) => !v)}>
                Колонки
              </Button>
            </div>
          </div>
        }
        footer={
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Страница{' '}
              <span className="tabular-nums text-foreground">
                {query.data ? `${query.data.page} / ${query.data.pages}` : list.page}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="h-8 rounded-md border bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={list.pageSize}
                onChange={(e) => list.setPageSize(Number(e.target.value))}
              >
                {[25, 50, 100, 200, 500].map((n) => (
                  <option key={n} value={n}>
                    {n} / стр
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={list.page <= 1}
                onClick={() => list.setPage(Math.max(1, list.page - 1))}
              >
                Назад
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={Boolean(query.data) && list.page >= (query.data?.pages ?? list.page)}
                onClick={() => list.setPage(list.page + 1)}
              >
                Вперёд
              </Button>
            </div>
          </div>
        }
      >
        {columnsOpen ? (
          <div className="mb-3 rounded-md border bg-card p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">Отображаемые столбцы</div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setColumnsOpen(false)}>
                Закрыть
              </Button>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-4">
              {[
                ['main', 'Событие'],
                ['source', 'Поставщик'],
                ['location', 'Локация'],
                ['next', 'Ближайшая дата'],
                ['sessions', 'Сеансы'],
                ['price', 'Цена'],
                ['quality', 'Качество'],
                ['status', 'Статус'],
                ['issues', 'Проблемы'],
                ['override', 'Перекрытие'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={visibleCols.includes(key)}
                    onChange={(e) => toggleCol(key, e.target.checked)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}
        <EventsTable
          items={items}
          healthById={{}}
          loading={query.isLoading}
          error={query.isError ? (query.error instanceof Error ? query.error.message : 'Ошибка загрузки') : null}
          onRetry={() => query.refetch()}
          onToggleArchive={toggleArchive}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAllOnPage={toggleSelectAllOnPage}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={onSort}
          visibleCols={visibleCols}
        />
      </DataTableShell>
    </div>
  );
}

