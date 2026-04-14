import type { VenueModerationMetricsDto } from '@/modules/venues/api/moderation-analytics';
import { venueRejectReasonLabel } from '@/modules/venues/utils/venue-reject-reason-labels';
import { formatSharePct } from '@/modules/venues/components/analytics/venue-analytics-format';

export function VenueRejectReasonsChart({ data }: { data: VenueModerationMetricsDto }) {
  const rows = data.rejectReasonsDetailed;
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Нет отклонений с указанной причиной за период.
      </div>
    );
  }
  const maxShare = Math.max(...rows.map((r) => r.share), 1e-6);
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="text-sm font-medium">Причины отказа</div>
      <ul className="space-y-2">
        {rows.slice(0, 12).map((r) => (
          <li key={r.reasonCode} className="space-y-1">
            <div className="flex justify-between gap-2 text-xs">
              <span className="truncate font-medium">{venueRejectReasonLabel(r.reasonCode as never)}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {r.count} · {formatSharePct(r.share)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-muted">
              <div
                className="h-full bg-primary/70"
                style={{ width: `${Math.min(100, (r.share / maxShare) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
