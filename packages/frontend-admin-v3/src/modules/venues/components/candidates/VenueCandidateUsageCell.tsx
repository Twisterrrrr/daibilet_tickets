import type { AdminVenueCandidateRow } from '@/modules/venues/api/candidates';
import { Link, useLocation } from 'react-router-dom';

type Props = { row: AdminVenueCandidateRow };

export function VenueCandidateUsageCell({ row }: Props) {
  const location = useLocation();
  const back = `${location.pathname}${location.search}`;

  return (
    <div className="space-y-1 text-sm">
      <div>События: {row.eventsCount}</div>
      <div>Оферы: {row.offersCount}</div>
      <div className="text-xs text-muted-foreground">
        merge→{' '}
        {row.mergeTargetId ? (
          <Link
            to={`/admin-v3/venues/${row.mergeTargetId}`}
            state={{ fromCandidatesPath: back }}
            className="text-primary underline"
          >
            открыть
          </Link>
        ) : (
          '—'
        )}
      </div>
    </div>
  );
}
