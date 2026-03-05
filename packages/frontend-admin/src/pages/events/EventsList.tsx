import { ColumnDef } from '@tanstack/react-table';
import { Eye, EyeOff, MoreHorizontal, Plus, RefreshCw, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, SortableHeader } from '@/components/ui/DataTable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EventItem {
  id: string;
  title: string;
  category: string;
  source: string;
  rating: number | null;
  isActive: boolean;
  updatedAt: string;
  city?: { name: string };
  _count?: { sessions?: number };
  override?: { isHidden?: boolean } | null;
}

interface EventsResponse {
  items: EventItem[];
  total: number;
  page?: number;
  pages?: number;
  nextCursor?: string | null;
  hasMore?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  EXCURSION: 'Экскурсии',
  MUSEUM: 'Музеи',
  EVENT: 'Мероприятия',
};

const SOURCE_LABELS: Record<string, string> = {
  TC: 'TicketsCloud',
  TEPLOHOD: 'Теплоход',
  MANUAL: 'Ручной ввод',
};

// ─── Columns ─────────────────────────────────────────────────────────────────

const columns: ColumnDef<EventItem>[] = [
  {
    accessorKey: 'title',
    header: ({ column }) => <SortableHeader column={column}>Название</SortableHeader>,
    cell: ({ row }) => (
      <div className="max-w-[300px]">
        <p className="font-medium truncate">{row.original.title}</p>
        <p className="text-xs text-muted-foreground">{row.original.city?.name ?? '—'}</p>
      </div>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Категория',
    cell: ({ row }) => (
      <Badge variant="secondary">{CATEGORY_LABELS[row.original.category] || row.original.category}</Badge>
    ),
    filterFn: 'equals',
  },
  {
    accessorKey: 'source',
    header: 'Источник',
    cell: ({ row }) => <Badge variant="outline">{SOURCE_LABELS[row.original.source] || row.original.source}</Badge>,
  },
  {
    accessorKey: 'rating',
    header: ({ column }) => <SortableHeader column={column}>Рейтинг</SortableHeader>,
    cell: ({ row }) => {
      const r = row.original.rating;
      if (r != null && Number(r) > 0) {
        return (
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-sm font-medium">{Number(r).toFixed(1)}</span>
          </div>
        );
      }
      return <span className="text-xs text-muted-foreground">—</span>;
    },
  },
  {
    id: 'status',
    header: 'Статус',
    cell: ({ row }) => {
      const isHidden = row.original.override?.isHidden ?? false;
      if (isHidden) {
        return (
          <Badge variant="destructive">
            <EyeOff className="mr-1 h-3 w-3" />
            Скрыт
          </Badge>
        );
      }
      return row.original.isActive ? (
        <Badge variant="success">
          <Eye className="mr-1 h-3 w-3" />
          Активен
        </Badge>
      ) : (
        <Badge variant="secondary">Неактивен</Badge>
      );
    },
  },
  {
    id: 'sessions',
    header: 'Сеансы',
    cell: ({ row }) => <span className="text-sm tabular-nums">{row.original._count?.sessions ?? 0}</span>,
  },
  {
    accessorKey: 'updatedAt',
    header: ({ column }) => <SortableHeader column={column}>Обновлено</SortableHeader>,
    cell: ({ row }) =>
      row.original.updatedAt
        ? (() => {
            const d = new Date(row.original.updatedAt);
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            return `${dd}/${mm}/${yyyy}`;
          })()
        : '—',
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export function EventsListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<EventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [cities, setCities] = useState<Array<{ slug: string; name: string }>>([]);
  const [citiesLoaded, setCitiesLoaded] = useState(false);

  const [filters, setFilters] = useState({
    city: '',
    category: '',
    source: '',
    active: '',
    hidden: '',
    search: '',
    page: 1,
    limit: 50,
  });

  const fetchEvents = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filters.city) params.set('city', filters.city);
    if (filters.category) params.set('category', filters.category);
    if (filters.source) params.set('source', filters.source);
    if (filters.active) params.set('active', filters.active);
    if (filters.hidden) params.set('hidden', filters.hidden);
    if (filters.search) params.set('search', filters.search);
    params.set('page', String(filters.page));
    params.set('limit', String(filters.limit));

    adminApi
      .get<EventsResponse>(`/admin/events?${params.toString()}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEvents();
  }, [filters]);

  // Загрузить все города для фильтра (админский список, не витрина)
  useEffect(() => {
    let cancelled = false;
    adminApi
      .get<{ items: Array<{ slug: string; name: string }>; total: number }>('/admin/cities?limit=1000')
      .then((res) => {
        if (cancelled) return;
        const items = Array.isArray(res.items) ? res.items : [];
        setCities(
          items
            .filter((c) => typeof c.slug === 'string' && typeof c.name === 'string')
            .map((c) => ({ slug: c.slug, name: c.name })),
        );
      })
      .catch(() => {
        // fallback: оставим хардкоды, если админский endpoint недоступен
      })
      .finally(() => {
        if (!cancelled) setCitiesLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await adminApi.post('/admin/sync');
      // Refetch after sync
      fetchEvents();
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">События</h1>
          <div className="text-muted-foreground">
            {data ? `${data.total} событий в базе` : <Skeleton className="h-4 w-32 inline-block" />}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link to="/events/new">
              <Plus className="mr-2 h-4 w-4" />
              Создать событие
            </Link>
          </Button>
          <Button onClick={handleSync} disabled={syncing} variant="outline" className="gap-2">
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            Синхронизация
          </Button>
        </div>
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
              placeholder="Поиск по названию..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
              className="max-w-[250px]"
            />
            <Select
              value={filters.city || '__all__'}
              onValueChange={(v) => setFilters((f) => ({ ...f, city: v === '__all__' ? '' : v, page: 1 }))}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Все города" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Все города</SelectItem>
                {citiesLoaded && cities.length === 0 && (
                  <>
                    <SelectItem value="moscow">Москва</SelectItem>
                    <SelectItem value="saint-petersburg">Санкт-Петербург</SelectItem>
                    <SelectItem value="kazan">Казань</SelectItem>
                    <SelectItem value="kaliningrad">Калининград</SelectItem>
                    <SelectItem value="vladimir">Владимир</SelectItem>
                    <SelectItem value="yaroslavl">Ярославль</SelectItem>
                  </>
                )}
                {cities.map((city) => (
                  <SelectItem key={city.slug} value={city.slug}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.category || '__all__'}
              onValueChange={(v) => setFilters((f) => ({ ...f, category: v === '__all__' ? '' : v, page: 1 }))}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Все категории" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Все категории</SelectItem>
                <SelectItem value="EXCURSION">Экскурсии</SelectItem>
                <SelectItem value="MUSEUM">Музеи</SelectItem>
                <SelectItem value="EVENT">Мероприятия</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.source || '__all__'}
              onValueChange={(v) => setFilters((f) => ({ ...f, source: v === '__all__' ? '' : v, page: 1 }))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Источник" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Все источники</SelectItem>
                <SelectItem value="TC">TicketsCloud</SelectItem>
                <SelectItem value="TEPLOHOD">Теплоход</SelectItem>
                <SelectItem value="MANUAL">Ручной ввод</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.active || '__all__'}
              onValueChange={(v) => setFilters((f) => ({ ...f, active: v === '__all__' ? '' : v, page: 1 }))}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Все</SelectItem>
                <SelectItem value="true">Активные</SelectItem>
                <SelectItem value="false">Неактивные</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={loading}
        emptyText="Нет событий, соответствующих фильтрам"
        onRowClick={(item) => navigate(`/events/${item.id}`)}
      />

      {/* Server pagination */}
      {data && (data.pages ?? Math.ceil(data.total / filters.limit)) > 1 && (
        <div className="flex items-center justify-between">
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
              {filters.page} / {data.pages ?? Math.ceil(data.total / filters.limit)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              disabled={filters.page >= (data.pages ?? Math.ceil(data.total / filters.limit))}
            >
              Вперёд
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
