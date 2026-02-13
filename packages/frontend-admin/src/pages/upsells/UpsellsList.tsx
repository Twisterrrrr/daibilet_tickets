import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { adminApi } from '@/api/client';
import { DataTable, SortableHeader } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Upsell {
  id: string;
  title: string;
  description?: string;
  priceKopecks: number;
  category: string;
  citySlug?: string;
  icon?: string;
  isActive: boolean;
  sortOrder: number;
}

const columns: ColumnDef<Upsell>[] = [
  {
    accessorKey: 'icon',
    header: 'Icon',
    cell: ({ row }) => <span className="text-lg">{row.original.icon || '—'}</span>,
  },
  {
    accessorKey: 'title',
    header: ({ column }) => <SortableHeader column={column}>Название</SortableHeader>,
    cell: ({ row }) => (
      <span className="font-medium">{row.original.title}</span>
    ),
  },
  {
    accessorKey: 'category',
    header: ({ column }) => <SortableHeader column={column}>Категория</SortableHeader>,
    cell: ({ row }) => (
      <Badge variant="secondary">{row.original.category}</Badge>
    ),
  },
  {
    accessorKey: 'citySlug',
    header: 'Город',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.citySlug || 'Все'}</span>
    ),
  },
  {
    accessorKey: 'priceKopecks',
    header: ({ column }) => <SortableHeader column={column}>Цена</SortableHeader>,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {(row.original.priceKopecks / 100).toLocaleString('ru-RU')} ₽
      </span>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Статус',
    cell: ({ row }) =>
      row.original.isActive ? (
        <Badge variant="success">Активен</Badge>
      ) : (
        <Badge variant="secondary">Выкл</Badge>
      ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <span onClick={(e) => e.stopPropagation()}>
        <Button variant="link" size="sm" asChild>
          <Link to={`/upsells/${row.original.id}`}>Ред.</Link>
        </Button>
      </span>
    ),
  },
];

export function UpsellsListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Upsell[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.get<Upsell[]>('/admin/upsells').then(setItems).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Upsells</h1>
          <p className="text-muted-foreground">
            {items.length} позиций
          </p>
        </div>
        <Button asChild>
          <Link to="/upsells/new" className="gap-2">
            <Plus className="h-4 w-4" />
            Добавить
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список upsells</CardTitle>
          <CardDescription>Дополнительные предложения для бронирования</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={items}
            loading={loading}
            emptyText="Нет upsells"
            pageSize={20}
            onRowClick={(row) => navigate(`/upsells/${row.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
