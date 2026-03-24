import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Standard content width and padding for backoffice pages.
 */
export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={clsx('mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 lg:px-6 lg:py-5', className)}>
      {children}
    </div>
  );
}

