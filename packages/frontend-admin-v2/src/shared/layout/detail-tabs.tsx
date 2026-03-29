import type { ReactNode } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

export interface DetailTabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export function DetailTabs({
  items,
  defaultValue,
}: {
  items: DetailTabItem[];
  defaultValue?: string;
}) {
  const first = items[0]?.id ?? '';
  return (
    <Tabs defaultValue={defaultValue ?? first}>
      <TabsList className="w-full justify-start overflow-x-auto">
        {items.map((t) => (
          <TabsTrigger key={t.id} value={t.id}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((t) => (
        <TabsContent key={t.id} value={t.id}>
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
