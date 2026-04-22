import { readInt, readIntClamped, readSortAndOrder, readString } from './parse';
import { setOrDelete } from './serialize';
import type { HistoryMode, UrlStateConfig } from './types';

export type ListBaseState = {
  q: string;
  page: number;
  pageSize: number;
  sort: string;
  order: 'asc' | 'desc';
};

export function createListBaseConfig(args: {
  defaultPageSize: number;
  pageSizeClamp?: { min: number; max: number };
  allowedSort: readonly string[];
  defaults?: Partial<ListBaseState>;
}): UrlStateConfig<ListBaseState> {
  const defaults: ListBaseState = {
    q: '',
    page: 1,
    pageSize: args.defaultPageSize,
    sort: args.allowedSort[0] ?? 'updatedAt',
    order: 'desc',
    ...(args.defaults ?? {}),
  };

  return {
    defaults,
    parse: (sp) => {
      const q = readString(sp, 'q', defaults.q);
      const page = readInt(sp, 'page', defaults.page);
      const pageSize = args.pageSizeClamp
        ? readIntClamped(sp, 'pageSize', defaults.pageSize, args.pageSizeClamp)
        : readInt(sp, 'pageSize', defaults.pageSize);
      const { sort, order } = readSortAndOrder(sp, args.allowedSort, { sort: defaults.sort, order: defaults.order });
      return { q, page, pageSize, sort, order };
    },
    serialize: (state, sp) => {
      // q
      if (state.q && state.q.trim()) sp.set('q', state.q);
      else sp.delete('q');
      // page/pageSize
      if (state.page !== defaults.page) sp.set('page', String(state.page));
      else sp.delete('page');
      if (state.pageSize !== defaults.pageSize) sp.set('pageSize', String(state.pageSize));
      else sp.delete('pageSize');
      // sort/order
      if (state.sort && state.sort !== defaults.sort) sp.set('sort', state.sort);
      else sp.delete('sort');
      if (state.order !== defaults.order) sp.set('order', state.order);
      else sp.delete('order');
      return sp;
    },
  };
}

export function historyForPatchKeys(keys: string[]): HistoryMode {
  // Invariant: push only page/pageSize/tab; replace for everything else.
  return keys.every((k) => k === 'page' || k === 'pageSize' || k === 'tab') ? 'push' : 'replace';
}

export function omitEmptyToUndefined<T extends string>(v: T | ''): T | undefined {
  return v === '' ? undefined : (v as T);
}

export function writeOptionalString(sp: URLSearchParams, key: string, value: string | undefined, defaultValue?: string) {
  if (!value || value === '' || (defaultValue !== undefined && value === defaultValue)) sp.delete(key);
  else sp.set(key, value);
}

export { setOrDelete };

