import { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { PageHeader } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { StatusBadge, TagChip } from '@daibilet/shared-ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, SortableHeader } from '@/components/ui/DataTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LandingItem {
  id: string;
  title: string;
  slug: string;
  filterTag: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  templateType: 'GENERIC_CARDS' | 'COMPARISON_TABLE' | 'HYBRID' | 'SEASONAL_EVENT';
  showInCollections: boolean;
  isIndexable: boolean;
  eventCountCached?: number | null;
  isActive: boolean;
  sortOrder: number;
  city?: { name: string; slug: string };
}

interface CityItem {
  id: string;
  name: string;
  slug: string;
}

// ─── Columns ─────────────────────────────────────────────────────────────────

const getColumns = (): ColumnDef<LandingItem>[] => [
  {
    accessorKey: 'title',
    header: ({ column }) => <SortableHeader column={column}>Название</SortableHeader>,
    cell: ({ row }) => <div className="font-medium">{row.original.title}</div>,
  },
  {
    id: 'city',
    accessorFn: (row) => row.city?.name ?? '',
    header: 'Город',
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.city?.name ?? '—'}</span>,
  },
  {
    accessorKey: 'templateType',
    header: 'Шаблон',
    cell: ({ row }) => <TagChip label={row.original.templateType} />,
  },
  {
    accessorKey: 'status',
    header: 'Статус',
    cell: ({ row }) => <StatusBadge tone={row.original.status === 'ACTIVE' ? 'success' : 'neutral'} label={row.original.status} />,
  },
  {
    accessorKey: 'showInCollections',
    header: 'showInCollections',
    cell: ({ row }) => <TagChip label={row.original.showInCollections ? 'ON' : 'OFF'} />,
  },
  {
    accessorKey: 'isIndexable',
    header: 'indexable',
    cell: ({ row }) => <TagChip label={row.original.isIndexable ? 'YES' : 'NO'} />,
  },
  {
    accessorKey: 'sortOrder',
    header: ({ column }) => <SortableHeader column={column}>Порядок</SortableHeader>,
    cell: ({ row }) => <span className="tabular-nums text-sm">{row.original.sortOrder}</span>,
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export function LandingsListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<LandingItem[]>([]);
  const [cities, setCities] = useState<CityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (cityFilter) params.set('city', cityFilter);

    adminApi
      .get<LandingItem[] | { items: LandingItem[] }>(`/admin/landings${params.toString() ? `?${params}` : ''}`)
      .then((res) => setData(Array.isArray(res) ? res : (res?.items ?? [])))
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [cityFilter]);

  useEffect(() => {
    adminApi
      .get<CityItem[] | { items: CityItem[] }>('/admin/cities')
      .then((res) => {
        const list = Array.isArray(res) ? res : ((res as { items: CityItem[] }).items ?? []);
        setCities(list);
      })
      .catch((e) => console.error('Load cities failed:', e));
  }, []);

  const handleRowClick = (item: LandingItem) => {
    navigate(`/landings/${item.id}`);
  };

  const columns = getColumns();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Лендинги"
        subtitle="Управление лендинг-страницами по городам и тегам"
        actions={
          <Button asChild>
            <Link to="/landings/new" className="gap-2">
              <Plus className="h-4 w-4" />
              Создать
            </Link>
          </Button>
        }
      />

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список лендингов</CardTitle>
          <CardDescription>Выберите город для фильтрации или оставьте «Все города»</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={cityFilter || '__all__'} onValueChange={(v) => setCityFilter(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Все города" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Все города</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.slug}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={columns}
            data={data}
            onRowClick={handleRowClick}
            loading={loading}
            emptyText="Нет лендингов"
          />
        </CardContent>
      </Card>
    </div>
  );
}
