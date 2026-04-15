import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type Row = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  reason: string;
  createdAt: string;
  createdByType: string;
  checkoutSessionId: string;
  fulfillmentItemId: string;
};

export function RefundsListPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['admin-refund-requests'],
    queryFn: () => adminApi.get<{ items: Row[]; total: number }>('/admin/refunds/requests?limit=100'),
  });

  const approve = useMutation({
    mutationFn: (id: string) => adminApi.post(`/admin/refunds/${id}/approve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-refund-requests'] }),
  });
  const reject = useMutation({
    mutationFn: (id: string) => adminApi.post(`/admin/refunds/${id}/reject`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-refund-requests'] }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Возвраты" subtitle="Заявки по позициям заказа (fulfillment)" />
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : q.isError ? (
        <p className="text-sm text-destructive">Не удалось загрузить</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Статус</th>
                <th className="px-3 py-2">Сумма</th>
                <th className="px-3 py-2">Источник</th>
                <th className="px-3 py-2">Сессия</th>
                <th className="px-3 py-2">Создана</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {(q.data?.items ?? []).map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{r.status}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {(r.amount / 100).toFixed(0)} {r.currency}
                  </td>
                  <td className="px-3 py-2 text-xs">{r.createdByType}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.checkoutSessionId.slice(0, 8)}…</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString('ru-RU')}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.status === 'CREATED' ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={approve.isPending || reject.isPending}
                          onClick={() => approve.mutate(r.id)}
                        >
                          Одобрить
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={approve.isPending || reject.isPending}
                          onClick={() => reject.mutate(r.id)}
                        >
                          Отклонить
                        </Button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">Всего: {q.data?.total ?? 0}</p>
        </div>
      )}
    </div>
  );
}

export default RefundsListPage;
