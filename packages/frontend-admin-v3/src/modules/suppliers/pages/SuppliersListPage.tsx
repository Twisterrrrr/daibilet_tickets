import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { FilterBar, FilterField, FilterFieldsGrid } from '@/components/shared/filters/FilterBar';
import { SearchInput } from '@/components/shared/filters/SearchInput';
import { DataTableShell } from '@/components/shared/table/DataTableShell';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useListPageState } from '@/hooks/useListPageState';
import { fetchAdminSuppliersList, type AdminSupplierListItem } from '@/modules/suppliers/api/suppliers';
import { readBool01, readEnum } from '@/shared/url-state/parse';
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

const TRUST: Array<{ id: '' | '0' | '1' | '2' | '3'; label: string }> = [
  { id: '', label: 'Все уровни' },
  { id: '0', label: 'Новый (0)' },
  { id: '1', label: 'Базовый (1)' },
  { id: '2', label: 'Проверен (2)' },
  { id: '3', label: 'Надёжный (3)' },
];

const FILTER_SELECT =
  'h-9 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm';

type SuppliersListUrlFilters = {
  readinessStatus: '' | 'READY' | 'NEEDS_WORK' | 'BLOCKED';
  trustLevel: '' | '0' | '1' | '2' | '3';
  isActive: '' | 'yes' | 'no';
  hasBlockedEvents: boolean;
  hasNoUsers: boolean;
  hasLegalIssue: boolean;
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

export function SuppliersListPage() {
  const list = useListPageState();
  const { state: sf, setState: setSf } = useUrlState<SuppliersListUrlFilters>({
    defaults: {
      readinessStatus: '',
      trustLevel: '',
      isActive: '',
      hasBlockedEvents: false,
      hasNoUsers: false,
      hasLegalIssue: false,
    },
    parse: (sp) => ({
      readinessStatus: readEnum(sp, 'readinessStatus', ['' as const, 'READY', 'NEEDS_WORK', 'BLOCKED'], ''),
      trustLevel: readEnum(sp, 'trustLevel', ['' as const, '0', '1', '2', '3'], ''),
      isActive: readEnum(sp, 'isActive', ['' as const, 'yes', 'no'], ''),
      hasBlockedEvents: readBool01(sp, 'hasBlockedEvents') ?? false,
      hasNoUsers: readBool01(sp, 'hasNoUsers') ?? false,
      hasLegalIssue: readBool01(sp, 'hasLegalIssue') ?? false,
    }),
    serialize: (state, sp) => {
      setOrDelete(sp, 'readinessStatus', state.readinessStatus);
      setOrDelete(sp, 'trustLevel', state.trustLevel);
      setOrDelete(sp, 'isActive', state.isActive);
      setBool01(sp, 'hasBlockedEvents', state.hasBlockedEvents, false);
      setBool01(sp, 'hasNoUsers', state.hasNoUsers, false);
      setBool01(sp, 'hasLegalIssue', state.hasLegalIssue, false);
      return sp;
    },
  });

  const q = useQuery({
    queryKey: [
      'admin-suppliers-list',
      {
        q: list.debouncedQ,
        page: list.page,
        pageSize: list.pageSize,
        ...sf,
      },
    ],
    queryFn: () =>
      fetchAdminSuppliersList({
        page: list.page,
        limit: list.pageSize,
        search: list.debouncedQ || undefined,
        readinessStatus: sf.readinessStatus || undefined,
        trustLevel: sf.trustLevel === '' ? undefined : Number(sf.trustLevel),
        isActive: sf.isActive === 'yes' ? true : sf.isActive === 'no' ? false : undefined,
        hasBlockedEvents: sf.hasBlockedEvents || undefined,
        hasNoUsers: sf.hasNoUsers || undefined,
        hasLegalIssue: sf.hasLegalIssue || undefined,
      }),
    placeholderData: (p) => p,
  });

  const items = q.data?.items ?? [];
  const total = q.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / list.pageSize));

  if (q.isLoading && !q.data) return <LoadingState label="Загрузка поставщиков…" />;
  if (q.isError) {
    return (
      <ErrorState
        title="Не удалось загрузить список"
        description={q.error instanceof Error ? q.error.message : 'Ошибка'}
        onRetry={() => q.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Поставщики"
        subtitle="Операционный контур каталога: trust, качество листингов, юр./фин. сигналы, доступ в кабинет"
      />

      <FilterBar>
        <FilterFieldsGrid className="xl:grid-cols-5">
          <FilterField label="Поиск" className="sm:col-span-2 lg:col-span-2 xl:col-span-2">
            <SearchInput value={list.q} onChange={(e) => list.setQ(e.target.value)} placeholder="Название, email, ИНН…" />
          </FilterField>
          <FilterField label="Готовность">
            <select
              className={FILTER_SELECT}
              value={sf.readinessStatus}
              onChange={(e) => {
                setSf({ readinessStatus: (e.target.value || '') as typeof sf.readinessStatus }, { history: 'replace' });
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
          <FilterField label="Уровень доверия">
            <select
              className={FILTER_SELECT}
              value={sf.trustLevel}
              onChange={(e) => {
                setSf({ trustLevel: (e.target.value || '') as typeof sf.trustLevel }, { history: 'replace' });
                list.setPageReplace(1);
              }}
            >
              {TRUST.map((x) => (
                <option key={x.id || 'all'} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Активность">
            <select
              className={FILTER_SELECT}
              value={sf.isActive}
              onChange={(e) => {
                setSf({ isActive: e.target.value as '' | 'yes' | 'no' }, { history: 'replace' });
                list.setPageReplace(1);
              }}
            >
              <option value="">Все</option>
              <option value="yes">Активен</option>
              <option value="no">Выключен</option>
            </select>
          </FilterField>
        </FilterFieldsGrid>

        <div className="mt-3 w-full border-t border-border/60 pt-3">
          <div className="flex w-full flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-dashed border-border/80 bg-muted/15 px-3 py-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sf.hasBlockedEvents}
                onChange={() => {
                  setSf({ hasBlockedEvents: !sf.hasBlockedEvents }, { history: 'replace' });
                  list.setPageReplace(1);
                }}
              />
              Есть отклонённые события
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sf.hasNoUsers}
                onChange={() => {
                  setSf({ hasNoUsers: !sf.hasNoUsers }, { history: 'replace' });
                  list.setPageReplace(1);
                }}
              />
              Нет пользователей кабинета
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sf.hasLegalIssue}
                onChange={() => {
                  setSf({ hasLegalIssue: !sf.hasLegalIssue }, { history: 'replace' });
                  list.setPageReplace(1);
                }}
              />
              Юр. профиль с проблемами
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
          <table className="w-full min-w-[1120px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs font-medium uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-3">Поставщик</th>
                <th className="px-3 py-3">Готовность</th>
                <th className="px-3 py-3">Каталог / доступ</th>
                <th className="px-3 py-3">Доверие и финансы</th>
                <th className="w-44 px-3 py-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    Нет поставщиков по фильтру
                  </td>
                </tr>
              ) : (
                items.map((row) => <SupplierListRow key={row.id} row={row} />)
              )}
            </tbody>
          </table>
        </div>
      </DataTableShell>
    </div>
  );
}

function SupplierListRow({ row }: { row: AdminSupplierListItem }) {
  const rs = row.readinessStatus;
  const score = row.readinessScore;
  const signals = row.readinessKeySignals ?? [];
  const st = row.stats;
  const eventsHref = `/admin-v3/events?operator=${encodeURIComponent(row.slug)}`;  return (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="align-top px-3 py-3">
        <div className="font-medium leading-snug">
          <Link className="text-primary hover:underline" to={`/admin-v3/suppliers/${row.id}`}>
            {row.name}
          </Link>
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">{row.companyName || row.contactEmail || '—'}</div>
        <div className="mt-1 font-mono text-[11px] text-muted-foreground">{row.slug}</div>
      </td>
      <td className="align-top px-3 py-3">
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="outline" className={readinessBadgeClass(rs)}>
            {rs ?? '—'}
          </Badge>
          <Badge variant="outline">{row.status ?? '—'}</Badge>
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
        <div>
          События: {st.eventsCount} (активн.: {st.activeEventsCount}, отклон.: {st.blockedEventsCount})
        </div>
        <div>Пользователи: {st.usersCount} (OWNER: {st.activeOwnersCount})</div>
        <div>Площадки: {st.venuesCount}</div>
        <div className="text-muted-foreground">
          Расчёты в работе: {st.pendingSettlementsCount} · черновики док.: {st.documentsDraftCount}
        </div>
      </td>
      <td className="align-top px-3 py-3 text-xs">
        <div>Доверие: ур. {row.trustLevel}</div>
        <div>Качество каталога (proxy): {row.listingHealthScore}</div>
        <div>Комиссия: {row.commissionRate != null ? `${Math.round(Number(row.commissionRate) * 10000) / 100}%` : '—'}</div>
        <div className="mt-1 text-muted-foreground">Обновлено: {formatDt(row.updatedAt)}</div>
      </td>
      <td className="align-top px-3 py-3">
        <div className="flex flex-col gap-1">
          <Button type="button" size="sm" variant="secondary" asChild>
            <Link to={`/admin-v3/suppliers/${row.id}`}>Карточка</Link>
          </Button>
          <Button type="button" size="sm" variant="ghost" asChild>
            <Link to={eventsHref}>События</Link>
          </Button>
          <Button type="button" size="sm" variant="ghost" asChild>
            <Link to="/admin-v3/finance">Финансы</Link>
          </Button>
        </div>
      </td>
    </tr>
  );
}