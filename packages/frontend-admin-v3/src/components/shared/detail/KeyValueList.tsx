import { cn } from '@/shared/lib/cn';
import type { ReactNode } from 'react';

export function KeyValueList({
  rows,
  className,
}: {
  rows: { key: string; value: ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn('space-y-3', className)}>
      {rows.map((r) => (
        <div key={r.key}>
          <dt className="text-xs font-medium text-muted-foreground">{r.key}</dt>
          <dd className="mt-0.5 text-sm">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

