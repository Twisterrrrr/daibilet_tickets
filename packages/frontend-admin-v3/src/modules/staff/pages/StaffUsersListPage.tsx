import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { adminApi } from '@/api/client';
import { useQuery } from '@tanstack/react-query';

type Row = { id: string; email: string; name: string; role: string; isActive: boolean; lastLoginAt: string | null };

export function StaffUsersListPage() {
  const q = useQuery({
    queryKey: ['admin-users-staff'],
    queryFn: () => adminApi.get<{ items: Row[] }>('/admin/users'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Команда" subtitle="Админ-пользователи (staff)" />
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка</p>
      ) : q.isError ? (
        <p className="text-sm text-destructive">Ошибка</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs">
              <tr>
                <th className="px-3 py-2">Имя</th>
                <th className="px-3 py-2">Эл. почта</th>
                <th className="px-3 py-2">Роль</th>
                <th className="px-3 py-2">Активен</th>
              </tr>
            </thead>
            <tbody>
              {(q.data?.items ?? []).map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{u.name}</td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">{u.role}</td>
                  <td className="px-3 py-2">{u.isActive ? 'да' : 'нет'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default StaffUsersListPage;
