import { useCallback, useEffect, useState } from 'react';

import { SUPPLIER_API } from '@/shared/domain/supplier-scope';
import { api } from '@/shared/lib/api';

export interface SupplierDashboardData {
  operator: { name: string; trustLevel: number; commissionRate: string; successfulSales: number };
  events: { total: number; active: number; pending: number };
  offers: { total: number };
  sales: { totalOrders: number; grossRevenue: number; platformFee: number; netRevenue: number };
  trust?: {
    score: number;
    level: number;
    activeEventsLimit: number;
    activeEventsCount: number;
    nextLevelRequirements: { code: string; message: string }[];
    nextStepRecommendation?: string | null;
  };
  attention?: {
    eventsWithoutSchedule: number;
    eventsWithoutPhoto: number;
    reviewsWithoutResponse: number;
  };
}

export function useSupplierDashboard() {
  const [data, setData] = useState<SupplierDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<SupplierDashboardData>(SUPPLIER_API.dashboard)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, loading, reload: load };
}
