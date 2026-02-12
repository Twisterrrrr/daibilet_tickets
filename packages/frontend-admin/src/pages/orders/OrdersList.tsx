import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/client';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';

type OrderStatus =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'FULFILLING'
  | 'FULFILLED'
  | 'PARTIALLY_FULFILLED'
  | 'FAILED'
  | 'REFUNDED';

interface OrderItem {
  id: string;
  code: string;
  customerName: string;
  email: string;
  totalPrice: number;
  status: OrderStatus;
  createdAt: string;
  city?: { slug: string; name: string };
}

interface OrdersResponse {
  items: OrderItem[];
  total: number;
  page: number;
  pages: number;
}

const STATUS_BADGE: Record<OrderStatus, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'orange'> = {
  DRAFT: 'default',
  PENDING_PAYMENT: 'warning',
  PAID: 'success',
  FULFILLING: 'info',
  FULFILLED: 'success',
  PARTIALLY_FULFILLED: 'info',
  FAILED: 'danger',
  REFUNDED: 'orange',
};

function formatPrice(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
  }).format(kopecks / 100);
}

export function OrdersListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    status: '',
    city: '',
    search: '',
    page: 1,
    limit: 20,
  });

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.city) params.set('city', filters.city);
    if (filters.search) params.set('search', filters.search);
    params.set('page', String(filters.page));
    params.set('limit', String(filters.limit));

    adminApi
      .get<OrdersResponse>(`/admin/orders?${params.toString()}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [filters]);

  const handleRowClick = (item: OrderItem) => {
    navigate(`/orders/${item.id}`);
  };

  const columns = [
    { key: 'code', label: 'Код' },
    { key: 'customerName', label: 'Клиент' },
    { key: 'email', label: 'Email' },
    {
      key: 'city.name',
      label: 'Город',
      render: (item: OrderItem) => item.city?.name ?? '—',
    },
    {
      key: 'status',
      label: 'Статус',
      render: (item: OrderItem) => (
        <Badge variant={STATUS_BADGE[item.status]}>{item.status}</Badge>
      ),
    },
    {
      key: 'totalPrice',
      label: 'Сумма',
      render: (item: OrderItem) => formatPrice(item.totalPrice),
    },
    {
      key: 'createdAt',
      label: 'Создан',
      render: (item: OrderItem) =>
        item.createdAt
          ? new Date(item.createdAt).toLocaleString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '—',
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Заказы</h1>

      <div className="mb-4 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="Поиск (код, email, имя)..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">Все статусы</option>
          <option value="DRAFT">DRAFT</option>
          <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
          <option value="PAID">PAID</option>
          <option value="FULFILLING">FULFILLING</option>
          <option value="FULFILLED">FULFILLED</option>
          <option value="PARTIALLY_FULFILLED">PARTIALLY_FULFILLED</option>
          <option value="FAILED">FAILED</option>
          <option value="REFUNDED">REFUNDED</option>
        </select>
        <select
          value={filters.city}
          onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value, page: 1 }))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">Все города</option>
          <option value="moscow">Москва</option>
          <option value="spb">Санкт-Петербург</option>
          <option value="kazan">Казань</option>
          <option value="kaliningrad">Калининград</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        onRowClick={handleRowClick}
        loading={loading}
        emptyText="Нет заказов"
      />

      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Показано {data.items.length} из {data.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              disabled={filters.page <= 1}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Назад
            </button>
            <span className="flex items-center px-2 text-sm text-gray-600">
              {filters.page} / {data.pages}
            </span>
            <button
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              disabled={filters.page >= data.pages}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Вперёд
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
