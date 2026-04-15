import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { FilterBar, FilterField } from '@/components/shared/filters/FilterBar';
import { SearchInput } from '@/components/shared/filters/SearchInput';
import { DataTableShell } from '@/components/shared/table/DataTableShell';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useListPageState } from '@/hooks/useListPageState';
import { fetchAdminSuppliersList, type AdminSupplierListItem } from '@/modules/suppliers/api/suppliers';
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
  { id: '0', label: 'NEW (0)' },
  { id: '1', label: 'BASIC (1)' },
  { id: '2', label: 'VERIFIED (2)' },
  { id: '3', label: 'TRUSTED (3)' },
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
    case 'BLOCKED':
      return 'border-destructive/40 bg-destructive/10 text-destructive';
    case 'NEEDS_WORK':
    default:
      return 'border-muted-foreground/30 bg-muted/50';
  }
}

export function SuppliersListPage() {
  const list = useListPageState();
  const [readinessStatus, setReadinessStatus] = React.useState<'' | 'READY' | 'NEEDS_WORK' | 'BLOCKED'>('');
  const [trustLevel, setTrustLevel] = React.useState<'' | '0' | '1' | '2' | '3'>('');
  const [isActive, setIsActive] = React.useState<'' | 'yes' | 'no'>('');
  const [hasBlockedEvents, setHasBlockedEvents] = React.useState(false);
  const [hasNoUsers, setHasNoUsers] = React.useState(false);
  const [hasLegalIssue, setHasLegalIssue] = React.useState(false);

  const q = useQuery({
    queryKey: [
      'admin-suppliers-list',
      {
        q: list.debouncedQ,
        page: list.page,
        pageSize: list.pageSize,
        readinessStatus,
        trustLevel,
        isActive,
        hasBlockedEvents,
        hasNoUsers,
        hasLegalIssue,
      },
    ],
    queryFn: () =>
      fetchAdminSuppliersList({
        page: list.page,
        limit: list.pageSize,
        search: list.debouncedQ || undefined,
        readinessStatus: readinessStatus || undefined,
        trustLevel: trustLevel === '' ? undefined : Number(trustLevel),
        isActive: isActive === 'yes' ? true : isActive === 'no' ? false : undefined,
        hasBlockedEvents: hasBlockedEvents || undefined,
        hasNoUsers: hasNoUsers || undefined,
        hasLegalIssue: hasLegalIssue || undefined,
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
        <FilterField label="Поиск">
          <SearchInput value={list.q} onChange={(e) => list.setQ(e.target.value)} placeholder="Название, email, ИНН…" />
        </FilterField>
        <FilterField label="Готовность">
          <select
            className="h-9 w-full min-w-[160px] rounded-md border border-input bg-background px-2 text-sm"
            value={readinessStatus}
            onChange={(e) => {
              setReadinessStatus((e.target.value || '') as typeof readinessStatus);
              list.setPage(1);
            }}
          >
            {READINESS.map((x) => (
              <option key={x.id || 'all'} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Trust level">
          <select
            className="h-9 w-full min-w-[140px] rounded-md border border-input bg-background px-2 text-sm"
            value={trustLevel}
            onChange={(e) => {
              setTrustLevel((e.target.value || '') as typeof trustLevel);
              list.setPage(1);
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
            className="h-9 w-full min-w-[120px] rounded-md border border-input bg-background px-2 text-sm"
            value={isActive}
            onChange={(e) => {
              setIsActive(e.target.value as '' | 'yes' | 'no');
              list.setPage(1);
            }}
          >
            <option value="">Все</option>
            <option value="yes">Активен</option>
            <option value="no">Выключен</option>
          </select>
        </FilterField>
        <FilterField label="Быстрые фильтры">
          <div className="flex flex-col gap-1 text-xs">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={hasBlockedEvents}
                onChange={() => {
                  setHasBlockedEvents((v) => !v);
                  list.setPage(1);
                }}
              />
              Есть REJECTED события
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={hasNoUsers}
                onChange={() => {
                  setHasNoUsers((v) => !v);
                  list.setPage(1);
                }}
              />
              Нет пользователей кабинета
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={hasLegalIssue}
                onChange={() => {
                  setHasLegalIssue((v) => !v);
                  list.setPage(1);
                }}
              />
              Юр. профиль с проблемами
            </label>
          </div>
        </FilterField>
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
                <th className="px-3 py-3">Trust / финансы</th>
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
  const eventsHref = `/admin-v3/events?operator=${encodeURIComponent(row.slug)}`;

  return (
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
        <div>Trust: L{row.trustLevel}</div>
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
