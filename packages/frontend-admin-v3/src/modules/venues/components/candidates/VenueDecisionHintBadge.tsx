import { Badge } from '@/components/ui/badge';
import type { VenueDecisionHint } from '@/modules/venues/api/candidates';
import { venueDecisionHintLabel } from '@/modules/venues/utils/venue-decision-hint-labels';
import * as React from 'react';

const variant: Record<
  VenueDecisionHint,
  'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline'
> = {
  MERGE_RECOMMENDED: 'info',
  APPROVE_AS_NEW: 'success',
  NEEDS_REVIEW: 'warning',
  REJECT_RECOMMENDED: 'danger',
  NO_HINT: 'outline',
};

export function VenueDecisionHintBadge({ hint }: { hint: VenueDecisionHint }) {
  if (hint === 'NO_HINT') return null;
  const label = venueDecisionHintLabel(hint);
  if (!label) return null;
  return (
    <Badge variant={variant[hint]} className="whitespace-nowrap text-xs font-normal">
      {label}
    </Badge>
  );
}
