import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';

import { api } from '../lib/api';

export default function Reports() {
  const [data, setData] = useState<any>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = () => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    api.get<any>(`/supplier/reports/sales?${params}`).then(setData);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Отчёт о продажах</h1>
        <a
          href={`/api/v1/supplier/reports/sales/export?from=${from}&to=${to}`}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
        >
          <Download className="h-4 w-4" /> Скачать CSV
        </a>
      </div>

      <div className="flex gap-4 items-end">
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
        <button onClick={load} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          Применить
        </button>
      </div>

      {data?.summary && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Заказов', value: data.summary.totalOrders },
            { label: 'Оборот', value: `${(data.summary.grossRevenue / 100).toLocaleString('ru')} руб` },
            { label: 'Комиссия', value: `${(data.summary.platformFee / 100).toLocaleString('ru')} руб` },
            { label: 'Ваш доход', value: `${(data.summary.netRevenue / 100).toLocaleString('ru')} руб` },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className="text-xl font-bold mt-1">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
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
            {(!data?.items || data.items.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Нет данных
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
