import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@/api/client';
import { DataTable, SortableHeader } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CityItem {
  id: string;
  name: string;
  slug: string;
  isFeatured: boolean;
  isActive: boolean;
  _count?: {
    events?: number;
    landings?: number;
    combos?: number;
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
      <Badge variant={row.original.isActive ? 'success' : 'secondary'}>
        {row.original.isActive ? 'Да' : 'Нет'}
      </Badge>
    ),
  },
  {
    id: 'eventsCount',
    header: 'Событий',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original._count?.events ?? 0}</span>
    ),
  },
  {
    id: 'landingsCount',
    header: 'Лендингов',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original._count?.landings ?? 0}</span>
    ),
  },
  {
    id: 'combosCount',
    header: 'Combo',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original._count?.combos ?? 0}</span>
    ),
  },
];

export function CitiesListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search) params.set('search', search);

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
  }, [search]);

  const handleRowClick = (item: CityItem) => {
    navigate(`/cities/${item.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Города</h1>
        <p className="text-muted-foreground">
          Управление городами для событий и лендингов
        </p>
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
          <CardDescription>Поиск по названию или slug</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
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
