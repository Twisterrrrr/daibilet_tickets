import { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, SortableHeader } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type TagCategory = 'THEME' | 'AUDIENCE' | 'SEASON' | 'SPECIAL';

interface TagItem {
  id: string;
  name: string;
  slug: string;
  category: TagCategory;
  isActive: boolean;
  _count?: { events?: number };
}

const CATEGORY_VARIANTS: Record<TagCategory, 'success' | 'warning' | 'secondary' | 'default'> = {
  THEME: 'secondary',
  AUDIENCE: 'success',
  SEASON: 'warning',
  SPECIAL: 'default',
};

const CATEGORY_LABELS: Record<TagCategory, string> = {
  THEME: 'Тема',
  AUDIENCE: 'Аудитория',
  SEASON: 'Сезон',
  SPECIAL: 'Специальный',
};

const columns: ColumnDef<TagItem>[] = [
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
    accessorKey: 'category',
    header: 'Категория',
    cell: ({ row }) => (
      <Badge variant={CATEGORY_VARIANTS[row.original.category] ?? 'default'}>
        {CATEGORY_LABELS[row.original.category] ?? row.original.category}
      </Badge>
    ),
  },
  {
    id: 'eventsCount',
    header: 'Событий',
    cell: ({ row }) => <span className="tabular-nums">{row.original._count?.events ?? 0}</span>,
  },
  {
    accessorKey: 'isActive',
    header: 'Активен',
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'success' : 'secondary'}>{row.original.isActive ? 'Да' : 'Нет'}</Badge>
    ),
  },
];

export function TagsListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search) params.set('search', search);

    adminApi
      .get<TagItem[] | { items: TagItem[] }>(`/admin/tags${params.toString() ? `?${params}` : ''}`)
      .then((res) => setData(Array.isArray(res) ? res : ((res as any).items ?? res)))
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [category, search]);

  const handleRowClick = (item: TagItem) => {
    navigate(`/tags/${item.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Теги</h1>
          <p className="text-muted-foreground">Управление тегами для категоризации событий</p>
        </div>
        <Button asChild>
          <Link to="/tags/new">
            <Plus className="mr-2 h-4 w-4" />
            Создать
          </Link>
        </Button>
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
          <CardDescription>Поиск и фильтрация по категории</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Input
              type="text"
              placeholder="Поиск по названию или slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Select value={category || '__all__'} onValueChange={(v) => setCategory(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Все категории" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Все категории</SelectItem>
                {(Object.keys(CATEGORY_LABELS) as TagCategory[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Список тегов</CardTitle>
          <CardDescription>
            {data.length} {data.length === 1 ? 'тег' : data.length < 5 ? 'тега' : 'тегов'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data}
            onRowClick={handleRowClick}
            loading={loading}
            emptyText="Нет тегов"
          />
        </CardContent>
      </Card>
    </div>
  );
}
