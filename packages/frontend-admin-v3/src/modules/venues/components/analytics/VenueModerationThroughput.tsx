import type { VenueModerationMetricsDto } from '@/modules/venues/api/moderation-analytics';
import { formatMs } from '@/modules/venues/components/analytics/venue-analytics-format';

export function VenueModerationThroughput({ data }: { data: VenueModerationMetricsDto }) {
  const t = data.throughput;
  const items = [
    { label: 'Среднее время до 1-го решения', value: formatMs(t.timeToFirstDecisionAvgMs) },
    { label: 'Медиана (p50)', value: formatMs(t.timeToFirstDecisionP50Ms) },
    { label: 'Перцентиль 95 (p95)', value: formatMs(t.timeToFirstDecisionP95Ms) },
  ];
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-sm font-medium">Пропускная способность (до первого решения)</div>
      <p className="mt-1 text-xs text-muted-foreground">
        Учитываются площадки, у которых дата первого решения попадает в выбранный диапазон.
      </p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-3">
        {items.map((x) => (
          <div key={x.label}>
            <dt className="text-xs text-muted-foreground">{x.label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{x.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
