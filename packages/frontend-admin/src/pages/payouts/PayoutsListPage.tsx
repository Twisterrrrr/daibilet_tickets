import { ColumnDef } from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState, ErrorState, PageHeader } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

type PayoutStatus = 'NEW' | 'APPROVED' | 'REJECTED' | 'PAID';

interface PayoutItem {
  id: string;
  operatorId: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  requestedAt: string;
  processedAt?: string | null;
  comment?: string | null;
  adminComment?: string | null;
  operator?: { id: string; name: string; slug: string | null };
}

interface PayoutsResponse {
  items: PayoutItem[];
  total: number;
  page: number;
  pages: number;
}

const STATUS_LABEL: Record<PayoutStatus, string> = {
  NEW: 'Новая',
  APPROVED: 'Одобрена',
  REJECTED: 'Отклонена',
  PAID: 'Выплачена',
};

const STATUS_VARIANT: Record<PayoutStatus, 'secondary' | 'default' | 'success' | 'warning' | 'destructive'> = {
  NEW: 'secondary',
  APPROVED: 'warning',
  REJECTED: 'destructive',
  PAID: 'success',
};

function formatAmount(amount: number, currency: string) {
  const value = Number(amount || 0);
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currency || 'RUB',
    minimumFractionDigits: 2,
  }).format(value);
}

function buildColumns(
  updatingId: string | null,
  onUpdateStatus: (item: PayoutItem, status: PayoutStatus) => void,
  onOpenDetails: (item: PayoutItem) => void,
): ColumnDef<PayoutItem>[] {
  return [
    {
      accessorKey: 'requestedAt',
      header: 'Дата заявки',
      cell: ({ row }) =>
        row.original.requestedAt
          ? new Date(row.original.requestedAt).toLocaleString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '—',
    },
    {
      accessorKey: 'operator',
      header: 'Поставщик',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails(row.original);
          }}
          className="text-left hover:underline"
        >
          <div className="font-medium text-sm">{row.original.operator?.name ?? '—'}</div>
          <div className="text-xs text-muted-foreground">{row.original.operator?.slug ?? row.original.operatorId}</div>
        </button>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Сумма',
      cell: ({ row }) => (
        <span className="font-semibold tabular-nums">
          {formatAmount(row.original.amount, row.original.currency || 'RUB')}
        </span>
      ),
    },
    {
      accessorKey: 'comment',
      header: 'Реквизиты / Комментарий',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground line-clamp-2">
          {row.original.comment || row.original.adminComment || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Статус',
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status] ?? 'secondary'}>
          {STATUS_LABEL[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Действия',
      cell: ({ row }) => {
        const item = row.original;
        const isTerminal = item.status === 'REJECTED' || item.status === 'PAID';
        const isUpdating = updatingId === item.id;

        if (isTerminal) {
          return (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(item);
              }}
            >
              Подробнее
            </Button>
          );
        }

        return (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isUpdating}
              onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(item, 'PAID');
              }}
            >
              {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Подтвердить выплату'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isUpdating}
              onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(item, 'REJECTED');
              }}
            >
              Отклонить
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(item);
              }}
            >
              Подробнее
            </Button>
          </div>
        );
      },
    },
  ];
}

