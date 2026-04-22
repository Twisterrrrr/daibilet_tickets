import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import * as React from 'react';

export function useListPageState({ searchDebounceMs = 250 }: { searchDebounceMs?: number } = {}) {
  const { params, patch } = useQueryFilters();
  const [qInput, setQInput] = React.useState<string>(params.q);
  const debouncedQ = useDebouncedValue(qInput, searchDebounceMs);

  // URL -> input hydration (back/forward friendly)
  React.useEffect(() => {
    setQInput(params.q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.q]);

  // input (debounced) -> URL (replace)
  React.useEffect(() => {
    if (debouncedQ === params.q) return;
    patch({ q: debouncedQ, page: 1 }, { history: 'replace' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  return {
    q: qInput,
    debouncedQ,
    page: params.page,
    pageSize: params.pageSize,
    sort: params.sort,
    order: params.order,
    city: params.city,
    category: params.category,
    status: params.status,
    setQ: (q: string) => setQInput(q),
    setPage: (page: number) => patch({ page }, { history: 'push' }),
    setPageReplace: (page: number) => patch({ page }, { history: 'replace' }),
    setPageSize: (pageSize: number) => patch({ pageSize, page: 1 }, { history: 'push' }),
    setPageSizeReplace: (pageSize: number) => patch({ pageSize, page: 1 }, { history: 'replace' }),
    setSort: (sort: string) => patch({ sort, page: 1 }, { history: 'replace' }),
    setOrder: (order: 'asc' | 'desc') => patch({ order, page: 1 }, { history: 'replace' }),
    setCity: (city: string) => patch({ city, page: 1 }),
    setCategory: (category: string) => patch({ category, page: 1 }),
    setStatus: (status: string) => patch({ status, page: 1 }),
    reset: () => {
      setQInput('');
      patch({ q: '', page: 1, pageSize: 25, sort: '', order: 'desc', city: '', category: '', status: '' });
    },
  };
}

