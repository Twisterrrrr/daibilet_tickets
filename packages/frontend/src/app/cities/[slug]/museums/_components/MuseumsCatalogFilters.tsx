'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

const SORTS = [
  { id: 'popular', label: 'Популярные' },
  { id: 'rating', label: 'По рейтингу' },
  { id: 'price_asc', label: 'Сначала дешевле' },
  { id: 'price_desc', label: 'Сначала дороже' },
];

const QUICK = [
  { id: '', label: 'Все' },
  { id: 'center', label: 'В центре' },
  { id: 'kids', label: 'С детьми' },
  { id: 'short', label: 'До 1 часа' },
  { id: 'modern', label: 'Современное' },
  { id: 'free', label: 'Бесплатные' },
];

export function MuseumsCatalogFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const queryString = useMemo(() => sp.toString(), [sp]);

  const sort = sp.get('sort') ?? 'popular';
  const qf = sp.get('qf') ?? '';

  function updateUrl(updates: Record<string, string | null>) {
    const next = new URLSearchParams(queryString);
    for (const [k, v] of Object.entries(updates)) {
      if (!v) next.delete(k);
      else next.set(k, v);
    }
    next.delete('page');
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {QUICK.map((x) => {
          const active = (qf || '') === x.id;
          return (
            <button
              key={x.id || 'all'}
              onClick={() => updateUrl({ qf: x.id || null })}
              className={[
                'rounded-full px-3 py-1.5 text-sm transition-colors',
                active ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-800 hover:bg-slate-200',
              ].join(' ')}
              aria-pressed={active}
            >
              {x.label}
            </button>
          );
        })}
      </div>
      <select
        value={sort}
        onChange={(e) => updateUrl({ sort: e.target.value })}
        className="w-full max-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary-400"
        aria-label="Сортировка"
      >
        {SORTS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
