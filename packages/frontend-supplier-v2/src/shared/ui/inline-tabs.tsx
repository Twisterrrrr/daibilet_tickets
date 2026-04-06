import type { ReactNode } from 'react';
import { useState } from 'react';

import { cn } from '@/shared/lib/cn';

export interface InlineTabItem {
  id: string;
  label: string;
  content: ReactNode;
}

/** Простые вкладки без Radix — визуально близко к admin-v2 DetailTabs. */
export function InlineTabs({ items, defaultId }: { items: InlineTabItem[]; defaultId?: string }) {
  const first = items[0]?.id ?? '';
  const [active, setActive] = useState(defaultId ?? first);

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        className="flex w-full gap-1 overflow-x-auto border-b border-border-soft pb-px"
        aria-label="Разделы"
      >
        {items.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              'shrink-0 rounded-t-control border border-b-0 px-3 py-2 text-[13px] font-medium transition-colors',
              active === t.id
                ? 'border-border-soft bg-surface text-text-primary'
                : 'border-transparent text-text-muted hover:bg-surface-alt hover:text-text-secondary',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="min-h-[120px]">
        {items.find((t) => t.id === active)?.content ?? null}
      </div>
    </div>
  );
}
