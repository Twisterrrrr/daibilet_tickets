import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { SearchInput } from '@/components/shared/filters/SearchInput';
import { DataTableShell } from '@/components/shared/table/DataTableShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { adminApi } from '@/api/client';
import {
  fetchAdminArticlesList,
  type AdminArticleListItem,
  type ArticleStatus,
} from '@/modules/articles/api/articles';
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { Link } from 'react-router-dom';

const LIMIT = 50;

type CityOpt = { id: string; name: string; slug: string };

function statusLabel(s: ArticleStatus): string {
  if (s === 'PUBLISHED') return 'Опубликовано';
  if (s === 'ARCHIVED') return 'Архив';
  return 'Черновик';
}

function statusVariant(s: ArticleStatus): 'default' | 'outline' | 'warning' {
  if (s === 'PUBLISHED') return 'default';
  if (s === 'ARCHIVED') return 'outline';
  return 'warning';
}

export function ArticlesListPage() {
  const siteBase = (import.meta as unknown as { env?: { VITE_PUBLIC_SITE_URL?: string } }).env?.VITE_PUBLIC_SITE_URL ?? '';

  const [searchInput, setSearchInput] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [cityId, setCityId] = React.useState('');
  const [status, setStatus] = React.useState<'' | ArticleStatus>('');
  const [sort, setSort] = React.useState<'updatedAt' | 'publishedAt' | 'title'>('updatedAt');
  const [order, setOrder] = React.useState<'asc' | 'desc'>('desc');

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, cityId, status, sort, order]);

  const citiesQ = useQuery({
    queryKey: ['admin-cities-options-articles'],
    queryFn: async () => {
      const res = await adminApi.get<{ items: CityOpt[] }>('/admin/cities?limit=500');
      return res.items ?? [];
    },
  });

  const q = useQuery({
    queryKey: ['admin-articles', debouncedSearch, page, cityId, status, sort, order],
    queryFn: () =>
      fetchAdminArticlesList({
        search: debouncedSearch || undefined,
        cityId: cityId || undefined,
        status: status || undefined,
        page,
        limit: LIMIT,
        sort,
        order,
      }),
  });

  if (q.isLoading) return <LoadingState label="Загрузка статей…" />;
  if (q.isError) {
    return (
      <ErrorState
        title="Не удалось загрузить статьи"
        description={q.error instanceof Error ? q.error.message : 'Ошибка'}
        onRetry={() => q.refetch()}
      />
    );
  }

  const data = q.data;
  if (!data) return <LoadingState label="Загрузка…" />;

  const totalPages = Math.max(1, Math.ceil(data.total / LIMIT));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Статьи"
        subtitle={`SEO и перелинковка · всего: ${data.total}`}
        actions={
          <Button type="button" asChild>
            <Link to="/admin-v3/articles/new">Новая статья</Link>
          </Button>
        }
      />

      <DataTableShell
        toolbar={
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <SearchInput
              placeholder="Поиск по названию или slug…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="max-w-md"
            />
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Город
              <select
                className="h-9 min-w-[200px] rounded-md border bg-background px-2 text-sm text-foreground"
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
              >
                <option value="">Все</option>
                {(citiesQ.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Статус
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
                value={status}
                onChange={(e) => setStatus(e.target.value as '' | ArticleStatus)}
              >
                <option value="">Активные (без архива)</option>
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="ARCHIVED">Архив</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Сортировка
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
                value={sort}
                onChange={(e) => {
                  const v = e.target.value as 'updatedAt' | 'publishedAt' | 'title';
                  setSort(v);
                  if (v === 'title') setOrder('asc');
                }}
              >
                <option value="updatedAt">updatedAt</option>
                <option value="publishedAt">publishedAt</option>
                <option value="title">title</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Порядок
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
                value={order}
                onChange={(e) => setOrder(e.target.value as 'asc' | 'desc')}
              >
                <option value="desc">desc</option>
                <option value="asc">asc</option>
              </select>
            </label>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Стр. {page} / {totalPages}
              </span>
              <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Назад
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Вперёд
              </Button>
            </div>
          </div>
        }
      >
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Статья</th>
                <th className="px-3 py-2 text-left font-medium">Мета</th>
                <th className="px-3 py-2 text-left font-medium">Статус</th>
                <th className="px-3 py-2 text-right font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row: AdminArticleListItem) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-3 py-3 align-top">
                    <div className="font-medium">{row.title}</div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">{row.slug}</div>
                  </td>
                  <td className="px-3 py-3 align-top text-muted-foreground">
                    <div>{row.city?.name ?? '—'}</div>
                    <div className="text-xs">{new Date(row.updatedAt).toLocaleString('ru-RU')}</div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge>
                  </td>
                  <td className="px-3 py-3 align-top text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <Link to={`/admin-v3/articles/${row.id}`}>Редактировать</Link>
                      </Button>
                      <Button type="button" variant="outline" size="sm" asChild>
                        <a href={`${siteBase}/articles/${encodeURIComponent(row.slug)}`} target="_blank" rel="noreferrer">
                          На сайте
                        </a>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataTableShell>
    </div>
  );
}
