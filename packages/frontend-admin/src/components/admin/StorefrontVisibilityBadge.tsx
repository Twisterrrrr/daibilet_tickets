'use client';

import { Badge } from '@/components/ui/badge';

export type StorefrontVisibility = 'VISIBLE' | 'HIDDEN' | 'SUPPRESSED';

/** Единый стиль для storefront visibility — Event и Venue summary */
const VISIBILITY_CLASSES: Record<StorefrontVisibility, string> = {
  VISIBLE: 'border-emerald-300 bg-emerald-50/50 text-emerald-700',
  HIDDEN: 'border-muted-foreground/40 bg-muted/80 text-muted-foreground',
  SUPPRESSED: 'border-amber-300 bg-amber-50/50 text-amber-800',
};

const VISIBILITY_LABELS: Record<StorefrontVisibility, string> = {
  VISIBLE: 'Видно',
  HIDDEN: 'Скрыто',
  SUPPRESSED: 'Подавлено',
};

type Props = {
  visibility: StorefrontVisibility;
};

export function StorefrontVisibilityBadge({ visibility }: Props) {
  const label = VISIBILITY_LABELS[visibility];
  const className = VISIBILITY_CLASSES[visibility];

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}
