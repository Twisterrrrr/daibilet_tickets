import { ColumnDef } from '@tanstack/react-table';
import { Check, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ErrorState, PageHeader } from '@daibilet/shared-ui';

import { StatusBadge, TagChip } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { DataTable, SortableHeader } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CollectionItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  city: { name: string; slug: string } | null;
  isActive: boolean;
  sourceType: 'MANUAL' | 'SUGGESTED' | 'HYBRID' | 'ACTIVE';
  status: 'DRAFT' | 'SUGGESTED' | 'ACTIVE' | 'REJECTED' | 'ARCHIVED';
  selectionBasis: 'MANUAL' | 'POPULAR' | 'STRUCTURAL' | 'COMBINATION';
  eventCountCached?: number | null;
  sortOrder: number;
  filterCategory: string | null;
  filterTags: string[];
  pinnedCount: number;
  excludedCount: number;
  updatedAt: string;
}

const statusTone: Record<string, 'success' | 'warning' | 'neutral' | 'danger'> = {
  ACTIVE: 'success',
  SUGGESTED: 'warning',
  DRAFT: 'neutral',
  REJECTED: 'danger',
  ARCHIVED: 'neutral',
};

const baseColumns: ColumnDef<CollectionItem>[] = [
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
    cell: ({ row }) => <span>{row.original.city?.name || <TagChip label="Кросс-город" />}</span>,
  },
  {
    id: 'filters',
    header: 'Фильтры',
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.filterCategory && (
          <TagChip label={row.original.filterCategory} />
        )}
        {row.original.filterTags.map((t) => (
          <TagChip key={t} label={t} />
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
    cell: ({ row }) => <StatusBadge tone={statusTone[row.original.status] ?? 'neutral'} label={row.original.status} />,
  },
  {
    accessorKey: 'sourceType',
    header: 'Источник',
    cell: ({ row }) => <TagChip label={row.original.sourceType} />,
  },
  {
    accessorKey: 'selectionBasis',
    header: 'Basis',
    cell: ({ row }) => <TagChip label={row.original.selectionBasis} />,
  },
  {
    accessorKey: 'eventCountCached',
    header: 'Events',
    cell: ({ row }) => <span className="tabular-nums text-sm">{row.original.eventCountCached ?? '—'}</span>,
  },
];

export function CollectionsListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [city, setCity] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (sourceType) params.set('sourceType', sourceType);
    if (city) params.set('city', city);
    return params.toString();
  }, [search, status, sourceType, city]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const path = query ? `/admin/collections?${query}` : '/admin/collections';

    adminApi
      .get<{ items: CollectionItem[] }>(path)
      .then((data) => setItems(data.items ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [query]);

  const onApprove = useCallback(async (id: string) => {
    await adminApi.post(`/admin/collections/${id}/approve`);
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'ACTIVE', sourceType: 'ACTIVE' } : item)));
  }, []);

  const onReject = useCallback(async (id: string) => {
    await adminApi.post(`/admin/collections/${id}/reject`);
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'REJECTED' } : item)));
  }, []);

  const onGenerate = async () => {
    setLoading(true);
    await adminApi.post('/admin/collections/suggestions/generate');
    const data = await adminApi.get<{ items: CollectionItem[] }>(query ? `/admin/collections?${query}` : '/admin/collections');
    setItems(data.items ?? []);
    setLoading(false);
  };

  const columns = useMemo<ColumnDef<CollectionItem>[]>(() => {
    return [
      ...baseColumns,
      {
        accessorKey: 'sortOrder',
        header: ({ column }) => <SortableHeader column={column}>Порядок</SortableHeader>,
        cell: ({ row }) => <span className="tabular-nums">{row.original.sortOrder}</span>,
      },
      {
        id: 'actions',
        header: 'Действия',
        cell: ({ row }) =>
          row.original.status === 'SUGGESTED' ? (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  void onApprove(row.original.id);
                }}
              >
                <Check className="mr-1 h-3 w-3" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  void onReject(row.original.id);
                }}
              >
                <X className="mr-1 h-3 w-3" />
                Reject
              </Button>
            </div>
          ) : null,
      },
    ];
  }, [onApprove, onReject]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Подборки"
        subtitle="Тематические посадочные страницы с курированным контентом"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onGenerate}>Сгенерировать suggestions</Button>
            <Button onClick={() => navigate('/collections/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Создать подборку
            </Button>
          </div>
        }
      />

      {error && (
        <ErrorState title="Не удалось загрузить подборки" description={error} />
      )}

      <DataTable
        columns={columns}
        data={items}
        onRowClick={(item) => navigate(`/collections/${item.id}`)}
        loading={loading}
        emptyText="Нет подборок. Создайте первую!"
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
          <Input
            type="text"
            placeholder="Поиск по названию или slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
            <Select value={status || '__all__'} onValueChange={(v) => setStatus(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Статус" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Все статусы</SelectItem>
                {['SUGGESTED', 'ACTIVE', 'DRAFT', 'REJECTED', 'ARCHIVED'].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sourceType || '__all__'} onValueChange={(v) => setSourceType(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Источник" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Все источники</SelectItem>
                {['SUGGESTED', 'MANUAL', 'ACTIVE', 'HYBRID'].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              placeholder="city slug (spb)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-[180px]"
            />
          </div>
        }
      />
    </div>
  );
}
