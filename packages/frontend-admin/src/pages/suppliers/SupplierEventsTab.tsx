import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { adminApi } from '@/api/client';
import { InCatalogBadge } from '@/components/InCatalogBadge';
import { computeInCatalog } from '@/lib/catalog';
import { formatDateRu, formatTimeRu } from '@/lib/sessions';

type SupplierEventRow = {
  id: string;
  title: string;
  cityName: string | null;
  source: string;
  isActive: boolean;
  supplierIsActive: boolean;
  nearestSession?: string | null;
};

type Props = { supplierId: string };

export function SupplierEventsTab({ supplierId }: Props) {
  const [rows, setRows] = useState<SupplierEventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') || '';
  const page = Number(searchParams.get('page') || '1');
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      const res = await adminApi.get<{
        items: SupplierEventRow[];
        total: number;
        page: number;
        pageSize: number;
      }>(`/admin/suppliers/${supplierId}/events?${params.toString()}`);
      setRows(res.items || []);
      setTotal(res.total || 0);
      setPages(Math.max(1, Math.ceil((res.total || 0) / (res.pageSize || pageSize))));
    } finally {
      setLoading(false);
    }
  }, [supplierId, search, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateSearchParam = (next: { search?: string; page?: number }) => {
    const p = new URLSearchParams(searchParams);
    if (next.search !== undefined) {
      if (next.search) p.set('search', next.search);
      else p.delete('search');
      p.delete('page');
    }
    if (next.page !== undefined) {
      if (next.page > 1) p.set('page', String(next.page));
      else p.delete('page');
    }
    setSearchParams(p);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">События поставщика ({rows.length})</h2>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => updateSearchParam({ search: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void load();
              }
            }}
            placeholder="Поиск по названию…"
            className="px-3 py-1.5 border rounded-lg text-sm w-64"
          />
          <button
            type="button"
            onClick={() => void load()}
            className="px-3 py-1.5 text-sm rounded-lg border bg-background hover:bg-muted"
          >
            Найти
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left">Событие</th>
              <th className="px-4 py-2 text-left">Город</th>
              <th className="px-4 py-2 text-left">Источник</th>
              <th className="px-4 py-2 text-center">Ближайший сеанс</th>
              <th className="px-4 py-2 text-center">В каталоге</th>
              <th className="px-4 py-2 text-right" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((e) => {
              const nearest = e.nearestSession
                ? `${formatDateRu(e.nearestSession)} ${formatTimeRu(e.nearestSession)}`
                : 'Нет будущих сеансов';

              const supplierActive = e.supplierIsActive !== false;
              const inCatalog = computeInCatalog(e.isActive, supplierActive);

              return (
                <tr key={e.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2">
                    <Link to={`/events/${e.id}`} className="text-primary hover:underline">
                      {e.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{e.cityName || '—'}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{e.source}</td>
                  <td className="px-4 py-2 text-center">{nearest}</td>
                  <td className="px-4 py-2 text-center">
                    <InCatalogBadge inCatalog={inCatalog} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link to={`/events/${e.id}`} className="text-xs text-primary hover:underline">
                      Открыть
                    </Link>
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  {search ? 'Ничего не найдено' : 'Событий нет'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!loading && pages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div>
            Страница {page} из {pages} · всего {total}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => updateSearchParam({ page: page - 1 })}
              className="px-2 py-1 border rounded disabled:opacity-50"
            >
              Назад
            </button>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => updateSearchParam({ page: page + 1 })}
              className="px-2 py-1 border rounded disabled:opacity-50"
            >
              Вперёд
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

