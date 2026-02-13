import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { adminApi } from '@/api/client';
import { DataTable, SortableHeader } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface ArticleItem {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  updatedAt: string;
  city?: { slug: string; name: string };
  _count?: { articleEvents: number; articleTags: number };
}

interface ArticlesResponse {
  items: ArticleItem[];
  total: number;
  page: number;
  pages: number;
}

const columns: ColumnDef<ArticleItem>[] = [
  {
    accessorKey: 'title',
    header: ({ column }) => <SortableHeader column={column}>Название</SortableHeader>,
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.title}</p>
        <p className="text-xs text-muted-foreground">{row.original.slug}</p>
      </div>
    ),
  },
  {
    id: 'city',
    header: 'Город',
    cell: ({ row }) => row.original.city?.name ?? '—',
  },
  {
    accessorKey: 'isPublished',
    header: 'Опубликован',
    cell: ({ row }) => (
      <Badge variant={row.original.isPublished ? 'success' : 'default'}>
        {row.original.isPublished ? 'Да' : 'Нет'}
      </Badge>
    ),
  },
  {
    id: 'eventsCount',
    header: 'События',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original._count?.articleEvents ?? 0}</span>
    ),
  },
  {
    id: 'tagsCount',
    header: 'Теги',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original._count?.articleTags ?? 0}</span>
    ),
  },
  {
    accessorKey: 'updatedAt',
    header: ({ column }) => <SortableHeader column={column}>Обновлено</SortableHeader>,
    cell: ({ row }) =>
      row.original.updatedAt
        ? new Date(row.original.updatedAt).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        : '—',
  },
];

export function ArticlesListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<ArticlesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    city: '',
    published: '',
    search: '',
    page: 1,
    limit: 20,
  });

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filters.city) params.set('city', filters.city);
    if (filters.published) params.set('published', filters.published);
    if (filters.search) params.set('search', filters.search);
    params.set('page', String(filters.page));
    params.set('limit', String(filters.limit));

    adminApi
      .get<ArticlesResponse>(`/admin/articles?${params.toString()}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [filters]);

  const handleRowClick = (item: ArticleItem) => {
    navigate(`/articles/${item.id}`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Статьи</h1>
          <p className="text-muted-foreground">
            {data ? `${data.total} статей` : <Skeleton className="h-4 w-20 inline-block" />}
          </p>
        </div>
        <Button asChild>
          <Link to="/articles/new" className="gap-2">
            <Plus className="h-4 w-4" />
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
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="text"
              placeholder="Поиск..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
              className="max-w-[250px]"
            />
            <Select
              value={filters.city || '__all__'}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, city: v === '__all__' ? '' : v, page: 1 }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Все города" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Все города</SelectItem>
                <SelectItem value="moscow">Москва</SelectItem>
                <SelectItem value="spb">Санкт-Петербург</SelectItem>
                <SelectItem value="kazan">Казань</SelectItem>
                <SelectItem value="kaliningrad">Калининград</SelectItem>
                <SelectItem value="vladimir">Владимир</SelectItem>
                <SelectItem value="yaroslavl">Ярославль</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.published || '__all__'}
              onValueChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  published: v === '__all__' ? '' : v,
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Все</SelectItem>
                <SelectItem value="true">Опубликованные</SelectItem>
                <SelectItem value="false">Черновики</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={data?.items ?? []}
            onRowClick={handleRowClick}
            loading={loading}
            emptyText="Нет статей"
          />

          {/* Server pagination */}
          {data && data.pages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Показано {data.items.length} из {data.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                  disabled={filters.page <= 1}
                >
                  Назад
                </Button>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {filters.page} / {data.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                  disabled={filters.page >= data.pages}
                >
                  Вперёд
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
