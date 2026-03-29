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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { DataTableShell } from '@/widgets/data-table-shell/data-table-shell';
import { PageStateToggle } from '@/widgets/page-state-toggle/page-state-toggle';

export function VenuesListView({ rows }: { rows: VenueEntity[] }) {
  const [demo, setDemo] = useState<PageDataState>('data');
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');

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
            <FilterField label="Тип">
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Все</option>
                <option value="museum">Музей</option>
                <option value="theater">Театр</option>
                <option value="boat">Вода</option>
                <option value="walking">Пешком</option>
                <option value="other">Другое</option>
              </Select>
            </FilterField>
          </FilterBar>
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
              <TableHead>Площадка</TableHead>
              <TableHead>Город</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Quality</TableHead>
              <TableHead>События</TableHead>
              <TableHead>Обновлено</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((v) => (
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
