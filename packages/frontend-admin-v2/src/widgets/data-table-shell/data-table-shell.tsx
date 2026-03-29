import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

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
      {children}
      {footer}
    </div>
  );
}
