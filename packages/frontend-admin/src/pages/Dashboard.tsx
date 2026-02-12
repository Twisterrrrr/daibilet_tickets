import { useEffect, useState } from 'react';
import { adminApi } from '../api/client';

interface Stats {
  events: { total: number; active: number };
  cities: number;
  tags: number;
  articles: number;
  landings: number;
  combos: number;
  orders: { total: number; paid: number; recentWeek: number };
  revenue: { last30days: number };
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.get<Stats>('/admin/dashboard/stats').then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400">Загрузка...</div>;
  if (!stats) return <div className="text-red-500">Ошибка загрузки</div>;

  const revenue = (stats.revenue.last30days / 100).toLocaleString('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  });

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="События" value={stats.events.active} sub={`из ${stats.events.total} всего`} />
        <StatCard label="Города" value={stats.cities} />
        <StatCard label="Лендинги" value={stats.landings} />
        <StatCard label="Combo" value={stats.combos} />
        <StatCard label="Теги" value={stats.tags} />
        <StatCard label="Статьи" value={stats.articles} />
        <StatCard label="Заказы (7 дн)" value={stats.orders.recentWeek} sub={`всего: ${stats.orders.total}`} />
        <StatCard label="Выручка (30 дн)" value={revenue} sub={`оплачено: ${stats.orders.paid}`} />
      </div>
    </div>
  );
}
