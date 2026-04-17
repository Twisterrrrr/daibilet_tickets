import { adminApi } from '@/api/client';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { Link } from 'react-router-dom';

type RouteListItem = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  estimatedMinutes: number | null;
  updatedAt: string;
  _count: { points: number };
};

export function RoutesListPage() {
  const q = useQuery({
    queryKey: ['admin-routes-list-v3'],
    queryFn: async () => adminApi.get<{ items: RouteListItem[] }>('/admin/routes?limit=200'),
    staleTime: 10_000,
  });

  if (q.isLoading && !q.data) return <LoadingState label="Загрузка маршрутов…" />;
  if (q.isError) {
    return (
      <ErrorState
        title="Не удалось загрузить маршруты"
        description={q.error instanceof Error ? q.error.message : 'Ошибка'}
        onRetry={() => q.refetch()}
      />
    );
  }

  const items = q.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Маршруты" subtitle="Упорядоченные точки (RoutePoint) для планировщика" />

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs font-medium uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-3">Маршрут</th>
              <th className="px-3 py-3">Статус</th>
              <th className="px-3 py-3">Точки</th>
              <th className="w-44 px-3 py-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  Нет маршрутов
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-3">
                    <div className="font-medium">{r.name}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{r.slug}</div>
                  </td>
                  <td className="px-3 py-3 text-xs">{r.isActive ? 'active' : 'inactive'}</td>
                  <td className="px-3 py-3 text-xs">{r._count.points}</td>
                  <td className="px-3 py-3">
                    <Button type="button" size="sm" variant="secondary" asChild>
                      <Link to={`/admin-v3/routes/${r.id}/points`}>Точки</Link>
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
