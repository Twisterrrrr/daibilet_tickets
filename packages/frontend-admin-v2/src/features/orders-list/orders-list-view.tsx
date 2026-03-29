import { Inbox } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { OrderEntity } from '@/entities/order/types';
import { FilterBar, FilterField } from '@/shared/layout/filter-bar';
import { formatDateTime, formatMoney } from '@/shared/lib/format';
import type { PageDataState } from '@/shared/types/page-state';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { SearchInput } from '@/shared/ui/search-input';
import { Select } from '@/shared/ui/select-field';
import { Skeleton } from '@/shared/ui/skeleton';
import { StatusBadge } from '@/shared/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { DataTableShell } from '@/widgets/data-table-shell/data-table-shell';
import { PageStateToggle } from '@/widgets/page-state-toggle/page-state-toggle';

export function OrdersListView({ rows }: { rows: OrderEntity[] }) {
  const [demo, setDemo] = useState<PageDataState>('data');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const hay = `${r.code} ${r.eventTitle} ${r.buyerName} ${r.buyerEmail}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
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
              <SearchInput
                placeholder="Код, событие, покупатель…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </FilterField>
            <FilterField label="Статус">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Все</option>
                <option value="pending">Ожидает</option>
                <option value="paid">Оплачен</option>
                <option value="refunded">Возврат</option>
                <option value="cancelled">Отменён</option>
              </Select>
            </FilterField>
          </FilterBar>
        </div>
      }
    >
      {demo === 'loading' ? <OrdersSkeleton /> : null}
      {demo === 'error' ? <ErrorState /> : null}
      {demo === 'empty' ? <EmptyState icon={Inbox} title="Заказов нет" description="Макет пустого списка заказов." /> : null}
      {demo === 'data' && filtered.length === 0 ? (
        <EmptyState title="Ничего не найдено" description="Измените фильтры или запрос." />
      ) : null}
      {demo === 'data' && filtered.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Код</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Сумма</TableHead>
              <TableHead>Событие</TableHead>
              <TableHead>Покупатель</TableHead>
              <TableHead>Поставщик</TableHead>
              <TableHead>Создан</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-small text-text-primary">{o.code}</TableCell>
                <TableCell>
                  <StatusBadge value={o.status} kind="order" />
                </TableCell>
                <TableCell className="font-medium text-text-primary">{formatMoney(o.amount, o.currency)}</TableCell>
                <TableCell>
                  <span className="text-body text-text-primary">{o.eventTitle}</span>
                </TableCell>
                <TableCell>
                  <p className="text-body text-text-primary">{o.buyerName}</p>
                  <p className="text-small text-text-muted">{o.buyerEmail}</p>
                </TableCell>
                <TableCell className="text-small text-text-secondary">{o.supplierName}</TableCell>
                <TableCell className="text-small text-text-secondary">{formatDateTime(o.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </DataTableShell>
  );
}

function OrdersSkeleton() {
  return (
    <div className="space-y-2 rounded-card border border-border-soft bg-surface p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
        </div>
      ))}
    </div>
  );
}
