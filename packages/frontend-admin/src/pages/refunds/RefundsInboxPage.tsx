import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface RefundItem {
  id: string;
  status: string;
  paymentMode: string;
  provider: string | null;
  requestedAmountCents: number | null;
  approvedAmountCents: number | null;
  reason: string | null;
  createdAt: string;
  ticket?: { voucherCode: string | null; grossCents: number };
}

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Запрошен',
  CALCULATED: 'Рассчитан',
  FORWARDED: 'Отправлен провайдеру',
  WAITING_PROVIDER: 'Ожидание провайдера',
  APPROVED: 'Одобрен',
  REFUNDED: 'Возвращён',
  REJECTED: 'Отклонён',
  CLOSED: 'Закрыт',
  FAILED: 'Ошибка',
};

function formatPrice(kopecks: number) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(
    kopecks / 100,
  );
}

export function RefundsInboxPage() {
  const [items, setItems] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    const params = statusFilter ? `?status=${statusFilter}` : '';
    adminApi
      .get<{ items: RefundItem[] }>(`/admin/refunds${params}`)
      .then((r: unknown) => {
        const res = r as { items?: RefundItem[]; data?: RefundItem[] };
        setItems(res.items ?? res.data ?? []);
      })
      .catch(() => toast.error('Не удалось загрузить возвраты'))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const handleClose = async (id: string) => {
    try {
      await adminApi.patch(`/admin/refunds/${id}/close`, {});
      setItems((prev) => prev.filter((r) => r.id !== id));
      toast.success('Закрыто');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const inWork = items.filter((r) =>
    ['FORWARDED', 'WAITING_PROVIDER', 'REQUESTED', 'CALCULATED', 'APPROVED'].includes(r.status),
  );

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Возвраты (в работе)</h1>
        <p className="text-muted-foreground">Заявки на возврат, ожидающие закрытия</p>
      </div>

      <div className="flex gap-2">
        <Button
          variant={statusFilter === '' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('')}
        >
          Все
        </Button>
        <Button
          variant={statusFilter === 'FORWARDED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('FORWARDED')}
        >
          Отправлены провайдеру
        </Button>
        <Button
          variant={statusFilter === 'WAITING_PROVIDER' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('WAITING_PROVIDER')}
        >
          Ожидание
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            В работе: {inWork.length}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет заявок</p>
          ) : (
            <ul className="space-y-3">
              {items.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded border p-3 text-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{r.id.slice(0, 8)}</span>
                      <Badge variant="secondary">{STATUS_LABELS[r.status] ?? r.status}</Badge>
                      {r.paymentMode === 'EXTERNAL' && (
                        <Badge variant="outline">{r.provider ?? 'EXTERNAL'}</Badge>
                      )}
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      {r.requestedAmountCents != null && formatPrice(r.requestedAmountCents)}
                      {r.ticket?.voucherCode && ` • ${r.ticket.voucherCode}`}
                    </div>
                    {r.reason && <p className="mt-0.5 text-xs text-muted-foreground">{r.reason}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                    </span>
                    {['FORWARDED', 'WAITING_PROVIDER'].includes(r.status) && (
                      <Button variant="outline" size="sm" onClick={() => handleClose(r.id)}>
                        Закрыть
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
