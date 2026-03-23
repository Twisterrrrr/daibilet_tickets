import { Plus, Search, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { EmptyState, ErrorState } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Площадки</h1>
        <Button
          onClick={() => navigate('/venues/new')}
          className="gap-1"
          aria-label="Добавить"
        >
          <Plus className="h-4 w-4" />
          Добавить
        </Button>
      </div>

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
        {visibleItems.length === 0 && !loading ? (
          <div className="px-4 py-8">
            <EmptyState title={onlyWithoutEvents ? 'Нет площадок без событий' : 'Нет площадок'} description="Измените фильтры или создайте новую площадку." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Город</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead className="text-center">Событий</TableHead>
                <TableHead className="text-center">Рейтинг</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleItems.map((v) => (
                <TableRow
                  key={v.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/venues/${v.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{v.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{v.city?.name ?? '—'}</p>
                  </TableCell>
                  <TableCell className="text-sm">{v.city?.name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {VENUE_TYPE_LABELS[v.venueType] || v.venueType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium">{v.eventsCount}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="flex items-center justify-center gap-1">
                      <Star className="h-3 w-3 text-warning fill-warning" />
                      {Number(v.rating).toFixed(1)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
