import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export type UrlListParams = {
  q: string;
  page: number;
  pageSize: number;
  sort: string;
  order: 'asc' | 'desc';
  city: string;
  category: string;
  status: string;
};

const DEFAULTS: UrlListParams = {
  q: '',
  page: 1,
  pageSize: 25,
  sort: '',
  order: 'desc',
  city: '',
  category: '',
  status: '',
};

function readInt(v: string | null, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function getWithAliases(sp: URLSearchParams, key: keyof UrlListParams): string | null {
  const direct = sp.get(key);
  if (direct != null) return direct;
  if (key === 'q') return sp.get('search');
  if (key === 'page') return sp.get('p');
  if (key === 'pageSize') return sp.get('perPage');
  if (key === 'sort') return sp.get('orderBy');
  if (key === 'order') return sp.get('direction');
  return null;
}

function parseSortAndOrder(sp: URLSearchParams): { sort: string; order: 'asc' | 'desc' } {
  const sortRaw = getWithAliases(sp, 'sort');
  const orderRaw = getWithAliases(sp, 'order');

  // Legacy: sort="field:asc|desc"
  if (sortRaw && sortRaw.includes(':') && !orderRaw) {
    const [field, dir] = sortRaw.split(':', 2);
    return { sort: field ?? '', order: dir === 'asc' || dir === 'desc' ? dir : DEFAULTS.order };
  }

  return { sort: sortRaw ?? DEFAULTS.sort, order: orderRaw === 'asc' || orderRaw === 'desc' ? orderRaw : DEFAULTS.order };
}

export function useQueryFilters() {
  const [sp, setSp] = useSearchParams();

  const params = useMemo<UrlListParams>(() => {
    const so = parseSortAndOrder(sp);
    return {
      q: getWithAliases(sp, 'q') ?? DEFAULTS.q,
      page: readInt(getWithAliases(sp, 'page'), DEFAULTS.page),
      pageSize: readInt(getWithAliases(sp, 'pageSize'), DEFAULTS.pageSize),
      sort: so.sort,
      order: so.order,
      city: sp.get('city') ?? DEFAULTS.city,
      category: sp.get('category') ?? DEFAULTS.category,
      status: sp.get('status') ?? DEFAULTS.status,
    };
  }, [sp]);

  function patch(next: Partial<UrlListParams>, opts?: { history?: 'replace' | 'push' }) {
    const merged: UrlListParams = { ...params, ...next };
    const out = new URLSearchParams(sp);
    if (merged.q) out.set('q', merged.q);
    else out.delete('q');
    if (merged.page !== DEFAULTS.page) out.set('page', String(merged.page));
    else out.delete('page');
    if (merged.pageSize !== DEFAULTS.pageSize) out.set('pageSize', String(merged.pageSize));
    else out.delete('pageSize');
    if (merged.sort) out.set('sort', merged.sort);
    else out.delete('sort');
    if (merged.order !== DEFAULTS.order) out.set('order', merged.order);
    else out.delete('order');
    if (merged.city) out.set('city', merged.city);
    else out.delete('city');
    if (merged.category) out.set('category', merged.category);
    else out.delete('category');
    if (merged.status) out.set('status', merged.status);
    else out.delete('status');
    if (out.toString() === sp.toString()) return;
    setSp(out, { replace: (opts?.history ?? 'replace') === 'replace' });
  }

  return { params, patch };
}

