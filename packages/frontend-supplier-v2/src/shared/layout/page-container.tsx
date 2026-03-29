import type { HTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

/** Отступы контента как в admin-v2 ListPageLayout / PageContainer */
export function PageContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mx-auto w-full max-w-content px-6 pb-16 pt-8 sm:px-8 sm:pb-20 sm:pt-10', className)}
      {...props}
    />
  );
}
