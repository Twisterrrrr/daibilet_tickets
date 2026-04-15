import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { adminApi } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

type Ticket = {
  id: string;
  shortCode: string;
  subject: string;
  status: string;
  email: string;
  createdAt: string;
};

export function TicketsPage() {
  const q = useQuery({
    queryKey: ['admin-support-tickets'],
    queryFn: () => adminApi.get<{ items: Ticket[]; total: number }>('/admin/support/tickets?limit=50'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Тикеты поддержки" subtitle="Обращения support" />
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка</p>
      ) : q.isError ? (
        <p className="text-sm text-destructive">Ошибка загрузки</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Код</th>
                <th className="px-3 py-2">Тема</th>
                <th className="px-3 py-2">Статус</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Создан</th>
              </tr>
            </thead>
            <tbody>
              {(q.data?.items ?? []).map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link className="text-primary hover:underline" to={`/admin-v3/tickets/${t.id}`}>
                      {t.shortCode}
                    </Link>
                  </td>
                  <td className="max-w-xs truncate px-3 py-2">{t.subject}</td>
                  <td className="px-3 py-2">{t.status}</td>
                  <td className="px-3 py-2 text-muted-foreground">{t.email}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(t.createdAt).toLocaleString('ru-RU')}
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

export default TicketsPage;

