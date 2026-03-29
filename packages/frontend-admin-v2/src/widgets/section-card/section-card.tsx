import type { ReactNode } from 'react';

import { SectionTitle } from '@/shared/ui/section-title';
import { Surface } from '@/shared/ui/surface';

export function SectionCard({
  title,
  description,
  action,
  children,
  padding = 'md',
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  padding?: 'sm' | 'md' | 'lg';
}) {
  return (
    <Surface padding={padding}>
      <SectionTitle title={title} description={description} action={action} className="mb-6" />
      {children}
    </Surface>
  );
}
