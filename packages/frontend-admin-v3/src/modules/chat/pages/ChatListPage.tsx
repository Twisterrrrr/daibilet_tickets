import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { adminApi } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

type Conv = {
  id: string;
  status: string;
  guestName: string | null;
  guestEmail: string | null;
  updatedAt: string;
  lastCustomerMessageAt: string | null;
  lastAdminMessageAt: string | null;
};

export function ChatListPage() {
  const q = useQuery({
    queryKey: ['admin-chat-conversations'],
    queryFn: () => adminApi.get<{ items: Conv[] }>('/admin/chat/conversations?limit=100'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Чат" subtitle="Диалоги с сайта" />
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка</p>
      ) : q.isError ? (
        <p className="text-sm text-destructive">Ошибка</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {(q.data?.items ?? []).map((c) => {
            const needs =
              c.lastCustomerMessageAt &&
              (!c.lastAdminMessageAt || new Date(c.lastCustomerMessageAt) > new Date(c.lastAdminMessageAt));
            return (
              <li key={c.id}>
                <Link
                  to={`/admin-v3/chat/${c.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-muted/50"
                >
                  <div>
                    <div className="font-medium">{c.guestName || c.guestEmail || 'Гость'}</div>
                    <div className="text-xs text-muted-foreground">{c.guestEmail}</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {needs ? (
                      <span className="rounded-full bg-amber-600 px-2 py-0.5 text-white">ждёт ответа</span>
                    ) : null}
                    <span className="text-muted-foreground">{c.status}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default ChatListPage;