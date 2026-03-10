import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';

import { EmptyState, ErrorState, LoadingState, PageHeader, SectionCard } from '@daibilet/shared-ui';

import { api } from '../lib/api';

export default function Reports() {
  const [data, setData] = useState<any>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    api
      .get<any>(`/supplier/reports/sales?${params}`)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((e: any) => {
        setError(e.message ?? 'Ошибка загрузки отчёта');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Отчёт о продажах"
        actions={
          <a
            href={`/api/v1/supplier/reports/sales/export?from=${from}&to=${to}`}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
          >
            <Download className="h-4 w-4" /> Скачать CSV
          </a>
        }
      />

      <SectionCard>
        <div className="flex items-end gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">От</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">До</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <button
          onClick={load}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Загрузка...' : 'Применить'}
        </button>
      </div>
      </SectionCard>

      {error && <ErrorState title="Ошибка загрузки отчёта" description={error} />}

      {loading && !data && <LoadingState label="Загружаем отчёт о продажах..." />}

      {data?.summary && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Заказов', value: data.summary.totalOrders },
            { label: 'Оборот', value: `${(data.summary.grossRevenue / 100).toLocaleString('ru')} руб` },
            { label: 'Комиссия', value: `${(data.summary.platformFee / 100).toLocaleString('ru')} руб` },
            { label: 'Ваш доход', value: `${(data.summary.netRevenue / 100).toLocaleString('ru')} руб` },
          ].map((c) => (
            <SectionCard key={c.label}>
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className="text-xl font-bold mt-1">{c.value}</p>
            </SectionCard>
          ))}
        </div>
      )}

      <SectionCard>
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Дата</th>
              <th className="text-left px-4 py-3 font-medium">Заказ</th>
              <th className="text-left px-4 py-3 font-medium">Клиент</th>
              <th className="text-right px-4 py-3 font-medium">Сумма</th>
              <th className="text-right px-4 py-3 font-medium">Комиссия</th>
              <th className="text-right px-4 py-3 font-medium">Доход</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.items?.map((item: any) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{item.date ? new Date(item.date).toLocaleDateString('ru') : '-'}</td>
                <td className="px-4 py-3 font-mono text-xs">{item.shortCode}</td>
                <td className="px-4 py-3">{item.customerName || '-'}</td>
                <td className="px-4 py-3 text-right">{((item.grossAmount || 0) / 100).toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-red-500">-{((item.platformFee || 0) / 100).toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-green-600">{((item.supplierAmount || 0) / 100).toFixed(2)}</td>
              </tr>
            ))}
            {(!data?.items || data.items.length === 0) && !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  <EmptyState title="Нет данных" description="За выбранный период продаж не найдено." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
