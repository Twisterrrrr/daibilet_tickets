import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { adminApi } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

type Session = {
  id: string;
  shortCode: string;
  status: string;
  customerEmail: string | null;
  customerName: string | null;
  totalPrice: number | null;
  createdAt: string;
  _count?: { orderRequests: number };
};

export function CheckoutOrdersListPage() {
  const q = useQuery({
    queryKey: ['admin-checkout-sessions'],
    queryFn: () =>
      adminApi.get<{ items: Session[]; total: number; page: number }>('/admin/checkout/sessions?limit=50'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Заказы"
        subtitle="Checkout-сессии: внутренний checkout и виджеты (всё в одной таблице)"
      />
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : q.isError ? (
        <p className="text-sm text-destructive">Не удалось загрузить заказы</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Код</th>
                <th className="px-3 py-2">Статус</th>
                <th className="px-3 py-2">Клиент</th>
                <th className="px-3 py-2">Сумма</th>
                <th className="px-3 py-2">Создан</th>
              </tr>
            </thead>
            <tbody>
              {(q.data?.items ?? []).map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link to={`/admin-v3/orders/${s.id}`} className="text-primary hover:underline">
                      {s.shortCode}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{s.status}</td>
                  <td className="max-w-[200px] truncate px-3 py-2">{s.customerEmail ?? s.customerName ?? '—'}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {s.totalPrice != null ? `${(s.totalPrice / 100).toFixed(0)} ₽` : '—'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(s.createdAt).toLocaleString('ru-RU')}
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

export default CheckoutOrdersListPage;
