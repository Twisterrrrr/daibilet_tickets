import { cn } from '@/shared/lib/cn';
import type { ReactNode } from 'react';

export function DataTableShell({
  toolbar,
  footer,
  children,
  className,
}: {
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {toolbar}
      <div className="rounded-lg border bg-card">{children}</div>
      {footer}
    </div>
  );
}

