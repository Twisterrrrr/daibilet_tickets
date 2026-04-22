import { cn } from '@/shared/lib/cn';
import type { ReactNode } from 'react';

export function SummaryStrip({
  items,
  className,
}: {
  items: { label: string; value: ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border bg-card px-4 py-3', className)}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.label} className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground">{i.label}</div>
            <div className="mt-0.5 truncate text-sm">{i.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

