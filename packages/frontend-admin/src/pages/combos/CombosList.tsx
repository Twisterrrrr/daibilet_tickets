import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { adminApi } from '@/api/client';
import { DataTable, SortableHeader } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Types ───────────────────────────────────────────────────────────────────

type Intensity = 'RELAXED' | 'NORMAL' | 'ACTIVE';

interface ComboItem {
  id: string;
  title: string;
  slug: string;
  intensity: Intensity;
  dayCount: number;
  isActive: boolean;
  sortOrder: number;
  city?: { name: string; slug: string };
}

interface CityItem {
  id: string;
  name: string;
  slug: string;
}

const INTENSITY_LABELS: Record<Intensity, string> = {
  RELAXED: 'Спокойный',
  NORMAL: 'Обычный',
  ACTIVE: 'Активный',
};

// ─── Columns ─────────────────────────────────────────────────────────────────

const getColumns = (): ColumnDef<ComboItem>[] => [
  {
    accessorKey: 'title',
    header: ({ column }) => <SortableHeader column={column}>Название</SortableHeader>,
    cell: ({ row }) => (
      <div className="font-medium">{row.original.title}</div>
    ),
  },
  {
    id: 'city',
    accessorFn: (row) => row.city?.name ?? '',
    header: 'Город',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.city?.name ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'intensity',
    header: 'Интенсивность',
    cell: ({ row }) => (
      <Badge variant="outline">
        {INTENSITY_LABELS[row.original.intensity] ?? row.original.intensity}
      </Badge>
    ),
  },
  {
    accessorKey: 'dayCount',
    header: 'Дней',
    cell: ({ row }) => (
      <span className="tabular-nums text-sm">{row.original.dayCount}</span>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Активен',
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'success' : 'secondary'}>
        {row.original.isActive ? 'Да' : 'Нет'}
      </Badge>
    ),
  },
  {
    accessorKey: 'sortOrder',
    header: ({ column }) => <SortableHeader column={column}>Порядок</SortableHeader>,
    cell: ({ row }) => (
      <span className="tabular-nums text-sm">{row.original.sortOrder}</span>
    ),
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export function CombosListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<ComboItem[]>([]);
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
      .get<ComboItem[]>(`/admin/combos${params.toString() ? `?${params}` : ''}`)
      .then((res) => setData(Array.isArray(res) ? res : []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [cityFilter]);

  useEffect(() => {
    adminApi
      .get<CityItem[] | { items: CityItem[] }>('/admin/cities')
      .then((res) => {
        const list = Array.isArray(res) ? res : (res as { items: CityItem[] }).items ?? [];
        setCities(list);
      })
      .catch(() => {});
  }, []);

  const handleRowClick = (item: ComboItem) => {
    navigate(`/combos/${item.id}`);
  };

  const columns = getColumns();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Combo</h1>
          <p className="text-muted-foreground">
            Управление combo-страницами (маршруты, путешествия)
          </p>
        </div>
        <Button asChild>
          <Link to="/combos/new" className="gap-2">
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

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список combo</CardTitle>
          <CardDescription>
            Выберите город для фильтрации или оставьте «Все города»
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={cityFilter || '__all__'}
              onValueChange={(v) => setCityFilter(v === '__all__' ? '' : v)}
            >
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
            emptyText="Нет combo"
          />
        </CardContent>
      </Card>
    </div>
  );
}
