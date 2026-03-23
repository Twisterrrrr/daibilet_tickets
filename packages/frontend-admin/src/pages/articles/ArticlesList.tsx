import { ExternalLink, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Статьи</h1>
        <Button asChild>
          <Link to="/articles/new" className="gap-1">
            <Plus className="h-4 w-4" />
            Новая статья
          </Link>
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Заголовок</TableHead>
              <TableHead>Город</TableHead>
              <TableHead>Теги</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Обновлено</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading && (data?.items.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Нет статей
                </TableCell>
              </TableRow>
            ) : (
              (data?.items ?? []).map((item) => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => handleRowClick(item)}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell className="text-sm">{item.city?.name ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-[10px]">
                        тегов: {item._count?.articleTags ?? 0}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.isPublished ? 'default' : 'secondary'}>
                      {item.isPublished ? 'Опубликовано' : 'Черновик'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.updatedAt
                      ? new Date(item.updatedAt).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {item.isPublished ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
