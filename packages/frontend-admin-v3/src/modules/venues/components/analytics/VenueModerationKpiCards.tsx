import type { VenueModerationMetricsDto } from '@/modules/venues/api/moderation-analytics';
import { formatSharePct } from '@/modules/venues/components/analytics/venue-analytics-format';

export function VenueModerationKpiCards({ data }: { data: VenueModerationMetricsDto }) {
  const { counts, rates, volume } = data;
  const cards = [
    { label: 'Утверждено', value: counts.approvedTotal },
    { label: 'Отклонено', value: counts.rejectedTotal },
    { label: 'Объединений', value: counts.mergedTotal },
    { label: 'Доля утверждений', value: formatSharePct(rates.approveRate) },
    { label: 'Доля отклонений', value: formatSharePct(rates.rejectRate) },
    { label: 'Доля объединений', value: formatSharePct(rates.mergeRate) },
    { label: 'Черновиков всего', value: volume.draftsTotal },
    { label: 'Модерировано (решений)', value: volume.moderatedTotal },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border bg-card p-4">
          <div className="text-xs font-medium uppercase text-muted-foreground">{c.label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{c.value}</div>
        </div>
      ))}
    </div>
  );
}
