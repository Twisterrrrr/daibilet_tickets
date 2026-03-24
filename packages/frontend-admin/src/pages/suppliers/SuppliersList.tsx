import { ColumnDef } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { EmptyState, ErrorState, PageHeader } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, SortableHeader } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TRUST_LABELS: Record<number, string> = {
  0: 'Новый',
  1: 'Базовый',
  2: 'Проверенный',
  3: 'Надёжный',
};
const TRUST_VARIANTS: Record<number, 'secondary' | 'default' | 'success'> = {
  0: 'secondary',
  1: 'default',
  2: 'success',
  3: 'success',
};

interface SupplierItem {
  id: string;
  name: string;
  companyName: string | null;
  contactEmail: string | null;
  trustLevel: number;
  commissionRate: number;
  promoRate: number | null;
  _count?: { events?: number; offers?: number; supplierUsers?: number };
  successfulSales: number;
  isActive: boolean;
  inn?: string | null;
  createdAt: string | null;
}

const columns: ColumnDef<SupplierItem>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column}>Поставщик</SortableHeader>,
    cell: ({ row }) => {
      const s = row.original;
      const isAggregator = typeof s.id === 'string' && s.id.startsWith('agg:');
      const name = s.companyName || s.name;
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {isAggregator ? (
              <span className="font-medium text-muted-foreground">{name}</span>
            ) : (
              <Link
                to={`/suppliers/${s.id}`}
                className="-m-2 block rounded p-2 font-medium text-primary hover:bg-muted/50 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {name}
              </Link>
            )}
            {isAggregator && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-600">
                агрегатор
              </span>
            )}
          </div>
          {!isAggregator && s.inn && (
            <span className="text-xs text-muted-foreground">ИНН: {s.inn}</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'contactEmail',
    header: 'Контакт',
    cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.original.contactEmail || '—'}</span>,
  },
  {
    accessorKey: 'trustLevel',
    header: 'Trust',
    cell: ({ row }) => (
      <Badge variant={TRUST_VARIANTS[row.original.trustLevel] ?? 'secondary'}>
        {TRUST_LABELS[row.original.trustLevel] ?? row.original.trustLevel}
      </Badge>
    ),
  },
  {
    id: 'commission',
    header: 'Комиссия',
    cell: ({ row }) => {
      const s = row.original;
      const isAggregator = typeof s.id === 'string' && s.id.startsWith('agg:');
      if (isAggregator) return <span className="text-sm text-muted-foreground">—</span>;
      return (
        <span className="text-sm tabular-nums">
          {(Number(s.commissionRate) * 100).toFixed(0)}%
          {s.promoRate && (
            <span className="text-xs text-green-600 ml-1">
              ({(Number(s.promoRate) * 100).toFixed(0)}% промо)
            </span>
          )}
        </span>
      );
    },
  },
  {
    id: 'eventsCount',
    header: 'Событий',
    cell: ({ row }) => <span className="tabular-nums">{row.original._count?.events ?? 0}</span>,
  },
  {
    id: 'offersCount',
    header: 'Офферов',
    cell: ({ row }) => <span className="tabular-nums">{row.original._count?.offers ?? 0}</span>,
  },
];

