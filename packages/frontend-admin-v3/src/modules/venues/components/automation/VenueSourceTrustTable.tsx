import type { ImportSourceTrustRow } from '@/modules/venues/api/venue-automation';

export function VenueSourceTrustTable({ rows }: { rows: ImportSourceTrustRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b bg-muted/40 text-left text-xs font-medium uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Источник</th>
            <th className="px-3 py-2">Доверие (профиль)</th>
            <th className="px-3 py-2">Предложено</th>
            <th className="px-3 py-2">Автоутверждение</th>
            <th className="px-3 py-2">Автообъединение</th>
            <th className="px-3 py-2">Доля отклонений</th>
            <th className="px-3 py-2">Подсказка: объединение</th>
            <th className="px-3 py-2">Подсказка: утверждение</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.importSource} className="border-b border-border/60 last:border-0">
              <td className="px-3 py-2 font-medium">{r.importSource}</td>
              <td className="px-3 py-2">{r.profile.trustLevel}</td>
              <td className="px-3 py-2">{r.suggestedTrustLevel}</td>
              <td className="px-3 py-2">{r.profile.autoApproveEnabled ? 'да' : 'нет'}</td>
              <td className="px-3 py-2">{r.profile.autoMergeEnabled ? 'да' : 'нет'}</td>
              <td className="px-3 py-2">{(r.metrics.rejectRate * 100).toFixed(1)}%</td>
              <td className="px-3 py-2">
                {r.metrics.hintAcceptanceMerge !== null ? `${(r.metrics.hintAcceptanceMerge * 100).toFixed(0)}%` : '—'}
              </td>
              <td className="px-3 py-2">
                {r.metrics.hintAcceptanceApprove !== null
                  ? `${(r.metrics.hintAcceptanceApprove * 100).toFixed(0)}%`
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
