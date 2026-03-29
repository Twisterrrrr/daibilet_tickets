import { useCallback, useEffect, useState } from 'react';

import { SUPPLIER_API } from '@/shared/domain/supplier-scope';
import { api } from '@/shared/lib/api';

export type SupplierOrderStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'EXPIRED';

export interface SupplierOrderRow {
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
  hasActiveDispute?: boolean;
}

interface OrdersResponse {
  items: SupplierOrderRow[];
  total: number;
  page: number;
  pages: number;
}

export function useSupplierOrders(status: string) {
  const [orders, setOrders] = useState<SupplierOrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (status !== 'all') params.set('status', status);
        params.set('page', String(targetPage));
        params.set('limit', '25');
        const res = await api.get<OrdersResponse>(`${SUPPLIER_API.orders}?${params.toString()}`);
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
    [status],
  );

  useEffect(() => {
    setPage(1);
    void fetchPage(1);
  }, [status, fetchPage]);

  const goPage = useCallback(
    (next: number) => {
      void fetchPage(next);
    },
    [fetchPage],
  );

  const confirmOrder = useCallback(
    async (id: string) => {
      await api.post(SUPPLIER_API.orderConfirm(id), {});
      await fetchPage(page);
    },
    [fetchPage, page],
  );

  const rejectOrder = useCallback(
    async (id: string, reason?: string) => {
      await api.post(SUPPLIER_API.orderReject(id), { reason });
      await fetchPage(page);
    },
    [fetchPage, page],
  );

  return {
    orders,
    total,
    page,
    pages,
    loading,
    error,
    reload: () => fetchPage(page),
    goPage,
    confirmOrder,
    rejectOrder,
  };
}