export function SuppliersListPage() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [trustFilter, setTrustFilter] = useState<'all' | '0' | '1' | '2'>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = (opts?: { page?: number; search?: string; trust?: string; isActive?: string }) => {
    const nextPage = opts?.page ?? page;
    const s = opts?.search ?? search;
    const trust = opts?.trust ?? trustFilter;
    const isActive = opts?.isActive ?? activeFilter;

    const params = new URLSearchParams();
    params.set('page', String(nextPage));
    params.set('limit', '20');
    if (s) params.set('search', s);
    if (trust !== 'all') params.set('trustLevel', trust);
    if (isActive !== 'all') params.set('isActive', isActive);

    setLoading(true);
    setError(null);

    adminApi
      .get(`/admin/suppliers?${params.toString()}`)
      .then((res: any) => {
        const baseItems = res.items || [];
        const eventCountsBySource = res.eventCountsBySource || {};
        const tcEvents = Number(eventCountsBySource.TC || eventCountsBySource.Tc || 0);
        const teplohodEvents = Number(eventCountsBySource.TEPLOHOD || eventCountsBySource.Teplohod || 0);

        // Виртуальные агрегаторы (источники инвентаря), чтобы видеть их в списке поставщиков
        const aggregators = [
          {
            id: 'agg:ticketscloud',
            name: 'Ticketscloud',
            companyName: 'Ticketscloud',
            contactEmail: '',
            trustLevel: 2,
            commissionRate: 0,
            promoRate: null,
            _count: { events: tcEvents, offers: 0, supplierUsers: 0 },
            successfulSales: 0,
            isActive: true,
            createdAt: null,
          },
          {
            id: 'agg:teplohod',
            name: 'Teplohod.info',
            companyName: 'Teplohod.info',
            contactEmail: '',
            trustLevel: 1,
            commissionRate: 0,
            promoRate: null,
            _count: { events: teplohodEvents, offers: 0, supplierUsers: 0 },
            successfulSales: 0,
            isActive: true,
            createdAt: null,
          },
        ];

        setSuppliers([...baseItems, ...aggregators]);
        setTotal((res.total || 0) + aggregators.length);
        setPage(res.page || nextPage);
        setPages(res.pages || 1);
      })
      .catch((e: any) => {
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load on mount only
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader title="Поставщики" subtitle={`Всего: ${total}`} />

      {error && (
        <ErrorState
          title="Не удалось загрузить поставщиков"
          description={error}
          action={
            <button
              type="button"
              className="rounded-lg border px-3 py-1.5 text-sm"
              onClick={() => load({ page: 1 })}
            >
              Повторить попытку
            </button>
          }
        />
      )}

      {suppliers.length === 0 && !loading ? (
        <EmptyState
          title="Нет поставщиков"
          description="Как только появятся поставщики или подключённые агрегаторы, они отобразятся здесь."
        />
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-border/80 bg-white shadow-none">
          <DataTable
            columns={columns}
            data={suppliers}
            loading={loading}
            emptyText="Нет поставщиков"
            onRowClick={(item) => {
              const isAggregator = typeof item.id === 'string' && item.id.startsWith('agg:');
              if (!isAggregator) navigate(`/suppliers/${item.id}`);
            }}
            pageSize={20}
            toolbar={
              <div className="flex w-full flex-wrap items-center gap-1.5 py-0.5">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && load({ page: 1, search: e.currentTarget.value })}
                  placeholder="Поиск по названию или email..."
                  className="w-72"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => load({ page: 1, search })}>
                  Найти
                </Button>
                <Select
                  value={trustFilter}
                  onValueChange={(value) => {
                    const v = value as typeof trustFilter;
                    setTrustFilter(v);
                    load({ page: 1, trust: v });
                  }}
                >
                  <SelectTrigger className="w-[170px]">
                    <SelectValue placeholder="Trust: все" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Trust: все</SelectItem>
                    <SelectItem value="0">0 — Новый</SelectItem>
                    <SelectItem value="1">1 — Проверенный</SelectItem>
                    <SelectItem value="2">2 — Доверенный</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={activeFilter}
                  onValueChange={(value) => {
                    const v = value as typeof activeFilter;
                    setActiveFilter(v);
                    load({ page: 1, isActive: v });
                  }}
                >
                  <SelectTrigger className="w-[170px]">
                    <SelectValue placeholder="Статус: все" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Статус: все</SelectItem>
                    <SelectItem value="true">Активные</SelectItem>
                    <SelectItem value="false">Неактивные</SelectItem>
                  </SelectContent>
                </Select>
                <span className="ml-auto text-sm text-muted-foreground">
                  Стр. {page} из {pages}
                </span>
              </div>
            }
          />
        </div>
      )}
    </div>
  );
}
