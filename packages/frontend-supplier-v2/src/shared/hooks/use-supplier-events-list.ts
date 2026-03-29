import { useCallback, useEffect, useState } from 'react';

import { SUPPLIER_API } from '@/shared/domain/supplier-scope';
import { api } from '@/shared/lib/api';

export interface SupplierEventRow {
  id: string;
  title?: string;
  slug?: string;
  imageUrl?: string | null;
  moderationStatus: string;
  moderationNote?: string | null;
  rating?: number | null;
  reviewCount?: number;
  city?: { name?: string } | null;
  _count?: { offers?: number; reviews?: number };
}

export function useSupplierEventsList(statusFilter: string) {
  const [items, setItems] = useState<SupplierEventRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    const q = statusFilter !== 'all' ? `?status=${encodeURIComponent(statusFilter)}` : '';
    api
      .get<{ items: SupplierEventRow[]; total: number }>(`${SUPPLIER_API.events}${q}`)
      .then((res) => {
        setItems(res.items || []);
        setTotal(res.total ?? 0);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить события');
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    reload();
  }, [reload]);

  const removeEvent = useCallback(
    async (id: string) => {
      await api.del(SUPPLIER_API.event(id));
      reload();
    },
    [reload],
  );

  return { items, total, loading, error, reload, removeEvent };
}

export function useSupplierTrustLimit() {
  const [trust, setTrust] = useState<{
    activeEventsCount: number;
    activeEventsLimit: number;
  } | null>(null);

  useEffect(() => {
    api
      .get<{ trust?: { activeEventsCount: number; activeEventsLimit: number } }>(SUPPLIER_API.dashboard)
      .then((res) => {
        const t = res.trust;
        if (t && typeof t.activeEventsCount === 'number' && typeof t.activeEventsLimit === 'number') {
          setTrust({ activeEventsCount: t.activeEventsCount, activeEventsLimit: t.activeEventsLimit });
        } else setTrust(null);
      })
      .catch(() => setTrust(null));
  }, []);

  return trust;
}
