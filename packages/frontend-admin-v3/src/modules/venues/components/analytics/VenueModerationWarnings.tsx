import type { VenueModerationMetricsDto } from '@/modules/venues/api/moderation-analytics';
import { formatSharePct } from '@/modules/venues/components/analytics/venue-analytics-format';

export function VenueModerationWarnings({ data }: { data: VenueModerationMetricsDto }) {
  const w = data.warnings;
  return (
    <div className="rounded-lg border border-amber-200/60 bg-amber-50/40 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="text-sm font-medium">Предупреждения (оценка)</div>
      <p className="mt-1 text-xs text-muted-foreground">
        Доли зарезервированы под slug collision и stale-state; при появлении аудита в БД значения заполнятся.
      </p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Доля конфликтов slug</dt>
          <dd className="text-lg font-semibold tabular-nums">{formatSharePct(w.slugCollisionRate)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Доля «устаревших» состояний</dt>
          <dd className="text-lg font-semibold tabular-nums">{formatSharePct(w.staleStateRate)}</dd>
        </div>
      </dl>
    </div>
  );
}
