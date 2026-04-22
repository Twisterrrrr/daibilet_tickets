import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { adminApi } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

export function CheckoutOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const q = useQuery({
    queryKey: ['admin-checkout-session', id],
    queryFn: () => adminApi.get<Record<string, unknown>>(`/admin/checkout/sessions/${id}`),
    enabled: Boolean(id),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Заказ"
        subtitle={id ?? ''}
        actions={
          <Link to="/admin-v3/orders" className="text-sm text-primary hover:underline">
            ← К списку
          </Link>
        }
      />
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : q.isError ? (
        <p className="text-sm text-destructive">Не найдено</p>
      ) : (
        <pre className="max-h-[70vh] overflow-auto rounded-lg border bg-muted/30 p-4 text-xs">
          {JSON.stringify(q.data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default CheckoutOrderDetailPage;
