import { Inbox } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import type { VenueEntity } from '@/entities/venue/types';
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

type VenueSortColumn = 'name' | 'city' | 'status' | 'type' | 'quality' | 'events' | 'updated';

function venueSortValue(key: VenueSortColumn, v: VenueEntity): string | number {
  switch (key) {
    case 'name':
      return v.name;
    case 'city':
      return v.city;
    case 'status':
      return v.status;
    case 'type':
      return v.type;
    case 'quality':
      return v.qualityScore;
    case 'events':
      return v.eventsCount;
    case 'updated':
      return new Date(v.updatedAt).getTime();
    default:
      return '';
  }
}

export function VenuesListView({ rows }: { rows: VenueEntity[] }) {
  const [demo, setDemo] = useState<PageDataState>('data');
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [sortColumn, setSortColumn] = useState<VenueSortColumn | null>(null);
  const [sortDir, setSortDir] = useState<TableSortDirection>('asc');

  const cities = useMemo(() => Array.from(new Set(rows.map((r) => r.city))).sort(), [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (city && r.city !== city) return false;
      if (status && r.status !== status) return false;
      if (type && r.type !== type) return false;
      return true;
    });
  }, [rows, q, city, status, type]);

  const sortedFiltered = useMemo(() => {
    if (!sortColumn) return filtered;
    const mult = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort(
      (a, b) => mult * compareSortValues(venueSortValue(sortColumn, a), venueSortValue(sortColumn, b)),
    );
  }, [filtered, sortColumn, sortDir]);

  const toggleSort = (key: VenueSortColumn) => {
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
              <SearchInput placeholder="Название площадки…" value={q} onChange={(e) => setQ(e.target.value)} />
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
                <option value="ready">Готово</option>
                <option value="live">В эфире</option>
                <option value="paused">Пауза</option>
              </Select>
            </FilterField>
            <FilterField label="Тип площадки">
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Все</option>
                <option value="MUSEUM">Музей</option>
                <option value="GALLERY">Галерея</option>
                <option value="ART_SPACE">Арт-пространство</option>
                <option value="EXHIBITION_HALL">Выставочный зал</option>
                <option value="THEATER">Театр</option>
                <option value="PALACE">Дворец / усадьба</option>
                <option value="PARK">Парк / заповедник</option>
              </Select>
            </FilterField>
          </FilterBar>
          <p className="text-small text-text-muted">
            Здесь только культурные площадки (как в проде). Причалы, точки старта пеших/водных маршрутов — сущность{' '}
            <strong>Location</strong> в БД; публичный хаб по речным прогулкам — отдельно (например, раздел «Речные» /
            причалы), не смешивать с типом музея.
          </p>
        </div>
      }
    >
      {demo === 'loading' ? <VenuesSkeleton /> : null}
      {demo === 'error' ? <ErrorState /> : null}
      {demo === 'empty' ? (
        <EmptyState icon={Inbox} title="Площадок нет" description="Макет пустого списка площадок." />
      ) : null}
      {demo === 'data' && filtered.length === 0 ? (
        <EmptyState title="Ничего не найдено" description="Сбросьте фильтры или измените запрос." />
      ) : null}
      {demo === 'data' && filtered.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead
                label="Площадка"
                active={sortColumn === 'name'}
                direction={sortDir}
                onToggle={() => toggleSort('name')}
              />
              <SortableTableHead
                label="Город"
                active={sortColumn === 'city'}
                direction={sortDir}
                onToggle={() => toggleSort('city')}
              />
              <SortableTableHead
                label="Статус"
                active={sortColumn === 'status'}
                direction={sortDir}
                onToggle={() => toggleSort('status')}
              />
              <SortableTableHead
                label="Тип"
                active={sortColumn === 'type'}
                direction={sortDir}
                onToggle={() => toggleSort('type')}
              />
              <SortableTableHead
                label="Quality"
                active={sortColumn === 'quality'}
                direction={sortDir}
                onToggle={() => toggleSort('quality')}
              />
              <SortableTableHead
                label="События"
                active={sortColumn === 'events'}
                direction={sortDir}
                onToggle={() => toggleSort('events')}
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
            {sortedFiltered.map((v) => (
              <TableRow key={v.id}>
                <TableCell>
                  <Link to={`/venues/${v.id}`} className="font-medium text-text-primary hover:text-accent">
                    {v.name}
                  </Link>
                  <p className="mt-0.5 text-small text-text-muted">{v.shortDescription}</p>
                </TableCell>
                <TableCell className="text-text-secondary">{v.city}</TableCell>
                <TableCell>
                  <StatusBadge value={v.status} kind="venue" />
                </TableCell>
                <TableCell>
                  <StatusBadge value={v.type} kind="venue-type" />
                </TableCell>
                <TableCell>
                  <Badge variant="accent">{v.qualityScore}</Badge>
                </TableCell>
                <TableCell className="text-text-secondary">{v.eventsCount}</TableCell>
                <TableCell className="text-small text-text-secondary">{formatDateTime(v.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </DataTableShell>
  );
}

function VenuesSkeleton() {
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
