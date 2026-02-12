import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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

type PackageItemStatus = 'PENDING' | 'BOOKED' | 'CONFIRMED' | 'FAILED' | 'REFUNDED';

interface PackageItem {
  id: string;
  dayNumber: number;
  slot: string;
  slotTime: string;
  adultTickets: number;
  childTickets: number;
  subtotal: number;
  tcOrderId: string | null;
  status: PackageItemStatus;
  event: { id: string; title: string; slug: string };
  session: { id: string; startsAt: string };
}

interface Voucher {
  id: string;
  shortCode: string;
  publicUrl: string;
}

interface OrderDetail {
  id: string;
  code: string;
  email: string;
  phone: string | null;
  customerName: string;
  cityId: string;
  dateFrom: string;
  dateTo: string;
  adults: number;
  children: number;
  intensity: string;
  variantName: string | null;
  totalPrice: number;
  serviceFee: number;
  status: OrderStatus;
  paymentId: string | null;
  paidAt: string | null;
  city: { id: string; name: string; slug: string };
  items: PackageItem[];
  voucher: Voucher | null;
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

const ITEM_STATUS_BADGE: Record<PackageItemStatus, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'orange'> = {
  PENDING: 'default',
  BOOKED: 'info',
  CONFIRMED: 'success',
  FAILED: 'danger',
  REFUNDED: 'orange',
};

// Безопасные переходы статуса из бэкенда
const SAFE_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ['PENDING_PAYMENT'],
  PENDING_PAYMENT: ['PAID', 'FAILED'],
  PAID: ['FULFILLING', 'REFUNDED'],
  FULFILLING: ['FULFILLED', 'PARTIALLY_FULFILLED', 'FAILED'],
  FULFILLED: [],
  PARTIALLY_FULFILLED: [],
  FAILED: ['REFUNDED'],
  REFUNDED: [],
};

function formatPrice(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
  }).format(kopecks / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: 'Черновик',
  PENDING_PAYMENT: 'Ожидает оплаты',
  PAID: 'Оплачен',
  FULFILLING: 'В исполнении',
  FULFILLED: 'Исполнен',
  PARTIALLY_FULFILLED: 'Частично исполнен',
  FAILED: 'Ошибка',
  REFUNDED: 'Возврат',
};

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    adminApi
      .get<OrderDetail>(`/admin/orders/${id}`)
      .then(setOrder)
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleStatusChange = (newStatus: OrderStatus) => {
    if (!id || !order) return;
    setUpdating(true);
    setError(null);
    adminApi
      .put<OrderDetail | { error: string }>(`/admin/orders/${id}/status`, { status: newStatus })
      .then((res) => {
        if ('error' in res) {
          setError(res.error);
        } else {
          setOrder(res);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка смены статуса'))
      .finally(() => setUpdating(false));
  };

  const itemColumns = [
    {
      key: 'event.title',
      label: 'Событие',
      render: (item: PackageItem) => item.event?.title ?? '—',
    },
    {
      key: 'session.startsAt',
      label: 'Начало',
      render: (item: PackageItem) =>
        item.session?.startsAt ? formatDateTime(item.session.startsAt) : '—',
    },
    { key: 'dayNumber', label: 'День' },
    { key: 'slot', label: 'Слот' },
    { key: 'adultTickets', label: 'Взрослых' },
    { key: 'childTickets', label: 'Детей' },
    {
      key: 'subtotal',
      label: 'Сумма',
      render: (item: PackageItem) => formatPrice(item.subtotal),
    },
    { key: 'tcOrderId', label: 'TC Order' },
    {
      key: 'status',
      label: 'Статус',
      render: (item: PackageItem) => (
        <Badge variant={ITEM_STATUS_BADGE[item.status]}>{item.status}</Badge>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-gray-400">Загрузка...</div>
    );
  }
  if (!order) {
    return (
      <div>
        <Link
          to="/orders"
          className="mb-4 inline-block rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          ← Назад
        </Link>
        <div className="rounded-lg bg-red-50 p-4 text-red-700">{error || 'Заказ не найден'}</div>
      </div>
    );
  }

  const allowedTransitions = SAFE_TRANSITIONS[order.status] ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link
          to="/orders"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          ← Назад
        </Link>
        <h1 className="text-xl font-bold text-gray-900">
          Заказ {order.code}
        </h1>
        <Badge variant={STATUS_BADGE[order.status]}>{STATUS_LABELS[order.status]}</Badge>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Информация о заказе</h2>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs text-gray-500">Клиент</dt>
              <dd className="font-medium">{order.customerName}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Email</dt>
              <dd className="font-medium">{order.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Телефон</dt>
              <dd className="font-medium">{order.phone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Город</dt>
              <dd className="font-medium">{order.city?.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Даты</dt>
              <dd className="font-medium">
                {formatDate(order.dateFrom)} — {formatDate(order.dateTo)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Взрослых / Детей</dt>
              <dd className="font-medium">
                {order.adults} / {order.children}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Интенсивность</dt>
              <dd className="font-medium">{order.intensity}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Вариант</dt>
              <dd className="font-medium">{order.variantName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Итого</dt>
              <dd className="font-medium">{formatPrice(order.totalPrice)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Сервисный сбор</dt>
              <dd className="font-medium">{formatPrice(order.serviceFee)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Payment ID</dt>
              <dd className="font-mono text-sm">{order.paymentId ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Оплачен</dt>
              <dd className="font-medium">
                {order.paidAt ? formatDateTime(order.paidAt) : '—'}
              </dd>
            </div>
          </dl>

          {allowedTransitions.length > 0 && (
            <div className="mt-4 flex gap-2">
              {allowedTransitions.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={updating}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  → {STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          )}
        </div>

        {order.items && order.items.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-700">Позиции</h2>
            <DataTable
              columns={itemColumns}
              data={order.items}
              emptyText="Нет позиций"
            />
          </div>
        )}

        {order.voucher && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Ваучер</h2>
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-gray-500">Код</dt>
                <dd className="font-mono">{order.voucher.shortCode}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Ссылка</dt>
                <dd>
                  <a
                    href={order.voucher.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 underline hover:text-primary-700"
                  >
                    {order.voucher.publicUrl}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
