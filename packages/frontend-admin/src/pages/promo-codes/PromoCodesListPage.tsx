import { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { promoCodesApi, type PromoCode } from '@/api/promo-codes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/DataTable';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const columns: ColumnDef<PromoCode>[] = [
  {
    accessorKey: 'code',
    header: 'Код',
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
  },
  {
    accessorKey: 'type',
    header: 'Тип',
    cell: ({ row }) => (row.original.type === 'PERCENT' ? '% скидка' : 'Фикс. сумма'),
  },
  {
    id: 'valueFormatted',
    header: 'Значение',
    cell: ({ row }) =>
      row.original.type === 'PERCENT'
        ? `${row.original.value}%`
        : `${(row.original.value / 100).toLocaleString('ru-RU')} ₽`,
  },
  {
    id: 'scope',
    header: 'Scope',
    cell: ({ row }) => {
      const r = row.original as PromoCode;
      if (r.eventId) return <span className="text-xs text-muted-foreground">Событие</span>;
      if (r.operatorId) return <span className="text-xs text-muted-foreground">Оператор</span>;
      return <span className="text-xs text-muted-foreground">Глобальный</span>;
    },
  },
  {
    id: 'period',
    header: 'Период',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {formatDate(row.original.validFrom)} — {formatDate(row.original.validTo)}
      </span>
    ),
  },
  {
    id: 'usage',
    header: 'Использования',
    cell: ({ row }) => {
      const r = row.original;
      return (
        <span className="tabular-nums text-xs text-muted-foreground">
          {r.usedCount}
          {r.maxUses ? ` / ${r.maxUses}` : ''}
        </span>
      );
    },
  },
  {
    accessorKey: 'isActive',
    header: 'Статус',
    cell: ({ row }) =>
      row.original.isActive ? (
        <Badge variant="default">Активен</Badge>
      ) : (
        <Badge variant="secondary">Выключен</Badge>
      ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <span onClick={(e) => e.stopPropagation()}>
        <Button variant="link" size="sm" asChild>
          <Link to={`/promo-codes/${row.original.id}`}>Ред.</Link>
        </Button>
      </span>
    ),
  },
];

export function PromoCodesListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    promoCodesApi
      .list()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Промокоды</h1>
          <p className="text-muted-foreground">{items.length} промокодов</p>
        </div>
        <Button asChild>
          <Link to="/promo-codes/new" className="gap-2">
            <Plus className="h-4 w-4" />
            Добавить
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Список промокодов</CardTitle>
          <CardDescription>Скидки по кодам</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={items}
            loading={loading}
            emptyText="Промокоды не созданы"
            pageSize={20}
            onRowClick={(row) => navigate(`/promo-codes/${row.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

