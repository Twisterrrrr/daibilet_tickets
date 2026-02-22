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

  const load = (s?: string) => {
    const params = new URLSearchParams();
    if (s) params.set('search', s);
    adminApi.get(`/admin/suppliers?${params}`).then((res: any) => {
      setSuppliers(res.items || []);
      setTotal(res.total || 0);
    });
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Поставщики ({total})</h1>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(search)}
            placeholder="Поиск..."
            className="px-3 py-1.5 border rounded-lg text-sm w-64"
          />
        </div>
      </div>

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
            {suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link to={`/suppliers/${s.id}`} className="font-medium text-primary hover:underline">
                    {s.companyName || s.name}
                  </Link>
                  {s.inn && <span className="text-xs text-muted-foreground ml-2">ИНН: {s.inn}</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{s.contactEmail}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${TRUST_COLORS[s.trustLevel] || TRUST_COLORS[0]}`}
                  >
                    {TRUST_LABELS[s.trustLevel] || s.trustLevel}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {(Number(s.commissionRate) * 100).toFixed(0)}%
                  {s.promoRate && (
                    <span className="text-green-600 text-xs ml-1">
                      ({(Number(s.promoRate) * 100).toFixed(0)}% промо)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">{s._count?.events || 0}</td>
                <td className="px-4 py-3 text-center">{s.successfulSales || 0}</td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Нет поставщиков
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
