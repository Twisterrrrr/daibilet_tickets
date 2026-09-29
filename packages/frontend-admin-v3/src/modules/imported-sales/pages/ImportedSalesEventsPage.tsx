import { adminApi } from '@/api/client';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

type Row = {
  id: string;
  title: string;
  source?: string;
  isPublished?: boolean;
  city?: { name: string } | null;
};

type ListResponse = { items: Row[]; total: number };

export function ImportedSalesEventsPage() {
  const q = useQuery({
    queryKey: ['imported-sales', 'events', 'tep'],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set('limit', '50');
      sp.set('source', 'TEPLOHOD');
      return adminApi.get<ListResponse>(`/admin/events?${sp.toString()}`);
    },
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Imported Sales · Events"
        subtitle="События из источников (сейчас фильтр: TEPLOHOD)."
        actions={
          <Link className="text-sm underline" to="/admin-v3/events?source=TEPLOHOD">
            Открыть полный список в Events
          </Link>
        }
      />

      {q.isLoading ? <div className="text-sm text-muted-foreground">Загрузка…</div> : null}
      {q.isError ? <div className="text-sm text-red-600">Ошибка: {(q.error as Error).message}</div> : null}

      {q.data?.items?.length ? (
        <div className="rounded-lg border bg-card">
          <div className="p-3 text-sm text-muted-foreground">Первые {q.data.items.length} / total {q.data.total}</div>
          <div className="divide-y">
            {q.data.items.map((r) => (
              <div key={r.id} className="p-3 text-sm">
                <div className="font-medium">{r.title}</div>
                <div className="text-xs text-muted-foreground">
                  {r.source ?? '—'} · {r.city?.name ?? '—'} · published: {r.isPublished ? 'yes' : 'no'}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        !q.isLoading && !q.isError ? (
          <div className="text-sm text-muted-foreground">Нет событий по фильтру.</div>
        ) : null
      )}
    </div>
  );
}

