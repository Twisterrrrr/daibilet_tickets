'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { CatalogItem } from '@daibilet/shared';

export interface UseCatalogParams {
  category?: string;
  city?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface UseCatalogResult {
  items: CatalogItem[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCatalog(params: UseCatalogParams): UseCatalogResult {
  const { category, city, sort = 'popular', page = 1, limit = 20 } = params;

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = useCallback(() => {
    setLoading(true);
    setError(null);
    const query: Record<string, string | number> = { page, limit, sort };
    if (category) query.category = category;
    if (city) query.city = city;

    api
      .getCatalog(query)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages ?? Math.ceil(res.total / limit));
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
        setItems([]);
        setTotal(0);
        setTotalPages(0);
      })
      .finally(() => setLoading(false));
  }, [category, city, sort, page, limit]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  return { items, total, page, totalPages, loading, error, refetch: fetchCatalog };
}
