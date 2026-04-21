import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { SearchInput } from '@/components/shared/filters/SearchInput';
import { DataTableShell } from '@/components/shared/table/DataTableShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { adminApi } from '@/api/client';
import {
  fetchAdminCollectionsList,
  type AdminCollectionListRow,
} from '@/modules/collections/api/collections';
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { Link } from 'react-router-dom';

export function CollectionsListPage() {
  const siteBase =
    (import.meta as unknown as { env?: { VITE_PUBLIC_SITE_URL?: string } }).env?.VITE_PUBLIC_SITE_URL ?? '';

  const [searchInput, setSearchInput] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [city, setCity] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [sourceType, setSourceType] = React.useState('');

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, city, status, sourceType]);

  const citiesQ = useQuery({
    queryKey: ['admin-cities-options-collections'],
    queryFn: async () => {
      const res = await adminApi.get<{ items: Array<{ id: string; name: string; slug: string }> }>('/admin/cities?limit=500');
      return res.items ?? [];
    },
  });

  const q = useQuery({
    queryKey: ['admin-collections', debouncedSearch, page, city, status, sourceType],
    queryFn: () =>
      fetchAdminCollectionsList({
        search: debouncedSearch || undefined,
        city: city || undefined,
        status: status || undefined,
        sourceType: sourceType || undefined,
        page,
        limit: 50,
      }),
  });

  if (q.isLoading) return <LoadingState label="Загрузка подборок…" />;
  if (q.isError) {
    return (
      <ErrorState
        title="Не удалось загрузить подборки"
        description={q.error instanceof Error ? q.error.message : 'Ошибка'}
        onRetry={() => q.refetch()}
      />
    );
  }

  const data = q.data;
  if (!data) return <LoadingState label="Загрузка…" />;
  const totalPages = Math.max(1, Math.ceil(data.total / 50));

  const statusLabel = (s: string) => {
    if (s === 'ACTIVE') return 'Опубликовано';
    if (s === 'ARCHIVED') return 'Архив';
    if (s === 'REJECTED') return 'REJECTED';
    if (s === 'SUGGESTED') return 'SUGGESTED';
    return 'Черновик';
  };
  const statusVariant = (s: string): 'default' | 'outline' | 'warning' => {
    if (s === 'ACTIVE') return 'default';
    if (s === 'ARCHIVED') return 'outline';
    return 'warning';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Подборки"
        subtitle={`Мерчандайзинг каталога · всего: ${data.total}`}
        actions={
          <Button type="button" asChild>
            <Link to="/admin-v3/collections/new">Новая подборка</Link>
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
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="">Все</option>
                {(citiesQ.data ?? []).map((c) => (
                  <option key={c.slug} value={c.slug}>
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
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Все</option>
                <option value="DRAFT">DRAFT</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="ARCHIVED">Архив</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Тип
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
              >
                <option value="">Все</option>
                <option value="MANUAL">MANUAL</option>
                <option value="AUTO">AUTO</option>
                <option value="HYBRID">HYBRID</option>
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
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Подборка</th>
                <th className="px-3 py-2 text-left font-medium">Скоуп</th>
                <th className="px-3 py-2 text-left font-medium">Статус</th>
                <th className="px-3 py-2 text-left font-medium">Статы</th>
                <th className="px-3 py-2 text-right font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">
                    Нет подборок по фильтру
                  </td>
                </tr>
              ) : (
                data.items.map((row: AdminCollectionListRow) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-3 py-3 align-top">
                      <div className="font-medium">{row.title}</div>
                      <div className="mt-1 font-mono text-xs text-muted-foreground">{row.slug}</div>
                    </td>
                    <td className="px-3 py-3 align-top text-muted-foreground">
                      <div>{row.city?.name ?? '—'}</div>
                      <div className="text-xs">{row.sourceType}</div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge>
                    </td>
                    <td className="px-3 py-3 align-top text-muted-foreground">
                      <div>{row.itemsCount ?? 0} items</div>
                      <div className="text-xs">{new Date(row.updatedAt).toLocaleString('ru-RU')}</div>
                    </td>
                    <td className="px-3 py-3 align-top text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <Link to={`/admin-v3/collections/${row.id}`}>Редактировать</Link>
                        </Button>
                        <Button type="button" variant="outline" size="sm" asChild>
                          <a href={`${siteBase}/collections/${encodeURIComponent(row.slug)}`} target="_blank" rel="noreferrer">
                            На сайте
                          </a>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataTableShell>
    </div>
  );
}

