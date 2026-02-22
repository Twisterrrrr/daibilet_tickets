import { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, SortableHeader } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/input';

interface CollectionItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  city: { name: string; slug: string } | null;
  isActive: boolean;
  sortOrder: number;
  filterCategory: string | null;
  filterTags: string[];
  pinnedCount: number;
  excludedCount: number;
  updatedAt: string;
}

const columns: ColumnDef<CollectionItem>[] = [
  {
    accessorKey: 'title',
    header: ({ column }) => <SortableHeader column={column}>Название</SortableHeader>,
    cell: ({ row }) => (
      <div>
        <span className="font-medium">{row.original.title}</span>
        {row.original.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{row.original.subtitle}</p>}
      </div>
    ),
  },
  {
    accessorKey: 'slug',
    header: 'Slug',
    cell: ({ row }) => <code className="text-xs text-muted-foreground">{row.original.slug}</code>,
  },
  {
    id: 'city',
    header: 'Город',
    cell: ({ row }) => <span>{row.original.city?.name || <Badge variant="outline">Кросс-город</Badge>}</span>,
  },
  {
    id: 'filters',
    header: 'Фильтры',
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.filterCategory && (
          <Badge variant="outline" className="text-xs">
            {row.original.filterCategory}
          </Badge>
        )}
        {row.original.filterTags.map((t) => (
          <Badge key={t} variant="secondary" className="text-xs">
            {t}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    id: 'curation',
    header: 'Курация',
    cell: ({ row }) => (
      <span className="text-xs tabular-nums">
        📌 {row.original.pinnedCount} / 🚫 {row.original.excludedCount}
      </span>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Статус',
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'success' : 'secondary'}>
        {row.original.isActive ? 'Активна' : 'Неактивна'}
      </Badge>
    ),
  },
  {
    accessorKey: 'sortOrder',
    header: ({ column }) => <SortableHeader column={column}>Порядок</SortableHeader>,
    cell: ({ row }) => <span className="tabular-nums">{row.original.sortOrder}</span>,
  },
];

export function CollectionsListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const query = params.toString();
    const path = query ? `/admin/collections?${query}` : '/admin/collections';

    adminApi
      .get<{ items: CollectionItem[] }>(path)
      .then((data) => setItems(data.items ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Подборки</h1>
          <p className="text-muted-foreground">Тематические посадочные страницы с курированным контентом</p>
        </div>
        <Button onClick={() => navigate('/collections/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Создать подборку
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            placeholder="Поиск по названию или slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Список подборок</CardTitle>
          <CardDescription>{items.length} подборок</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={items}
            onRowClick={(item) => navigate(`/collections/${item.id}`)}
            loading={loading}
            emptyText="Нет подборок. Создайте первую!"
          />
        </CardContent>
      </Card>
    </div>
  );
}
