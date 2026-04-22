import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { adminApi } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

export function SupportTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const q = useQuery({
    queryKey: ['admin-support-ticket', id],
    queryFn: () => adminApi.get<Record<string, unknown>>(`/admin/support/tickets/${id}`),
    enabled: Boolean(id),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Тикет"
        actions={
          <Link to="/admin-v3/tickets" className="text-sm text-primary hover:underline">
            К списку
          </Link>
        }
      />
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка</p>
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

export default SupportTicketDetailPage;