export function PayoutsListPage() {
  const [data, setData] = useState<PayoutsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<PayoutItem | null>(null);
  const [filters, setFilters] = useState<{ status: string; search: string; page: number; limit: number }>({
    status: '',
    search: '',
    page: 1,
    limit: 25,
  });

  const fetchData = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    params.set('page', String(filters.page));
    params.set('limit', String(filters.limit));

    adminApi
      .get<PayoutsResponse>(`/admin/payouts?${params.toString()}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки заявок'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.limit, filters.status]);

  const handleUpdateStatus = async (item: PayoutItem, nextStatus: PayoutStatus) => {
    setUpdatingId(item.id);
    try {
      await adminApi.patch(`/admin/payouts/${item.id}/status`, { status: nextStatus });
      toast.success(
        nextStatus === 'PAID'
          ? 'Выплата помечена как выполненная и отражена в книге проводок.'
          : 'Статус заявки изменён.',
      );
      setSelectedPayout(null);
      fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Произошла ошибка при обновлении статуса выплаты');
    } finally {
      setUpdatingId(null);
    }
  };

  if (error) {
    return (
      <ErrorState
        title="Не удалось загрузить заявки на вывод"
        description={error}
        action={
          <Button variant="outline" onClick={() => setFilters((f) => ({ ...f }))}>
            Повторить попытку
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Заявки на вывод средств"
        subtitle={
          data ? (
            `${data.total} заявок`
          ) : (
            <Skeleton className="inline-block h-4 w-24" />
          )
        }
      />

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Поиск по поставщику или комментарию (пока неактивно)"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
              className="max-w-[260px]"
            />
            <Select
              value={filters.status || '__all__'}
              onValueChange={(v) => setFilters((f) => ({ ...f, status: v === '__all__' ? '' : v, page: 1 }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Все статусы</SelectItem>
                <SelectItem value="NEW">Новые</SelectItem>
                <SelectItem value="APPROVED">Одобренные</SelectItem>
                <SelectItem value="PAID">Выплаченные</SelectItem>
                <SelectItem value="REJECTED">Отклонённые</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {data && data.items.length === 0 && !loading ? (
        <EmptyState
          title="Заявок пока нет"
          description="Как только поставщики начнут запрашивать вывод средств, заявки появятся здесь."
        />
      ) : (
        <>
          <DataTable
            columns={buildColumns(updatingId, handleUpdateStatus, setSelectedPayout)}
            data={data?.items ?? []}
            loading={loading}
            emptyText="Нет заявок"
            onRowClick={(row) => setSelectedPayout(row)}
            pageSize={100}
          />

          <Sheet open={!!selectedPayout} onOpenChange={(open) => !open && setSelectedPayout(null)}>
            <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Заявка на вывод средств</SheetTitle>
              </SheetHeader>
              {selectedPayout && (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Поставщик</p>
                    <div className="mt-1">
                      {selectedPayout.operator ? (
                        <Link
                          to={`/suppliers/${selectedPayout.operator.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {selectedPayout.operator.name}
                        </Link>
                      ) : (
                        <span>{selectedPayout.operatorId}</span>
                      )}
                      {selectedPayout.operator?.slug && (
                        <p className="text-sm text-muted-foreground">{selectedPayout.operator.slug}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Сумма</p>
                    <p className="mt-1 font-semibold tabular-nums">
                      {formatAmount(selectedPayout.amount, selectedPayout.currency || 'RUB')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Статус</p>
                    <Badge variant={STATUS_VARIANT[selectedPayout.status]} className="mt-1">
                      {STATUS_LABEL[selectedPayout.status]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Дата заявки</p>
                    <p className="mt-1 text-sm">
                      {selectedPayout.requestedAt
                        ? new Date(selectedPayout.requestedAt).toLocaleString('ru-RU')
                        : '—'}
                    </p>
                  </div>
                  {selectedPayout.processedAt && (
                    <div>
                      <p className="text-xs text-muted-foreground">Обработано</p>
                      <p className="mt-1 text-sm">
                        {new Date(selectedPayout.processedAt).toLocaleString('ru-RU')}
                      </p>
                    </div>
                  )}
                  {selectedPayout.comment && (
                    <div>
                      <p className="text-xs text-muted-foreground">Реквизиты / Комментарий поставщика</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{selectedPayout.comment}</p>
                    </div>
                  )}
                  {selectedPayout.adminComment && (
                    <div>
                      <p className="text-xs text-muted-foreground">Комментарий администратора</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{selectedPayout.adminComment}</p>
                    </div>
                  )}
                </div>
              )}
            </SheetContent>
          </Sheet>
        </>
      )}

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Показано {data.items.length} из {data.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))}
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
              onClick={() => setFilters((f) => ({ ...f, page: Math.min(data.pages, f.page + 1) }))}
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

