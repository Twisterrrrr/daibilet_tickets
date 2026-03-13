import { useCallback, useEffect, useState } from 'react';

import { EmptyState, ErrorState, LoadingState, PageHeader, SectionCard } from '@daibilet/shared-ui';

import { api } from '../lib/api';

type SupplierOrderStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'EXPIRED';

interface SupplierOrder {
  id: string;
  status: SupplierOrderStatus;
  shortCode: string | null;
  eventId: string;
  eventTitle: string | null;
  eventSlug: string | null;
  quantity: number;
  priceSnapshot: number;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  slaMinutes: number;
  expiresAt: string | null;
  createdAt: string;
  confirmedAt?: string | null;
}

interface OrdersResponse {
  items: SupplierOrder[];
  total: number;
  page: number;
  pages: number;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatMoneyKopecks(value: number | null | undefined): string {
  if (!value) return '';
  return (value / 100).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 });
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchOrders = useCallback(
    async (nextPage?: number) => {
      const targetPage = nextPage ?? page;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (status !== 'all') params.set('status', status);
        params.set('page', String(targetPage));
        params.set('limit', '25');
        const res = await api.get<OrdersResponse>(`/supplier/orders?${params.toString()}`);
        setOrders(res.items);
        setTotal(res.total);
        setPage(res.page);
        setPages(res.pages || 1);
      } catch (e) {
        setOrders([]);
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    },
    [page, status],
  );

  useEffect(() => {
    fetchOrders(1);
  }, [status]);

  const handleConfirm = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.post(`/supplier/orders/${id}/confirm`, {});
      await fetchOrders();
    } catch {
      // Ошибка уже покажется в toast наверху (через обёртку fetch), здесь проглатываем
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Причина отклонения заявки?') || undefined;
    setActionLoadingId(id);
    try {
      await api.post(`/supplier/orders/${id}/reject`, { reason });
      await fetchOrders();
    } catch {
      // игнор
    } finally {
      setActionLoadingId(null);
    }
  };

  const hasData = orders.length > 0;

  return (
    <div className="space-y-4">
      <PageHeader title="Заказы" subtitle={`Заявки на бронирование: ${total}`} />

      {error && (
        <ErrorState
          title="Ошибка загрузки"
          description={error}
          action={
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => fetchOrders()}
            >
              Повторить
            </button>
          }
        />
      )}

      <SectionCard
        title="Фильтры"
      >
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 rounded-md border px-3 text-sm"
          >
            <option value="all">Все статусы</option>
            <option value="PENDING">В ожидании</option>
            <option value="CONFIRMED">Подтверждён</option>
            <option value="REJECTED">Отклонён</option>
            <option value="EXPIRED">Истёк</option>
          </select>
        </div>
      </SectionCard>

      <SectionCard title="Заявки">
        {loading && !hasData ? (
          <LoadingState label="Загружаем заказы..." />
        ) : !hasData ? (
          <EmptyState title="Заявок пока нет" description="Когда появятся новые заявки, они появятся здесь." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-slate-500">
                  <th className="px-2 py-2 text-left">Код</th>
                  <th className="px-2 py-2 text-left">Событие</th>
                  <th className="px-2 py-2 text-left">Клиент</th>
                  <th className="px-2 py-2 text-left">Кол-во</th>
                  <th className="px-2 py-2 text-left">Статус</th>
                  <th className="px-2 py-2 text-left">Создана</th>
                  <th className="px-2 py-2 text-left">SLA / истекает</th>
                  <th className="px-2 py-2 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="px-2 py-2 align-top font-mono text-xs text-slate-600">{o.shortCode || '—'}</td>
                    <td className="px-2 py-2 align-top">
                      <div className="max-w-[260px] truncate text-sm text-slate-900">{o.eventTitle || 'Событие'}</div>
                    </td>
                    <td className="px-2 py-2 align-top text-xs text-slate-700">
                      <div>{o.customerName || '—'}</div>
                      <div className="text-slate-500">{o.customerEmail || ''}</div>
                    </td>
                    <td className="px-2 py-2 align-top text-sm">{o.quantity}</td>
                    <td className="px-2 py-2 align-top text-xs">
                      {o.status === 'PENDING' && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">В ожидании</span>}
                      {o.status === 'CONFIRMED' && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">Подтверждён</span>}
                      {o.status === 'REJECTED' && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-700">Отклонён</span>}
                      {o.status === 'EXPIRED' && <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">Истёк</span>}
                    </td>
                    <td className="px-2 py-2 align-top text-xs text-slate-600">{formatDate(o.createdAt)}</td>
                    <td className="px-2 py-2 align-top text-xs text-slate-600">
                      {o.slaMinutes ? `${o.slaMinutes} мин` : ''}
                      {o.expiresAt && (
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          до {formatDate(o.expiresAt)}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 align-top text-right text-xs">
                      {o.status === 'PENDING' ? (
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            disabled={actionLoadingId === o.id}
                            onClick={() => handleConfirm(o.id)}
                            className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50"
                          >
                            Подтвердить
                          </button>
                          <button
                            type="button"
                            disabled={actionLoadingId === o.id}
                            onClick={() => handleReject(o.id)}
                            className="rounded-md bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 disabled:opacity-50"
                          >
                            Отклонить
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => fetchOrders(page - 1)}
              className="rounded-md border px-2 py-1 disabled:opacity-50"
            >
              Назад
            </button>
            <span>
              Стр. {page} из {pages}
            </span>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => fetchOrders(page + 1)}
              className="rounded-md border px-2 py-1 disabled:opacity-50"
            >
              Далее
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

