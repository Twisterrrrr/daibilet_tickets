import type { AdminVenueCandidateRow } from '@/modules/venues/api/candidates';
import { ImportSourceBadge } from '@/modules/venues/components/candidates/venue-candidate-badges';

type Props = { row: AdminVenueCandidateRow };

export function VenueCandidateIdentityCell({ row }: Props) {
  return (
    <div className="space-y-1">
      <div className="font-medium">{row.title}</div>
      <div className="text-sm text-foreground/90">{row.displayAddress ?? '—'}</div>
      <div className="text-xs text-muted-foreground">
        <span className="font-mono">raw:</span> {row.rawName ?? '—'}
      </div>
      <div className="text-xs text-muted-foreground">
        <span className="font-mono">raw addr:</span> {row.rawAddress ?? '—'}
      </div>
      {row.normalizedAddress ? (
        <div className="font-mono text-[10px] text-muted-foreground/80">norm: {row.normalizedAddress}</div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span>{row.city.name}</span>
        <ImportSourceBadge s={row.importSource} />
        {row.externalVenueId ? <span className="font-mono text-[10px]">ext:{row.externalVenueId}</span> : null}
      </div>
    </div>
  );
}
