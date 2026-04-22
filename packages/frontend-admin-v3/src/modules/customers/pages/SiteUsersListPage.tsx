import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { adminApi } from '@/api/client';
import { useQuery } from '@tanstack/react-query';

type Row = {
  id: string;
  email: string;
  name: string;
  lastLoginAt: string | null;
  createdAt: string;
  ordersCount: number;
};

export function SiteUsersListPage() {
  const q = useQuery({
    queryKey: ['admin-site-users'],
    queryFn: () => adminApi.get<{ items: Row[]; total: number }>('/admin/site-users?limit=100'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Покупатели" subtitle="Пользователи сайта" />
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка</p>
      ) : q.isError ? (
        <p className="text-sm text-destructive">Ошибка загрузки</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Имя</th>
                <th className="px-3 py-2">Эл. почта</th>
                <th className="px-3 py-2">Заказов</th>
                <th className="px-3 py-2">Регистрация</th>
              </tr>
            </thead>
            <tbody>
              {(q.data?.items ?? []).map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{u.name}</td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2 tabular-nums">{u.ordersCount}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(u.createdAt).toLocaleString('ru-RU')}
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

export default SiteUsersListPage;
