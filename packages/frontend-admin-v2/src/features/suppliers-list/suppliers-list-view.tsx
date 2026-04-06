import { Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';

import type { SupplierEntity } from '@/entities/supplier/types';
import { FilterBar, FilterField } from '@/shared/layout/filter-bar';
import { formatDateTime } from '@/shared/lib/format';
import type { PageDataState } from '@/shared/types/page-state';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { SearchInput } from '@/shared/ui/search-input';
import { Select } from '@/shared/ui/select-field';
import { Skeleton } from '@/shared/ui/skeleton';
import { StatusBadge } from '@/shared/ui/status-badge';
import { compareSortValues, SortableTableHead, type TableSortDirection } from '@/shared/ui/sortable-table-head';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/shared/ui/table';
import { DataTableShell } from '@/widgets/data-table-shell/data-table-shell';
import { PageStateToggle } from '@/widgets/page-state-toggle/page-state-toggle';

type SupplierSortColumn = 'name' | 'status' | 'events' | 'quality' | 'updated';

function supplierSortValue(key: SupplierSortColumn, s: SupplierEntity): string | number {
  switch (key) {
    case 'name':
      return s.name;
    case 'status':
      return s.status;
    case 'events':
      return s.eventsCount;
    case 'quality':
      return s.catalogQuality;
    case 'updated':
      return new Date(s.updatedAt).getTime();
    default:
      return '';
  }
}

export function SuppliersListView({ rows }: { rows: SupplierEntity[] }) {
  const [demo, setDemo] = useState<PageDataState>('data');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [sortColumn, setSortColumn] = useState<SupplierSortColumn | null>(null);
  const [sortDir, setSortDir] = useState<TableSortDirection>('asc');

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (status && r.status !== status) return false;
      return true;
    });
  }, [rows, q, status]);

  const sortedFiltered = useMemo(() => {
    if (!sortColumn) return filtered;
    const mult = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort(
      (a, b) => mult * compareSortValues(supplierSortValue(sortColumn, a), supplierSortValue(sortColumn, b)),
    );
  }, [filtered, sortColumn, sortDir]);

  const toggleSort = (key: SupplierSortColumn) => {
    if (sortColumn !== key) {
      setSortColumn(key);
      setSortDir('asc');
      return;
    }
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
  };

  return (
    <DataTableShell
      toolbar={
        <div className="space-y-4">
          <PageStateToggle value={demo} onChange={setDemo} />
          <FilterBar>
            <FilterField label="Поиск">
              <SearchInput placeholder="Название поставщика…" value={q} onChange={(e) => setQ(e.target.value)} />
            </FilterField>
            <FilterField label="Статус">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Все</option>
                <option value="active">Активен</option>
                <option value="onboarding">Онбординг</option>
                <option value="suspended">Приостановлен</option>
              </Select>
            </FilterField>
          </FilterBar>
        </div>
      }
    >
      {demo === 'loading' ? <SuppliersSkeleton /> : null}
      {demo === 'error' ? <ErrorState /> : null}
      {demo === 'empty' ? (
        <EmptyState icon={Inbox} title="Поставщиков нет" description="Макет пустого каталога партнёров." />
      ) : null}
      {demo === 'data' && filtered.length === 0 ? (
        <EmptyState title="Ничего не найдено" description="Измените фильтры." />
      ) : null}
      {demo === 'data' && filtered.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead
                label="Поставщик"
                active={sortColumn === 'name'}
                direction={sortDir}
                onToggle={() => toggleSort('name')}
              />
              <SortableTableHead
                label="Статус"
                active={sortColumn === 'status'}
                direction={sortDir}
                onToggle={() => toggleSort('status')}
              />
              <SortableTableHead
                label="События"
                active={sortColumn === 'events'}
                direction={sortDir}
                onToggle={() => toggleSort('events')}
              />
              <SortableTableHead
                label="Качество каталога"
                active={sortColumn === 'quality'}
                direction={sortDir}
                onToggle={() => toggleSort('quality')}
              />
              <SortableTableHead
                label="Обновлено"
                active={sortColumn === 'updated'}
                direction={sortDir}
                onToggle={() => toggleSort('updated')}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedFiltered.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <Link
                    className="font-medium text-text-primary text-accent underline hover:no-underline"
                    to={`/suppliers/${s.id}`}
                  >
                    {s.name}
                  </Link>
                  <p className="text-small text-text-muted">{s.operatorLabel}</p>
                </TableCell>
                <TableCell>
                  <StatusBadge value={s.status} kind="supplier" />
                </TableCell>
                <TableCell className="text-text-secondary">{s.eventsCount}</TableCell>
                <TableCell>
                  <Badge variant="accent">{s.catalogQuality}</Badge>
                </TableCell>
                <TableCell className="text-small text-text-secondary">{formatDateTime(s.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </DataTableShell>
  );
}

function SuppliersSkeleton() {
  return (
    <div className="space-y-2 rounded-card border border-border-soft bg-surface p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
