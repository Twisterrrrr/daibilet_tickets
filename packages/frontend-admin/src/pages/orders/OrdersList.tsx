import { ColumnDef } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, SortableHeader } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ───────────────────────────────────────────────────────────────────

type OrderStatus =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'FULFILLING'
  | 'FULFILLED'
  | 'PARTIALLY_FULFILLED'
  | 'FAILED'
  | 'REFUNDED';

interface OrderItem {
  id: string;
  code: string;
  customerName: string;
  email: string;
  totalPrice: number;
  status: OrderStatus;
  createdAt: string;
  city?: { slug: string; name: string };
}

interface OrdersResponse {
  items: OrderItem[];
  total: number;
  page: number;
  pages: number;
}

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  DRAFT: 'secondary',
  PENDING_PAYMENT: 'warning',
  PAID: 'success',
  FULFILLING: 'success',
  FULFILLED: 'success',
  PARTIALLY_FULFILLED: 'warning',
  FAILED: 'destructive',
  REFUNDED: 'destructive',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  PENDING_PAYMENT: 'Ожидает',
  PAID: 'Оплачен',
  FULFILLING: 'В обработке',
  FULFILLED: 'Выполнен',
  PARTIALLY_FULFILLED: 'Частично',
  FAILED: 'Ошибка',
  REFUNDED: 'Возврат',
};

function formatPrice(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(
    kopecks / 100,
  );
}

// ─── Columns ─────────────────────────────────────────────────────────────────

const columns: ColumnDef<OrderItem>[] = [
  {
    accessorKey: 'code',
    header: ({ column }) => <SortableHeader column={column}>Код</SortableHeader>,
    cell: ({ row }) => <span className="font-medium text-primary">{row.original.code}</span>,
  },
  {
    accessorKey: 'customerName',
    header: 'Клиент',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-sm">{row.original.customerName}</p>
        <p className="text-xs text-muted-foreground">{row.original.email}</p>
      </div>
    ),
  },
  {
    id: 'city',
    header: 'Город',
    cell: ({ row }) => <span className="text-sm">{row.original.city?.name ?? '—'}</span>,
  },
  {
    accessorKey: 'totalPrice',
    header: ({ column }) => <SortableHeader column={column}>Сумма</SortableHeader>,
    cell: ({ row }) => <span className="font-medium tabular-nums">{formatPrice(row.original.totalPrice)}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Статус',
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANT[row.original.status] || 'secondary'}>
        {STATUS_LABELS[row.original.status] || row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <SortableHeader column={column}>Создан</SortableHeader>,
    cell: ({ row }) =>
      row.original.createdAt
        ? new Date(row.original.createdAt).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '—',
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export function OrdersListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    status: '',
    city: '',
    search: '',
    page: 1,
    limit: 20,
  });

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.city) params.set('city', filters.city);
    if (filters.search) params.set('search', filters.search);
    params.set('page', String(filters.page));
    params.set('limit', String(filters.limit));

    adminApi
      .get<OrdersResponse>(`/admin/orders?${params.toString()}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Заказы</h1>
        <p className="text-muted-foreground">
          {data ? `${data.total} заказов` : <Skeleton className="h-4 w-24 inline-block" />}
        </p>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Поиск (код, email, имя)..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
              className="max-w-[250px]"
            />
            <Select
              value={filters.status || '__all__'}
              onValueChange={(v) => setFilters((f) => ({ ...f, status: v === '__all__' ? '' : v, page: 1 }))}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Все статусы</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.city || '__all__'}
              onValueChange={(v) => setFilters((f) => ({ ...f, city: v === '__all__' ? '' : v, page: 1 }))}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Все города" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Все города</SelectItem>
                <SelectItem value="moscow">Москва</SelectItem>
                <SelectItem value="spb">Санкт-Петербург</SelectItem>
                <SelectItem value="kazan">Казань</SelectItem>
                <SelectItem value="kaliningrad">Калининград</SelectItem>
                <SelectItem value="vladimir">Владимир</SelectItem>
                <SelectItem value="yaroslavl">Ярославль</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={loading}
        emptyText="Нет заказов"
        onRowClick={(item) => navigate(`/orders/${item.id}`)}
      />

      {data && data.pages > 1 && (
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
              {filters.page} / {data.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              disabled={filters.page >= data.pages}
            >
              Вперёд
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
