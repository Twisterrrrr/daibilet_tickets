import { ColumnDef } from '@tanstack/react-table';
import { Plus, Search, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ErrorState, LoadingState, PageHeader } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const VENUE_TYPE_LABELS: Record<string, string> = {
  MUSEUM: 'Музей',
  GALLERY: 'Галерея',
  ART_SPACE: 'Арт-пространство',
  EXHIBITION_HALL: 'Выставочный зал',
  THEATER: 'Театр',
  PALACE: 'Дворец',
  PARK: 'Парк',
};

interface VenueItem {
  id: string;
  slug: string;
  title: string;
  venueType: string;
  city: { name: string; slug: string };
  rating: number;
  isActive: boolean;
  isFeatured: boolean;
  eventsCount: number;
  offersCount: number;
  updatedAt: string;
}

const columns: ColumnDef<VenueItem>[] = [
  {
    accessorKey: 'title',
    header: 'Название',
    cell: ({ row }) => (
      <div>
        <span className="font-medium">{row.original.title}</span>
        <p className="text-xs text-muted-foreground">{row.original.city?.name ?? '—'}</p>
      </div>
    ),
  },
  {
    id: 'city',
    header: 'Город',
    cell: ({ row }) => <span className="text-sm">{row.original.city?.name ?? '—'}</span>,
  },
  {
    accessorKey: 'venueType',
    header: 'Тип',
    cell: ({ row }) => (
      <Badge variant="outline">{VENUE_TYPE_LABELS[row.original.venueType] || row.original.venueType}</Badge>
    ),
  },
  {
    accessorKey: 'eventsCount',
    header: 'Событий',
    cell: ({ row }) => <span className="font-medium">{row.original.eventsCount}</span>,
  },
  {
    accessorKey: 'rating',
    header: 'Рейтинг',
    cell: ({ row }) => (
      <span className="flex items-center justify-center gap-1">
        <Star className="h-3 w-3 text-warning fill-warning" />
        {Number(row.original.rating).toFixed(1)}
      </span>
    ),
  },
];

export function VenuesListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [onlyWithoutEvents, setOnlyWithoutEvents] = useState(false);

  const [cities, setCities] = useState<Array<{ slug: string; name: string }>>([]);
  const [citiesLoaded, setCitiesLoaded] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (city) params.set('city', city);
    const query = params.toString();
    const path = query ? `/admin/venues?${query}` : '/admin/venues';

    adminApi
      .get<{ items: VenueItem[] }>(path)
      .then((data) => setItems(data.items ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [search, city]);

  // Для фильтра по городу (админский список)
  useEffect(() => {
    let cancelled = false;
    adminApi
      .get<{ items: Array<{ slug: string; name: string }> }>(`/admin/cities?limit=1000`)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res.items) ? res.items : [];
        setCities(list.filter((c) => typeof c?.slug === 'string' && typeof c?.name === 'string').map((c) => ({ slug: c.slug, name: c.name })));
      })
      .catch(() => {
        // если endpoint недоступен — оставим пустой список, но UI не упадёт
      })
      .finally(() => {
        if (!cancelled) setCitiesLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleItems = onlyWithoutEvents ? items.filter((v) => v.eventsCount === 0) : items;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Площадки"
        subtitle={loading ? 'Загружаем список площадок...' : `${visibleItems.length} площадок`}
        actions={
          <Button
            onClick={() => navigate('/venues/new')}
            className="gap-1"
            aria-label="Добавить"
          >
            <Plus className="h-4 w-4" />
            Добавить
          </Button>
        }
      />

      {error && (
        <ErrorState
          title="Не удалось загрузить список площадок"
          description={error}
          action={
            <Button variant="outline" onClick={() => setSearch((s) => s)}>
              Повторить попытку
            </Button>
          }
        />
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Поиск..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={city || '__all__'} onValueChange={(v) => setCity(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-44">
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
                {cities.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => setOnlyWithoutEvents((v) => !v)}>
              Без событий
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        {loading ? (
          <div className="px-4 py-8">
            <LoadingState label="Загружаем площадки..." />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={visibleItems}
            onRowClick={(item) => navigate(`/venues/${item.id}`)}
            emptyText={onlyWithoutEvents ? 'Нет площадок без событий.' : 'Нет площадок. Измените фильтры или создайте новую.'}
          />
        )}
      </Card>
    </div>
  );
}
