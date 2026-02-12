import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/client';

interface Upsell {
  id: string;
  title: string;
  description?: string;
  priceKopecks: number;
  category: string;
  citySlug?: string;
  icon?: string;
  isActive: boolean;
  sortOrder: number;
}

export function UpsellsListPage() {
  const [items, setItems] = useState<Upsell[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.get<Upsell[]>('/admin/upsells').then(setItems).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400">Загрузка...</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Upsells</h1>
        <Link
          to="/upsells/new"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          + Добавить
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Icon</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Название</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Категория</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Город</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Цена</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Статус</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {items.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-lg">{u.icon || '-'}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.title}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{u.category}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{u.citySlug || 'Все'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {(u.priceKopecks / 100).toLocaleString('ru-RU')} ₽
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                    {u.isActive ? 'Активен' : 'Выкл'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link to={`/upsells/${u.id}`} className="text-sm text-primary-600 hover:text-primary-700">
                    Ред.
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
