import { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { PageHeader } from '@daibilet/shared-ui';

import { promoBlocksApi, type PromoBlock } from '@/api/promo-blocks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/DataTable';

function formatDate(s: string | null | undefined) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const columns: ColumnDef<PromoBlock>[] = [
  { accessorKey: 'slug', header: 'Slug', cell: ({ row }) => <span className="font-mono text-sm">{row.original.slug}</span> },
  { id: 'targetCitySlugs', header: 'Города', cell: ({ row }) => {
    const slugs = (row.original as { targetCitySlugs?: string[] }).targetCitySlugs;
    return <span className="text-xs text-muted-foreground">{!slugs?.length ? 'Глобальный' : slugs.join(', ')}</span>;
  }},
  { accessorKey: 'title', header: 'Название', cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
  { accessorKey: 'href', header: 'Ссылка', cell: ({ row }) => <span className="text-muted-foreground truncate max-w-[120px] block" title={row.original.href ?? undefined}>{row.original.href ?? '—'}</span> },
  { id: 'period', header: 'Период', cell: ({ row }) => <span className="text-muted-foreground text-sm">{formatDate(row.original.startsAt)} — {formatDate(row.original.endsAt)}</span> },
  { accessorKey: 'sortOrder', header: 'Порядок', cell: ({ row }) => <span className="tabular-nums">{row.original.sortOrder}</span> },
  { accessorKey: 'isActive', header: 'Статус', cell: ({ row }) => row.original.isActive ? <Badge variant="default">Активен</Badge> : <Badge variant="secondary">Выкл</Badge> },
  { id: 'actions', header: '', cell: ({ row }) => (
  <span onClick={(e) => e.stopPropagation()}><Button variant="link" size="sm" asChild><Link to={`/promo-blocks/${row.original.id}`}>Ред.</Link></Button></span>
) },
];

export function PromoBlocksListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PromoBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    promoBlocksApi.list().then(setItems).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Промо-блоки"
        subtitle={`${items.length} блоков`}
        actions={<Button asChild><Link to="/promo-blocks/new" className="gap-2"><Plus className="h-4 w-4" />Добавить</Link></Button>}
      />
      <Card>
        <CardHeader>
          <CardTitle>Список промо-блоков</CardTitle>
          <CardDescription>Карточки на главной</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={items} loading={loading} emptyText="Нет промо-блоков" pageSize={20} onRowClick={(row) => navigate(`/promo-blocks/${row.id}`)} />
        </CardContent>
      </Card>
    </div>
  );
}
