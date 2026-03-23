import { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@daibilet/shared-ui';

import { promoCollectionsApi, type PromoCollection } from '@/api/promo-collections';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/DataTable';

const columns: ColumnDef<PromoCollection>[] = [
  {
    accessorKey: 'title',
    header: 'Название',
    cell: ({ row }) => <div className="font-medium">{row.original.title}</div>,
  },
  {
    accessorKey: 'slug',
    header: 'Slug',
    cell: ({ row }) => <code className="text-xs text-muted-foreground">{row.original.slug}</code>,
  },
  {
    accessorKey: 'selectionMode',
    header: 'Режим',
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.selectionMode === 'MANUAL' ? 'Вручную' : 'Авто'}</Badge>
    ),
  },
  {
    accessorKey: 'contentType',
    header: 'Контент',
    cell: ({ row }) => (
      <Badge variant="secondary">{row.original.contentType === 'EVENTS' ? 'События' : 'Места'}</Badge>
    ),
  },
  {
    id: 'items',
    header: 'Элементов',
    cell: ({ row }) => (
      <span className="tabular-nums text-sm">{row.original._count?.items ?? 0}</span>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Статус',
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'success' : 'secondary'}>
        {row.original.isActive ? 'Активна' : 'Выкл'}
      </Badge>
    ),
  },
];

export function PromoCollectionsListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PromoCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    promoCollectionsApi
      .list()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promo-коллекции"
        subtitle="Подборки событий/мест для промо-блоков главной"
        actions={
          <Button onClick={() => navigate('/promo-collections/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Создать
          </Button>
        }
      />

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Коллекции</CardTitle>
          <CardDescription>Список всех promo-коллекций</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Загрузка...</div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">Нет коллекций. Создайте первую.</div>
          ) : (
            <DataTable
              columns={columns}
              data={items}
              onRowClick={(row) => navigate(`/promo-collections/${row.id}`)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
