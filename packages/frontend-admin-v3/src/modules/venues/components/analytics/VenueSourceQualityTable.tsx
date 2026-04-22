import type { VenueModerationMetricsDto } from '@/modules/venues/api/moderation-analytics';
import { formatSharePct } from '@/modules/venues/components/analytics/venue-analytics-format';

export function VenueSourceQualityTable({ data }: { data: VenueModerationMetricsDto }) {
  const rows = [...data.sourceQuality].sort((a, b) => b.total - a.total);
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Нет данных по источникам за выбранный период.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2">Источник</th>
            <th className="px-3 py-2">Всего решений</th>
            <th className="px-3 py-2">Утверждено</th>
            <th className="px-3 py-2">Отклонено</th>
            <th className="px-3 py-2">Объединено</th>
            <th className="px-3 py-2">Нужна проверка, %</th>
            <th className="px-3 py-2">Средн. уверенность</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.importSource} className="border-b border-dashed last:border-0">
              <td className="px-3 py-2 font-mono text-xs">{r.importSource}</td>
              <td className="px-3 py-2 tabular-nums">{r.total}</td>
              <td className="px-3 py-2">{formatSharePct(r.approveRate)}</td>
              <td className="px-3 py-2">{formatSharePct(r.rejectRate)}</td>
              <td className="px-3 py-2">{formatSharePct(r.mergeRate)}</td>
              <td className="px-3 py-2">{formatSharePct(r.needsReviewRate)}</td>
              <td className="px-3 py-2 tabular-nums">{r.avgConfidence.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
