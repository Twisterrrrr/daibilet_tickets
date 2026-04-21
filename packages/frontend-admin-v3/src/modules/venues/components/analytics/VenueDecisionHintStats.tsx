import type { VenueModerationMetricsDto } from '@/modules/venues/api/moderation-analytics';
import { formatSharePct } from '@/modules/venues/components/analytics/venue-analytics-format';
import { venueDecisionHintLabel } from '@/modules/venues/utils/venue-decision-hint-labels';

const HINT_ROWS = ['MERGE_RECOMMENDED', 'APPROVE_AS_NEW', 'REJECT_RECOMMENDED'] as const;

export function VenueDecisionHintStats({ data }: { data: VenueModerationMetricsDto }) {
  const { decisionHints, hintAcceptance } = data;
  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="text-sm font-medium">Подсказки для решения</div>
      <p className="text-xs text-muted-foreground">
        С подсказкой (не «без подсказки»): <strong>{decisionHints.totalWithHint}</strong>
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-2">Тип</th>
              <th className="py-2 pr-2">Сигналов</th>
              <th className="py-2 pr-2">Принято</th>
              <th className="py-2 pr-2">Отклонено</th>
              <th className="py-2 pr-2">Переопределено</th>
              <th className="py-2">Доля принятия</th>
            </tr>
          </thead>
          <tbody>
            {HINT_ROWS.map((key) => {
              const row = hintAcceptance[key];
              const accRate = row.total ? row.accepted / row.total : 0;
              const ovrRate = row.total ? row.overridden / row.total : 0;
              return (
                <tr key={key} className="border-b border-dashed last:border-0">
                  <td className="py-2 pr-2">{venueDecisionHintLabel(key)}</td>
                  <td className="py-2 pr-2 tabular-nums">{row.total}</td>
                  <td className="py-2 pr-2 tabular-nums">{row.accepted}</td>
                  <td className="py-2 pr-2 tabular-nums">{row.rejected}</td>
                  <td className="py-2 pr-2 tabular-nums">{row.overridden}</td>
                  <td className="py-2 text-xs">
                    принято {formatSharePct(accRate)} · переопр. {formatSharePct(ovrRate)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-muted-foreground">
        Распределение сигналов: объединение — {decisionHints.byHint.MERGE_RECOMMENDED}, новая карточка —{' '}
        {decisionHints.byHint.APPROVE_AS_NEW}, нужна проверка — {decisionHints.byHint.NEEDS_REVIEW}, отклонение —{' '}
        {decisionHints.byHint.REJECT_RECOMMENDED}
      </div>
    </div>
  );
}
