'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function MuseumsSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [qLocal, setQLocal] = useState(sp.get('q') ?? '');

  function updateUrl(updates: Record<string, string | null>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (!v) next.delete(k);
      else next.set(k, v);
    }
    next.delete('page');
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="flex gap-2">
      <input
        value={qLocal}
        onChange={(e) => setQLocal(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && updateUrl({ q: qLocal.trim() || null })}
        placeholder="Поиск по названию или метро"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary-400"
        aria-label="Поиск"
      />
      <button
        onClick={() => updateUrl({ q: qLocal.trim() || null })}
        className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
      >
        Найти
      </button>
    </div>
  );
}
