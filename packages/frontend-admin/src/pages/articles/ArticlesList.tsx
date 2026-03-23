import { ColumnDef } from '@tanstack/react-table';
import { ExternalLink, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ErrorState, PageHeader } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    header: 'Заголовок',
    cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
  },
  {
    id: 'city',
    header: 'Город',
    cell: ({ row }) => <span className="text-sm">{row.original.city?.name ?? '—'}</span>,
  },
  {
    id: 'tags',
    header: 'Теги',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-[10px]">
        тегов: {row.original._count?.articleTags ?? 0}
      </Badge>
    ),
  },
  {
    id: 'status',
    header: 'Статус',
    cell: ({ row }) => (
      <Badge variant={row.original.isPublished ? 'default' : 'secondary'}>
        {row.original.isPublished ? 'Опубликовано' : 'Черновик'}
      </Badge>
    ),
  },
  {
    accessorKey: 'updatedAt',
    header: 'Обновлено',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.updatedAt
          ? new Date(row.original.updatedAt).toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })
          : '—'}
      </span>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) =>
      row.original.isPublished ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      ) : null,
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
      <PageHeader
        title="Статьи"
        subtitle={loading ? 'Загружаем список статей...' : `${data?.total ?? 0} статей`}
        actions={
          <Button asChild>
            <Link to="/articles/new" className="gap-1">
              <Plus className="h-4 w-4" />
              Новая статья
            </Link>
          </Button>
        }
      />

      {error && (
        <ErrorState title="Не удалось загрузить статьи" description={error} />
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-48 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Поиск..."
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                className="pl-9"
              />
            </div>
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
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Все статусы</SelectItem>
                <SelectItem value="true">Опубликовано</SelectItem>
                <SelectItem value="false">Черновик</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.city || '__all__'}
              onValueChange={(v) => setFilters((f) => ({ ...f, city: v === '__all__' ? '' : v, page: 1 }))}
            >
              <SelectTrigger className="w-40">
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          loading={loading}
          onRowClick={handleRowClick}
          emptyText="Нет статей. Попробуйте изменить фильтры или создать первую статью."
        />
      </Card>
    </div>
  );
}
