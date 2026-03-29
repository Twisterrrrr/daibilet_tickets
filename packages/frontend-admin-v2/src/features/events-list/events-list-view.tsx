import { CalendarDays, Camera, Columns2, Inbox } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import type { EventEntity } from '@/entities/event/types';
import { EventsColumnSettingsModal } from '@/features/events-list/events-column-settings-modal';
import {
  EVENT_TABLE_COLUMN_LABELS,
  loadPersistedEventsColumns,
  savePersistedEventsColumns,
  type EventTableColumnId,
} from '@/features/events-list/events-table-columns';
import { FilterBar, FilterField } from '@/shared/layout/filter-bar';
import { formatDateTime } from '@/shared/lib/format';
import type { PageDataState } from '@/shared/types/page-state';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { SearchInput } from '@/shared/ui/search-input';
import { Select } from '@/shared/ui/select-field';
import { Skeleton } from '@/shared/ui/skeleton';
import { StatusBadge } from '@/shared/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { DataTableShell } from '@/widgets/data-table-shell/data-table-shell';
import { PageStateToggle } from '@/widgets/page-state-toggle/page-state-toggle';

function renderEventCell(columnId: EventTableColumnId, e: EventEntity) {
  switch (columnId) {
    case 'title':
      return (
        <>
          <Link to={`/events/${e.id}`} className="font-medium text-text-primary hover:text-accent">
            {e.title}
          </Link>
          <p className="mt-0.5 text-small text-text-muted">{e.shortDescription}</p>
          <div className="mt-1 flex items-center gap-2">
            {e.issuesCount > 1 ? (
              <span title="Есть замечания по медиа" className="inline-flex text-warning">
                <Camera className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              </span>
            ) : null}
            {e.qualityScore < 85 ? (
              <span title="Проверить расписание/сеансы" className="inline-flex text-warning/90">
                <CalendarDays className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              </span>
            ) : null}
          </div>
        </>
      );
    case 'city':
      return <span className="text-text-secondary">{e.city}</span>;
    case 'status':
      return <StatusBadge value={e.status} kind="event" />;
    case 'source':
      return <StatusBadge value={e.source} kind="source" />;
    case 'quality':
      return (
        <Badge variant="accent" className="tabular-nums">
          {e.qualityScore}
        </Badge>
      );
    case 'issues':
      return <span className="tabular-nums text-text-secondary">{e.issuesCount}</span>;
    case 'supplier':
      return <span className="text-small text-text-secondary">{e.supplierName}</span>;
    case 'sessions':
      return <span className="text-small text-text-secondary">{e.sessionsSummary}</span>;
    case 'created':
      return <span className="text-small text-text-secondary">{formatDateTime(e.createdAt)}</span>;
    case 'updated':
      return <span className="text-small text-text-secondary">{formatDateTime(e.updatedAt)}</span>;
    default:
      return null;
  }
}

export function EventsListView({ rows }: { rows: EventEntity[] }) {
  const [demo, setDemo] = useState<PageDataState>('data');
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [columnOrder, setColumnOrder] = useState<EventTableColumnId[]>(() => loadPersistedEventsColumns());
  const [columnsModalOpen, setColumnsModalOpen] = useState(false);

  const cities = useMemo(() => Array.from(new Set(rows.map((r) => r.city))).sort(), [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (q && !r.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (city && r.city !== city) return false;
      if (status && r.status !== status) return false;
      if (source && r.source !== source) return false;
      return true;
    });
  }, [rows, q, city, status, source]);

  const applyColumns = (order: EventTableColumnId[]) => {
    setColumnOrder(order);
    savePersistedEventsColumns(order);
  };

  return (
    <>
      <DataTableShell
        toolbar={
          <div className="space-y-4">
            <PageStateToggle value={demo} onChange={setDemo} />
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
              <FilterBar className="min-w-0 flex-1">
                <FilterField label="Поиск">
                  <SearchInput
                    placeholder="Поиск по названию…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </FilterField>
                <FilterField label="Город">
                  <Select value={city} onChange={(e) => setCity(e.target.value)}>
                    <option value="">Все</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </FilterField>
                <FilterField label="Статус">
                  <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">Все</option>
                    <option value="draft">Черновик</option>
                    <option value="scheduled">Запланировано</option>
                    <option value="published">Опубликовано</option>
                    <option value="archived">Архив</option>
                  </Select>
                </FilterField>
                <FilterField label="Источник">
                  <Select value={source} onChange={(e) => setSource(e.target.value)}>
                    <option value="">Все</option>
                    <option value="internal">Внутренний</option>
                    <option value="supplier">Поставщик</option>
                    <option value="import">Импорт</option>
                    <option value="partner">Партнёр</option>
                  </Select>
                </FilterField>
              </FilterBar>
              <div className="flex shrink-0 items-center gap-3 sm:pb-0.5">
                <span className="text-small tabular-nums text-text-muted">
                  {filtered.length} из {rows.length}
                </span>
                <Button type="button" variant="secondary" size="md" onClick={() => setColumnsModalOpen(true)}>
                  <Columns2 className="h-4 w-4" aria-hidden />
                  Столбцы
                </Button>
              </div>
            </div>
          </div>
        }
      >
        {demo === 'loading' ? <EventsTableSkeleton /> : null}
        {demo === 'error' ? <ErrorState /> : null}
        {demo === 'empty' ? (
          <EmptyState icon={Inbox} title="Событий нет" description="Так выглядит пустой список в новой админке." />
        ) : null}
        {demo === 'data' && filtered.length === 0 ? (
          <EmptyState title="Ничего не найдено" description="Измените фильтры или сбросьте поиск." />
        ) : null}
        {demo === 'data' && filtered.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                {columnOrder.map((colId) => (
                  <TableHead key={colId}>{EVENT_TABLE_COLUMN_LABELS[colId]}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  {columnOrder.map((colId) => (
                    <TableCell key={colId}>{renderEventCell(colId, e)}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </DataTableShell>

      <EventsColumnSettingsModal
        open={columnsModalOpen}
        initialOrder={columnOrder}
        onClose={() => setColumnsModalOpen(false)}
        onApply={applyColumns}
      />
    </>
  );
}

function EventsTableSkeleton() {
  return (
    <div className="space-y-2 rounded-card border border-border-soft bg-surface p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-28" />
        </div>
      ))}
    </div>
  );
}
