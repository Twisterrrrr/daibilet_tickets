import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/shared/lib/cn';
import type { ReactNode } from 'react';

export type DetailTab = {
  value: string;
  label: string;
  content: ReactNode;
};

export function DetailTabs({
  tabs,
  value,
  onValueChange,
  className,
}: {
  tabs: DetailTab[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onValueChange} className={cn('space-y-4', className)}>
      <TabsPrimitive.List className="flex w-full justify-start gap-1 overflow-x-auto rounded-lg border bg-card p-1">
        {tabs.map((t) => (
          <TabsPrimitive.Trigger
            key={t.value}
            value={t.value}
            className={cn(
              'inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-muted-foreground',
              'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
            )}
          >
            {t.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((t) => (
        <TabsPrimitive.Content key={t.value} value={t.value} className="outline-none">
          {t.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}

