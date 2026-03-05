import { ColumnDef } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, SortableHeader } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/input';

interface CityItem {
  id: string;
  name: string;
  slug: string;
  isFeatured: boolean;
  isActive: boolean;
  _count?: {
    events?: number;
    landingPages?: number;
    comboPages?: number;
  };
}

const columns: ColumnDef<CityItem>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column}>Название</SortableHeader>,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'slug',
    header: ({ column }) => <SortableHeader column={column}>Slug</SortableHeader>,
    cell: ({ row }) => <span className="text-muted-foreground font-mono text-sm">{row.original.slug}</span>,
  },
  {
    accessorKey: 'isFeatured',
    header: 'В топе',
    cell: ({ row }) => (
      <Badge variant={row.original.isFeatured ? 'success' : 'secondary'}>
        {row.original.isFeatured ? 'Да' : 'Нет'}
      </Badge>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Активен',
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'success' : 'secondary'}>{row.original.isActive ? 'Да' : 'Нет'}</Badge>
    ),
  },
  {
    id: 'eventsCount',
    accessorFn: (row) => row._count?.events ?? 0,
    header: ({ column }) => <SortableHeader column={column}>Событий</SortableHeader>,
    cell: ({ row }) => <span className="tabular-nums">{row.original._count?.events ?? 0}</span>,
  },
  {
    id: 'landingsCount',
    header: 'Лендингов',
    cell: ({ row }) => <span className="tabular-nums">{row.original._count?.landingPages ?? 0}</span>,
  },
  {
    id: 'combosCount',
    header: 'Combo',
    cell: ({ row }) => <span className="tabular-nums">{row.original._count?.comboPages ?? 0}</span>,
  },
];

export function CitiesListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    hasEvents: false,
    hasLandings: false,
    hasCombos: false,
  });

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.hasEvents) params.set('hasEvents', 'true');
    if (filters.hasLandings) params.set('hasLandings', 'true');
    if (filters.hasCombos) params.set('hasCombos', 'true');

    const query = params.toString();
    const path = query ? `/admin/cities?${query}` : '/admin/cities';

    adminApi
      .get<CityItem[] | { items: CityItem[] }>(path)
      .then((data) => {
        const list = Array.isArray(data) ? data : (data as { items: CityItem[] }).items;
        setItems(list ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [filters]);

  const handleRowClick = (item: CityItem) => {
    navigate(`/cities/${item.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Города</h1>
        <p className="text-muted-foreground">Управление городами для событий и лендингов</p>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Фильтры</CardTitle>
          <CardDescription>Поиск по названию или slug и по наличию сущностей</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              type="text"
              placeholder="Поиск..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="max-w-sm"
            />
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border border-gray-300"
                  checked={filters.hasEvents}
                  onChange={(e) => setFilters((f) => ({ ...f, hasEvents: e.target.checked }))}
                />
                <span>Есть события</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border border-gray-300"
                  checked={filters.hasLandings}
                  onChange={(e) => setFilters((f) => ({ ...f, hasLandings: e.target.checked }))}
                />
                <span>Есть лендинги</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border border-gray-300"
                  checked={filters.hasCombos}
                  onChange={(e) => setFilters((f) => ({ ...f, hasCombos: e.target.checked }))}
                />
                <span>Есть combo</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Список городов</CardTitle>
          <CardDescription>
            {items.length} {items.length === 1 ? 'город' : items.length < 5 ? 'города' : 'городов'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={items}
            onRowClick={handleRowClick}
            loading={loading}
            emptyText="Нет городов"
          />
        </CardContent>
      </Card>
    </div>
  );
}
