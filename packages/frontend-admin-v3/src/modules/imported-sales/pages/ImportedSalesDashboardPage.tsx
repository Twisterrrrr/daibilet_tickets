import { adminApi } from '@/api/client';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

type ImportedSalesDashboardDto = {
  catalogReadiness?: Record<string, unknown>;
  landingTrafficEngine?: Record<string, unknown>;
  importHealth?: Record<string, unknown>;
  externalOrdersFeed?: Record<string, unknown>;
};

export function ImportedSalesDashboardPage() {
  const q = useQuery({
    queryKey: ['imported-sales', 'dashboard'],
    queryFn: () => adminApi.get<ImportedSalesDashboardDto>('/admin/imported-sales/dashboard'),
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Imported Sales"
        subtitle="Операционная админка импорта (Teplohod / Ticketscloud)."
        actions={
          <div className="flex gap-2">
            <Link className="text-sm underline" to="/admin-v3/sales/imported/events">
              Events
            </Link>
          </div>
        }
      />

      {q.isLoading ? <div className="text-sm text-muted-foreground">Загрузка…</div> : null}
      {q.isError ? (
        <div className="text-sm text-red-600">Ошибка загрузки dashboard: {(q.error as Error).message}</div>
      ) : null}

      {q.data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border p-4">
            <div className="text-sm font-medium mb-2">Catalog readiness</div>
            <pre className="text-xs overflow-auto">{JSON.stringify(q.data.catalogReadiness ?? null, null, 2)}</pre>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm font-medium mb-2">Import health</div>
            <pre className="text-xs overflow-auto">{JSON.stringify(q.data.importHealth ?? null, null, 2)}</pre>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm font-medium mb-2">Landing traffic engine</div>
            <pre className="text-xs overflow-auto">{JSON.stringify(q.data.landingTrafficEngine ?? null, null, 2)}</pre>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm font-medium mb-2">External orders feed</div>
            <pre className="text-xs overflow-auto">{JSON.stringify(q.data.externalOrdersFeed ?? null, null, 2)}</pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}

