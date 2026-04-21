import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { SearchInput } from '@/components/shared/filters/SearchInput';
import { DataTableShell } from '@/components/shared/table/DataTableShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { adminApi } from '@/api/client';
import { getAdminErrorDisplay } from '@/lib/get-admin-error-message';
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { fetchAdminLandingsList, type AdminLandingListRow } from '@/modules/landings/api/landings';

export function LandingsListPage() {
  const [searchParams] = useSearchParams();
  const siteBase =
    (import.meta as unknown as { env?: { VITE_PUBLIC_SITE_URL?: string } }).env?.VITE_PUBLIC_SITE_URL ?? '';

  const [searchInput, setSearchInput] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [city, setCity] = React.useState(() => searchParams.get('city') ?? '');
  const [status, setStatus] = React.useState('');
  const [landingType, setLandingType] = React.useState('');
  const [eventSourceType, setEventSourceType] = React.useState('');

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, city, status, landingType, eventSourceType]);

  const citiesQ = useQuery({
    queryKey: ['admin-cities-options-landings'],
    queryFn: async () => {
      const res = await adminApi.get<{ items: Array<{ id: string; name: string; slug: string }> }>('/admin/cities?limit=500');
      return res.items ?? [];
    },
  });

  const q = useQuery({
    queryKey: ['admin-landings', debouncedSearch, page, city, status, landingType, eventSourceType],
    queryFn: () =>
      fetchAdminLandingsList({
        search: debouncedSearch || undefined,
        city: city || undefined,
        status: (status || undefined) as any,
        landingType: (landingType || undefined) as any,
        eventSourceType: (eventSourceType || undefined) as any,
        page,
        limit: 50,
      }),
  });

  if (q.isLoading) return <LoadingState label="Загрузка лендингов…" />;
  if (q.isError) {
    const meta = getAdminErrorDisplay(q.error);
    return (
      <ErrorState
        title="Не удалось загрузить лендинги"
        description={meta.code ? `${meta.title} (${meta.code})` : meta.title}
        onRetry={() => q.refetch()}
      />
    );
  }

  const data = q.data;
  if (!data) return <LoadingState label="Загрузка…" />;
  const totalPages = Math.max(1, Math.ceil(data.total / 50));

  const statusLabel = (s: string) => (s === 'ACTIVE' ? 'Опубликовано' : s === 'ARCHIVED' ? 'Архив' : 'Черновик');
  const statusVariant = (s: string): 'default' | 'outline' | 'warning' =>
    s === 'ACTIVE' ? 'default' : s === 'ARCHIVED' ? 'outline' : 'warning';

  const typeLabel = (t: string) => (t === 'MULTI_CITY' ? 'MULTI_CITY' : 'CITY');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Лендинги"
        subtitle={`Контент + конверсия · всего: ${data.total}`}
        actions={
          <Button type="button" asChild>
            <Link to="/admin-v3/landings/new">Новый лендинг</Link>
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
              Тип
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
                value={landingType}
                onChange={(e) => setLandingType(e.target.value)}
              >
                <option value="">Все</option>
                <option value="CITY">CITY</option>
                <option value="MULTI_CITY">MULTI_CITY</option>
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
              Источник
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
                value={eventSourceType}
                onChange={(e) => setEventSourceType(e.target.value)}
              >
                <option value="">Все</option>
                <option value="PRIMARY_COLLECTION">PRIMARY_COLLECTION</option>
                <option value="AUTO_QUERY">AUTO_QUERY</option>
                <option value="MIXED">MIXED</option>
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
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Лендинг</th>
                <th className="px-3 py-2 text-left font-medium">Тип</th>
                <th className="px-3 py-2 text-left font-medium">Скоуп</th>
                <th className="px-3 py-2 text-left font-medium">Статус</th>
                <th className="px-3 py-2 text-left font-medium">Источник</th>
                <th className="px-3 py-2 text-left font-medium">Обновлён</th>
                <th className="px-3 py-2 text-right font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                    Нет лендингов по фильтру
                  </td>
                </tr>
              ) : (
                data.items.map((row: AdminLandingListRow) => {
                  const publicHref =
                    row.landingType === 'CITY' && row.city?.slug
                      ? `${siteBase}/cities/${row.city.slug}/${encodeURIComponent(row.slug)}`
                      : `${siteBase}/landings/${encodeURIComponent(row.slug)}`;
                  return (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="px-3 py-3 align-top">
                        <div className="font-medium">{row.title}</div>
                        <div className="mt-1 font-mono text-xs text-muted-foreground">{row.slug}</div>
                      </td>
                      <td className="px-3 py-3 align-top text-muted-foreground">{typeLabel(row.landingType)}</td>
                      <td className="px-3 py-3 align-top text-muted-foreground">
                        <div>{row.city?.name ?? '—'}</div>
                        <div className="text-xs">{row.parentLanding ? `parent: ${row.parentLanding.slug}` : ''}</div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge>
                        {!row.isIndexable ? (
                          <div className="mt-1 text-xs text-muted-foreground">noindex</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 align-top text-muted-foreground">{row.eventSourceType}</td>
                      <td className="px-3 py-3 align-top text-muted-foreground">
                        <div className="text-xs">{new Date(row.updatedAt).toLocaleString('ru-RU')}</div>
                      </td>
                      <td className="px-3 py-3 align-top text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" asChild>
                            <Link to={`/admin-v3/landings/${row.id}`}>Редактировать</Link>
                          </Button>
                          <Button type="button" variant="outline" size="sm" asChild>
                            <a href={publicHref} target="_blank" rel="noreferrer">
                              На сайте
                            </a>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </DataTableShell>
    </div>
  );
}

