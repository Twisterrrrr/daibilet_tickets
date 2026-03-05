import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { adminApi } from '@/api/client';

const TRUST_LABELS: Record<number, string> = {
  0: 'Новый',
  1: 'Проверенный',
  2: 'Доверенный',
};
const TRUST_COLORS: Record<number, string> = {
  0: 'bg-gray-100 text-gray-700',
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-green-100 text-green-700',
};

export function SuppliersListPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [trustFilter, setTrustFilter] = useState<'all' | '0' | '1' | '2'>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = (opts?: { page?: number; search?: string; trust?: string; isActive?: string }) => {
    const nextPage = opts?.page ?? page;
    const s = opts?.search ?? search;
    const trust = opts?.trust ?? trustFilter;
    const isActive = opts?.isActive ?? activeFilter;

    const params = new URLSearchParams();
    params.set('page', String(nextPage));
    params.set('limit', '20');
    if (s) params.set('search', s);
    if (trust !== 'all') params.set('trustLevel', trust);
    if (isActive !== 'all') params.set('isActive', isActive);

    setLoading(true);
    setError(null);

    adminApi
      .get(`/admin/suppliers?${params.toString()}`)
      .then((res: any) => {
        const baseItems = res.items || [];
        const eventCountsBySource = res.eventCountsBySource || {};
        const tcEvents = Number(eventCountsBySource.TC || eventCountsBySource.Tc || 0);
        const teplohodEvents = Number(eventCountsBySource.TEPLOHOD || eventCountsBySource.Teplohod || 0);

        // Виртуальные агрегаторы (источники инвентаря), чтобы видеть их в списке поставщиков
        const aggregators = [
          {
            id: 'agg:ticketscloud',
            name: 'Ticketscloud',
            companyName: 'Ticketscloud',
            contactEmail: '',
            trustLevel: 2,
            commissionRate: 0,
            promoRate: null,
            _count: { events: tcEvents, offers: 0, supplierUsers: 0 },
            successfulSales: 0,
            isActive: true,
            createdAt: null,
          },
          {
            id: 'agg:teplohod',
            name: 'Teplohod.info',
            companyName: 'Teplohod.info',
            contactEmail: '',
            trustLevel: 1,
            commissionRate: 0,
            promoRate: null,
            _count: { events: teplohodEvents, offers: 0, supplierUsers: 0 },
            successfulSales: 0,
            isActive: true,
            createdAt: null,
          },
        ];

        setSuppliers([...baseItems, ...aggregators]);
        setTotal((res.total || 0) + aggregators.length);
        setPage(res.page || nextPage);
        setPages(res.pages || 1);
      })
      .catch((e: any) => {
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Поставщики ({total})</h1>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load({ page: 1, search: e.currentTarget.value })}
            placeholder="Поиск..."
            className="px-3 py-1.5 border rounded-lg text-sm w-64"
          />
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg border text-sm bg-primary text-primary-foreground hover:opacity-90"
            onClick={() => load({ page: 1, search })}
          >
            Найти
          </button>
          <select
            value={trustFilter}
            onChange={(e) => {
              const v = e.target.value as typeof trustFilter;
              setTrustFilter(v);
              load({ page: 1, trust: v });
            }}
            className="px-2 py-1.5 border rounded-lg text-xs text-muted-foreground"
          >
            <option value="all">Trust: все</option>
            <option value="0">0 — Новый</option>
            <option value="1">1 — Проверенный</option>
            <option value="2">2 — Доверенный</option>
          </select>
          <select
            value={activeFilter}
            onChange={(e) => {
              const v = e.target.value as typeof activeFilter;
              setActiveFilter(v);
              load({ page: 1, isActive: v });
            }}
            className="px-2 py-1.5 border rounded-lg text-xs text-muted-foreground"
          >
            <option value="all">Статус: все</option>
            <option value="true">Активные</option>
            <option value="false">Неактивные</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Компания</th>
              <th className="text-left px-4 py-3 font-medium">Контакт</th>
              <th className="text-center px-4 py-3 font-medium">Trust</th>
              <th className="text-center px-4 py-3 font-medium">Комиссия</th>
              <th className="text-center px-4 py-3 font-medium">События</th>
              <th className="text-center px-4 py-3 font-medium">Продажи</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {suppliers.map((s) => {
              const isAggregator = typeof s.id === 'string' && s.id.startsWith('agg:');
              const name = s.companyName || s.name;
              return (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    {isAggregator ? (
                      <span className="font-medium text-muted-foreground">{name}</span>
                    ) : (
                      <Link to={`/suppliers/${s.id}`} className="font-medium text-primary hover:underline">
                        {name}
                      </Link>
                    )}
                    {s.inn && !isAggregator && (
                      <span className="text-xs text-muted-foreground ml-2">ИНН: {s.inn}</span>
                    )}
                    {isAggregator && (
                      <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-600">
                        агрегатор
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.contactEmail}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        TRUST_COLORS[s.trustLevel] || TRUST_COLORS[0]
                      }`}
                    >
                      {TRUST_LABELS[s.trustLevel] || s.trustLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isAggregator ? '—' : `${(Number(s.commissionRate) * 100).toFixed(0)}%`}
                    {!isAggregator && s.promoRate && (
                      <span className="text-green-600 text-xs ml-1">
                        ({(Number(s.promoRate) * 100).toFixed(0)}% промо)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">{s._count?.events || 0}</td>
                  <td className="px-4 py-3 text-center">{s._count?.offers || 0}</td>
                </tr>
              );
            })}
            {!loading && suppliers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Нет поставщиков
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Стр. {page} из {pages}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg border disabled:opacity-40"
            disabled={loading || page <= 1}
            onClick={() => load({ page: page - 1 })}
          >
            Назад
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg border disabled:opacity-40"
            disabled={loading || page >= pages}
            onClick={() => load({ page: page + 1 })}
          >
            Далее
          </button>
        </div>
      </div>
    </div>
  );
}
