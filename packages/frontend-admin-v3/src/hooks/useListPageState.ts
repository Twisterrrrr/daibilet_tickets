import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useQueryFilters } from '@/hooks/useQueryFilters';

export function useListPageState({ searchDebounceMs = 250 }: { searchDebounceMs?: number } = {}) {
  const { params, patch } = useQueryFilters();
  const debouncedQ = useDebouncedValue(params.q, searchDebounceMs);

  return {
    q: params.q,
    debouncedQ,
    page: params.page,
    pageSize: params.pageSize,
    sort: params.sort,
    city: params.city,
    category: params.category,
    status: params.status,
    setQ: (q: string) => patch({ q, page: 1 }),
    setPage: (page: number) => patch({ page }),
    setPageSize: (pageSize: number) => patch({ pageSize, page: 1 }),
    setSort: (sort: string) => patch({ sort, page: 1 }),
    setCity: (city: string) => patch({ city, page: 1 }),
    setCategory: (category: string) => patch({ category, page: 1 }),
    setStatus: (status: string) => patch({ status, page: 1 }),
    reset: () => patch({ q: '', page: 1, pageSize: 25, sort: '', city: '', category: '', status: '' }),
  };
}

