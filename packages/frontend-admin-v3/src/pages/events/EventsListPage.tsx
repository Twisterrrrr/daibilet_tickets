import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { FilterBar, FilterField } from '@/components/shared/filters/FilterBar';
import { QuickFilters, type QuickFilterItem } from '@/components/shared/filters/QuickFilters';
import { SearchInput } from '@/components/shared/filters/SearchInput';
import { DataTableShell } from '@/components/shared/table/DataTableShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useListPageState } from '@/hooks/useListPageState';
import { fetchAdminEventsList } from '@/modules/events/api/queries';
import { adminApi } from '@/api/client';
import { EventsTable } from '@/modules/events/components/table/EventsTable';
import { topGroupLabels, type TopGroup } from '@/config/top-groups';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

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
  { id: 'hidden', label: 'Скрытые (override)' },
];

export function EventsListPage() {
  const list = useListPageState();
  const qc = useQueryClient();

  const [batchOpen, setBatchOpen] = React.useState<boolean>(false);
  const [batchConfirmOpen, setBatchConfirmOpen] = React.useState<boolean>(false);
  const [batchConfirmText, setBatchConfirmText] = React.useState<string>('');
  const [batchSource, setBatchSource] = React.useState<BatchArchiveSource>('TICKETSCLOUD');
  const [batchOlderThanDays, setBatchOlderThanDays] = React.useState<number>(90);
  const [batchTake, setBatchTake] = React.useState<number>(500);
  const [batchRunning, setBatchRunning] = React.useState<boolean>(false);
  const [batchError, setBatchError] = React.useState<string | null>(null);
  const [batchResult, setBatchResult] = React.useState<BatchArchiveDryRunResult | null>(null);

  const [quick, setQuick] = React.useState<string>('all');
  const [section, setSection] = React.useState<'' | TopGroup>('');
  const [subcategory, setSubcategory] = React.useState<string>('');
  const [hasNoSubcategory, setHasNoSubcategory] = React.useState<boolean>(false);
  const [hasMultipleSubcategories, setHasMultipleSubcategories] = React.useState<boolean>(false);
  const [showPast, setShowPast] = React.useState<boolean>(false);
  const [showArchived, setShowArchived] = React.useState<boolean>(false);
  const [pastDays, setPastDays] = React.useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = React.useState<boolean>(true);
  const [sortBy, setSortBy] = React.useState<'updatedAt' | 'title' | 'city' | 'source'>('updatedAt');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');
  const [columnsOpen, setColumnsOpen] = React.useState<boolean>(false);
  const [visibleCols, setVisibleCols] = React.useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('admin_v3_events_columns');
      if (!raw) return ['main', 'source', 'location', 'next', 'sessions', 'quality', 'status', 'issues', 'override', 'actions'];
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')
        ? (parsed as string[])
        : ['main', 'source', 'location', 'next', 'sessions', 'quality', 'status', 'issues', 'override', 'actions'];
    } catch {
      return ['main', 'source', 'location', 'next', 'sessions', 'quality', 'status', 'issues', 'override', 'actions'];
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
      setBatchError(e instanceof Error ? e.message : 'Ошибка dry-run');
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
      setBatchError(e instanceof Error ? e.message : 'Ошибка execute');
    } finally {
      setBatchRunning(false);
    }
  }

  const effectiveStatus = quick === 'all' ? list.status : quick;
  const active =
    effectiveStatus === 'active' ? 'true' : effectiveStatus === 'inactive' ? 'false' : undefined;
  const hidden = effectiveStatus === 'hidden' ? 'true' : undefined;

  const query = useQuery({
    queryKey: [
      'admin-events',
      {
        q: list.debouncedQ,
        page: list.page,
        pageSize: list.pageSize,
        active,
        hidden,
        city: list.city,
        section,
        subcategory,
        hasNoSubcategory,
        hasMultipleSubcategories,
        sortBy,
        sortDir,
      },
    ],
    queryFn: () =>
      fetchAdminEventsList({
        q: list.debouncedQ,
        page: list.page,
        limit: list.pageSize,
        active,
        hidden,
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
    setSortBy((prev) => {
      if (prev === nextBy) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('desc');
      return nextBy;
    });
    list.setPage(1);
  }

  const quickItems: QuickFilterItem[] = [
    { id: 'all', label: 'Все' },
    { id: 'active', label: 'Активные' },
    { id: 'archived', label: 'Архив' },
    { id: 'past7', label: 'Прошедшие 7 дней' },
    { id: 'past30', label: 'Прошедшие 30 дней' },
    { id: 'apiIssues', label: 'Ошибки API', disabled: true },
    { id: 'seoIssues', label: 'SEO-проблемы', disabled: true },
    { id: 'override', label: 'Override', disabled: true },
    { id: 'noImage', label: 'Без фото', disabled: true },
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

  const batchHealth = useQuery({
    queryKey: ['admin-events-health-batch', { ids: items.map((x) => x.id).join(',') }],
    enabled: items.length > 0,
    queryFn: async () => {
      const ids = items.map((x) => x.id).join(',');
      const res = await adminApi.get<{
        items: Array<{ id: string; flags: Record<string, boolean>; issueCodes: string[] }>;
      }>(`/admin/events/health/batch?ids=${encodeURIComponent(ids)}`);
      const byId: Record<string, { flags: Record<string, boolean>; issueCodes: string[] } | undefined> = {};
      for (const row of res.items ?? []) byId[row.id] = { flags: row.flags ?? {}, issueCodes: row.issueCodes ?? [] };
      return byId;
    },
    staleTime: 30_000,
  });

  const healthById = batchHealth.data ?? {};

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
          aria-label="Batch-архивирование (dry-run)"
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
                  <div className="text-xs font-medium text-muted-foreground">Лимит (take)</div>
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
                  Copy ids
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
                        Диапазон lastSessionAt: <span className="text-foreground">{summarizeLastSessionRange(batchResult.items ?? [])}</span>
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
                          <th className="px-3 py-2 text-left">Source</th>
                          <th className="px-3 py-2 text-left">Last session</th>
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
                  <div className="mt-3 text-sm text-muted-foreground">Запусти dry-run, чтобы увидеть кандидатов.</div>
                )}
              </div>
            </div>

            {batchConfirmOpen ? (
              <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Подтверждение batch-архива">
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
                      Для подтверждения введи <span className="font-mono text-foreground">ARCHIVE</span>.
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
          setQuick(id);
          if (id === 'archived') {
            setShowArchived(true);
            setShowPast(false);
            setPastDays(null);
          } else if (id === 'past7') {
            setShowArchived(false);
            setShowPast(true);
            setPastDays(7);
          } else if (id === 'past30') {
            setShowArchived(false);
            setShowPast(true);
            setPastDays(30);
          } else if (id === 'active') {
            setShowArchived(false);
            setShowPast(false);
            setPastDays(null);
          } else {
            setShowArchived(false);
            setShowPast(false);
            setPastDays(null);
          }
          list.setPage(1);
        }}
      />

      <div className="rounded-lg border bg-card p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
        >
          <div className="text-sm font-medium">Фильтры</div>
          <div className="text-xs text-muted-foreground">{filtersOpen ? 'Свернуть' : 'Развернуть'}</div>
        </button>

        {filtersOpen ? (
          <div className="mt-4 space-y-4">
            <FilterBar>
              <FilterField label="Поиск">
                <SearchInput
                  value={list.q}
                  onChange={(e) => list.setQ(e.target.value)}
                  placeholder="Поиск по названию / slug / external ID"
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
              <FilterField label="Поставщик">
                <Input disabled value="Скоро" />
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
              <FilterField label="Площадка">
                <Input disabled value="Скоро" />
              </FilterField>
              <FilterField label="Категория">
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={section}
                  onChange={(e) => {
                    setSection(e.target.value as '' | TopGroup);
                    list.setPage(1);
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
                    setSubcategory(e.target.value);
                    list.setPage(1);
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
            </FilterBar>

            <div className="rounded-md border bg-background p-3">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Без подкатегории</div>
                  <label className="mt-1 flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm shadow-sm">
                    <input
                      type="checkbox"
                      checked={hasNoSubcategory}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setHasNoSubcategory(next);
                        if (next) setHasMultipleSubcategories(false);
                        list.setPage(1);
                      }}
                    />
                    Да
                  </label>
                </div>

                <div>
                  <div className="text-xs font-medium text-muted-foreground">&gt; 1 подкатегории</div>
                  <label className="mt-1 flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm shadow-sm">
                    <input
                      type="checkbox"
                      checked={hasMultipleSubcategories}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setHasMultipleSubcategories(next);
                        if (next) setHasNoSubcategory(false);
                        list.setPage(1);
                      }}
                    />
                    Да
                  </label>
                </div>

                <div>
                  <div className="text-xs font-medium text-muted-foreground">Проблемы</div>
                  <div className="mt-1 flex h-9 items-center justify-between rounded-md border bg-card px-3 text-sm shadow-sm text-muted-foreground">
                    <span>Ошибки API / SEO-проблемы</span>
                    <span className="text-xs">Скоро</span>
                  </div>
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
                ['override', 'Override'],
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
          healthById={healthById}
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

