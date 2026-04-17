import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { FilterBar, FilterField } from '@/components/shared/filters/FilterBar';
import { SearchInput } from '@/components/shared/filters/SearchInput';
import { DataTableShell } from '@/components/shared/table/DataTableShell';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useListPageState } from '@/hooks/useListPageState';
import { fetchAdminTagsList, type AdminTagListItem } from '@/modules/tags/api/tags';
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { Link } from 'react-router-dom';

export function TagsListPage() {
  const list = useListPageState();
  const [category, setCategory] = React.useState<string>('');

  const q = useQuery({
    queryKey: ['admin-tags-list', { q: list.debouncedQ, page: list.page, pageSize: list.pageSize, category }],
    queryFn: () =>
      fetchAdminTagsList({
        page: list.page,
        limit: list.pageSize,
        search: list.debouncedQ || undefined,
        category: category || undefined,
      }),
    placeholderData: (p) => p,
  });

  const items = q.data?.items ?? [];
  const total = q.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / list.pageSize));

  if (q.isLoading && !q.data) return <LoadingState label="Загрузка тегов…" />;
  if (q.isError) {
    return (
      <ErrorState
        title="Не удалось загрузить теги"
        description={q.error instanceof Error ? q.error.message : 'Ошибка'}
        onRetry={() => q.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Теги" subtitle="Taxonomy / SEO routing: теги, группы, связи с событиями и статьями" />

      <FilterBar>
        <FilterField label="Поиск">
          <SearchInput value={list.q} onChange={(e) => list.setQ(e.target.value)} placeholder="Название, slug…" />
        </FilterField>
        <FilterField label="Категория">
          <InputSelect value={category} onChange={(v) => { setCategory(v); list.setPage(1); }} />
        </FilterField>
      </FilterBar>

      <DataTableShell>
        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Всего: {total} · стр. {list.page} / {totalPages}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={list.page <= 1} onClick={() => list.setPage(list.page - 1)}>
              Назад
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={list.page >= totalPages} onClick={() => list.setPage(list.page + 1)}>
              Вперёд
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto p-2">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs font-medium uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-3">Тег</th>
                <th className="px-3 py-3">Классификация</th>
                <th className="px-3 py-3">Связи</th>
                <th className="w-44 px-3 py-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                    Нет тегов по фильтру
                  </td>
                </tr>
              ) : (
                items.map((row) => <TagRow key={row.id} row={row} />)
              )}
            </tbody>
          </table>
        </div>
      </DataTableShell>
    </div>
  );
}

function TagRow({ row }: { row: AdminTagListItem }) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="align-top px-3 py-3">
        <div className="font-medium leading-snug">
          <Link className="text-primary hover:underline" to={`/admin-v3/tags/${row.id}`}>
            {row.name}
          </Link>
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{row.slug}</div>
      </td>
      <td className="align-top px-3 py-3 text-xs">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{row.category}</Badge>
          {row.tagKind ? <Badge variant="outline">{row.tagKind}</Badge> : null}
          {row.structuralGroup ? <Badge variant="outline">{row.structuralGroup}</Badge> : null}
          <Badge variant={row.isActive ? 'outline' : 'danger'}>{row.isActive ? 'active' : 'off'}</Badge>
        </div>
      </td>
      <td className="align-top px-3 py-3 text-xs text-muted-foreground">
        Events: {row._count?.events ?? '—'} · Articles: {row._count?.articleTags ?? '—'}
      </td>
      <td className="align-top px-3 py-3">
        <div className="flex flex-col gap-1">
          <Button type="button" size="sm" variant="secondary" asChild>
            <Link to={`/admin-v3/tags/${row.id}`}>Карточка</Link>
          </Button>
        </div>
      </td>
    </tr>
  );
}

function InputSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      className="h-9 w-full min-w-[180px] rounded-md border border-input bg-background px-2 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Все</option>
      <option value="CITY">CITY</option>
      <option value="TOPIC">TOPIC</option>
      <option value="SUBTOPIC">SUBTOPIC</option>
      <option value="FORMAT">FORMAT</option>
      <option value="VENUE">VENUE</option>
      <option value="EVENT">EVENT</option>
      <option value="GENERIC">GENERIC</option>
    </select>
  );
}

