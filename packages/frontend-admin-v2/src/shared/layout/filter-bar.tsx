import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-card border border-border-soft bg-surface px-4 py-4 sm:flex-row sm:flex-wrap sm:items-end',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-[140px] flex-1 flex-col gap-1.5 sm:max-w-[220px]">
      <span className="text-label text-text-muted">{label}</span>
      {children}
    </label>
  );
}
