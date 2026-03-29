import { Inbox } from 'lucide-react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { DataTableShell } from '@/widgets/data-table-shell/data-table-shell';
import { PageStateToggle } from '@/widgets/page-state-toggle/page-state-toggle';

export function SuppliersListView({ rows }: { rows: SupplierEntity[] }) {
  const [demo, setDemo] = useState<PageDataState>('data');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (status && r.status !== status) return false;
      return true;
    });
  }, [rows, q, status]);

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
              <TableHead>Поставщик</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>События</TableHead>
              <TableHead>Качество каталога</TableHead>
              <TableHead>Обновлено</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <p className="font-medium text-text-primary">{s.name}</p>
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
