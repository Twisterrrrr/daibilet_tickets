import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@/api/client';
import { DataTable, SortableHeader } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
    header: ({ column }) => <SortableHeader column={column}>Название</SortableHeader>,
    cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
  },
  {
    accessorKey: 'venueType',
    header: 'Тип',
    cell: ({ row }) => (
      <Badge variant="outline">{VENUE_TYPE_LABELS[row.original.venueType] || row.original.venueType}</Badge>
    ),
  },
  {
    id: 'city',
    header: 'Город',
    cell: ({ row }) => <span>{row.original.city?.name}</span>,
  },
  {
    accessorKey: 'rating',
    header: ({ column }) => <SortableHeader column={column}>Рейтинг</SortableHeader>,
    cell: ({ row }) => <span className="tabular-nums">{row.original.rating.toFixed(1)}</span>,
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
    id: 'eventsCount',
    header: 'Выставок',
    cell: ({ row }) => <span className="tabular-nums">{row.original.eventsCount}</span>,
  },
  {
    id: 'offersCount',
    header: 'Офферов',
    cell: ({ row }) => <span className="tabular-nums">{row.original.offersCount}</span>,
  },
];

export function VenuesListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const query = params.toString();
    const path = query ? `/admin/venues?${query}` : '/admin/venues';

    adminApi
      .get<{ items: VenueItem[] }>(path)
      .then((data) => setItems(data.items ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Места</h1>
          <p className="text-muted-foreground">Музеи, галереи, арт-пространства и выставочные залы</p>
        </div>
        <Button onClick={() => navigate('/venues/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить место
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            placeholder="Поиск по названию или адресу..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Список мест</CardTitle>
          <CardDescription>{items.length} мест</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={items}
            onRowClick={(item) => navigate(`/venues/${item.id}`)}
            loading={loading}
            emptyText="Нет мест. Добавьте первое!"
          />
        </CardContent>
      </Card>
    </div>
  );
}
