import { AlertCircle, Calendar, CheckCircle, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ErrorState, LoadingState, PageHeader, SectionCard } from '@daibilet/shared-ui';

import { api } from '../lib/api';

interface DashboardData {
  operator: { name: string; trustLevel: number; commissionRate: string; successfulSales: number };
  events: { total: number; active: number; pending: number };
  offers: { total: number };
  sales: { totalOrders: number; grossRevenue: number; platformFee: number; netRevenue: number };
}

const TRUST_LABELS: Record<number, string> = {
  0: 'Новый (модерация)',
  1: 'Проверенный (авто)',
  2: 'Доверенный',
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardData>('/supplier/dashboard')
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((e: any) => {
        setError(e.message ?? 'Ошибка загрузки');
      });
  }, []);

  if (error && !data) {
    return <ErrorState title="Не удалось загрузить дашборд" description={error} />;
  }

  useEffect(() => {
    if (!data && !error) {
      // initial load
    }
  }, [data, error]);

  if (!data && !error) {
    return <LoadingState label="Загружаем статистику по продажам..." />;
  }

  if (!data) return null;

  const cards = [
    { label: 'Активных событий', value: data.events.active, icon: Calendar, color: 'text-blue-600' },
    { label: 'На модерации', value: data.events.pending, icon: AlertCircle, color: 'text-orange-500' },
    { label: 'Продаж', value: data.sales.totalOrders, icon: CheckCircle, color: 'text-green-600' },
    {
      label: 'Доход (руб)',
      value: (data.sales.netRevenue / 100).toLocaleString('ru'),
      icon: TrendingUp,
      color: 'text-emerald-600',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.operator.name}
        subtitle={
          <span className="text-sm text-gray-500">
            Trust Level: {data.operator.trustLevel} ({TRUST_LABELS[data.operator.trustLevel] || '?'}) · Комиссия{' '}
            {(Number(data.operator.commissionRate) * 100).toFixed(0)}%
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <SectionCard key={c.label}>
            <div className="mb-2 flex items-center gap-2">
              <c.icon className={`h-4 w-4 ${c.color}`} />
              <span className="text-xs text-gray-500">{c.label}</span>
            </div>
            <p className="text-2xl font-bold">{c.value}</p>
          </SectionCard>
        ))}
      </div>

      <SectionCard title="Финансовая сводка">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-sm text-gray-500">Оборот</p>
            <p className="text-xl font-bold">{(data.sales.grossRevenue / 100).toLocaleString('ru')} руб</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Комиссия платформы</p>
            <p className="text-xl font-bold text-red-500">-{(data.sales.platformFee / 100).toLocaleString('ru')} руб</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Ваш доход</p>
            <p className="text-xl font-bold text-green-600">{(data.sales.netRevenue / 100).toLocaleString('ru')} руб</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
