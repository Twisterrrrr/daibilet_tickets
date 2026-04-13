import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export type UrlListParams = {
  q: string;
  page: number;
  pageSize: number;
  sort: string; // `field:asc|desc`
  city: string;
  category: string;
  status: string;
};

const DEFAULTS: UrlListParams = { q: '', page: 1, pageSize: 25, sort: '', city: '', category: '', status: '' };

function readInt(v: string | null, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function useQueryFilters() {
  const [sp, setSp] = useSearchParams();

  const params = useMemo<UrlListParams>(() => {
    return {
      q: sp.get('q') ?? DEFAULTS.q,
      page: readInt(sp.get('page'), DEFAULTS.page),
      pageSize: readInt(sp.get('pageSize'), DEFAULTS.pageSize),
      sort: sp.get('sort') ?? DEFAULTS.sort,
      city: sp.get('city') ?? DEFAULTS.city,
      category: sp.get('category') ?? DEFAULTS.category,
      status: sp.get('status') ?? DEFAULTS.status,
    };
  }, [sp]);

  function patch(next: Partial<UrlListParams>) {
    const merged: UrlListParams = { ...params, ...next };
    const out = new URLSearchParams(sp);
    out.set('q', merged.q);
    out.set('page', String(merged.page));
    out.set('pageSize', String(merged.pageSize));
    if (merged.sort) out.set('sort', merged.sort);
    else out.delete('sort');
    if (merged.city) out.set('city', merged.city);
    else out.delete('city');
    if (merged.category) out.set('category', merged.category);
    else out.delete('category');
    if (merged.status) out.set('status', merged.status);
    else out.delete('status');
    setSp(out, { replace: true });
  }

  return { params, patch };
}

