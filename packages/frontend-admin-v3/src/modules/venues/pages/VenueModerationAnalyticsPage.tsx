import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import {
  fetchModerationMetrics,
  fetchModerationSources,
  type VenueImportSourceFilter,
} from '@/modules/venues/api/moderation-analytics';
import { VenueAnalyticsFilterBar } from '@/modules/venues/components/analytics/VenueAnalyticsFilterBar';
import { VenueDecisionHintStats } from '@/modules/venues/components/analytics/VenueDecisionHintStats';
import { VenueModerationKpiCards } from '@/modules/venues/components/analytics/VenueModerationKpiCards';
import { VenueModerationThroughput } from '@/modules/venues/components/analytics/VenueModerationThroughput';
import { VenueModerationWarnings } from '@/modules/venues/components/analytics/VenueModerationWarnings';
import { VenueRejectReasonsChart } from '@/modules/venues/components/analytics/VenueRejectReasonsChart';
import { VenueSourceQualityTable } from '@/modules/venues/components/analytics/VenueSourceQualityTable';
import { venueRejectReasonLabel } from '@/modules/venues/utils/venue-reject-reason-labels';
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';

function defaultToIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function VenueModerationAnalyticsPage() {
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const [from, setFrom] = React.useState(defaultToIsoDate(monthAgo));
  const [to, setTo] = React.useState(defaultToIsoDate(today));
  const [importSource, setImportSource] = React.useState<VenueImportSourceFilter>('');
  const [applied, setApplied] = React.useState({
    from: defaultToIsoDate(monthAgo),
    to: defaultToIsoDate(today),
    importSource: '' as VenueImportSourceFilter,
  });

  const metricsQ = useQuery({
    queryKey: ['venue-moderation-metrics', applied],
    queryFn: () =>
      fetchModerationMetrics({
        from: applied.from,
        to: applied.to,
        importSource: applied.importSource || undefined,
      }),
  });

  const sourcesQ = useQuery({
    queryKey: ['venue-moderation-sources', applied],
    queryFn: () =>
      fetchModerationSources({
        from: applied.from,
        to: applied.to,
        importSource: applied.importSource || undefined,
      }),
  });

  const onApply = () => {
    setApplied({ from, to, importSource });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Аналитика модерации площадок"
        subtitle="Объёмы, подсказки, источники и время до первого решения."
      />

      <VenueAnalyticsFilterBar
        from={from}
        to={to}
        importSource={importSource}
        onFromChange={setFrom}
        onToChange={setTo}
        onImportSourceChange={setImportSource}
        onApply={onApply}
      />

      {metricsQ.isLoading ? <LoadingState label="Загрузка метрик…" /> : null}
      {metricsQ.isError ? (
        <ErrorState
          title="Не удалось загрузить метрики"
          description={metricsQ.error instanceof Error ? metricsQ.error.message : 'Ошибка'}
          onRetry={() => metricsQ.refetch()}
        />
      ) : null}

      {metricsQ.data ? (
        <div className="space-y-8">
          <VenueModerationKpiCards data={metricsQ.data} />
          <div className="grid gap-6 lg:grid-cols-2">
            <VenueDecisionHintStats data={metricsQ.data} />
            <VenueRejectReasonsChart data={metricsQ.data} />
          </div>
          <VenueSourceQualityTable data={metricsQ.data} />
          <div className="grid gap-6 lg:grid-cols-2">
            <VenueModerationThroughput data={metricsQ.data} />
            <VenueModerationWarnings data={metricsQ.data} />
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Источники (детальный разрез)</h2>
        {sourcesQ.isLoading ? <LoadingState label="Загрузка…" /> : null}
        {sourcesQ.isError ? (
          <ErrorState
            title="Не удалось загрузить источники"
            description={sourcesQ.error instanceof Error ? sourcesQ.error.message : 'Ошибка'}
            onRetry={() => sourcesQ.refetch()}
          />
        ) : null}
        {sourcesQ.data ? (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Источник</th>
                  <th className="px-3 py-2">Всего</th>
                  <th className="px-3 py-2">A / R / M</th>
                  <th className="px-3 py-2">Needs review</th>
                  <th className="px-3 py-2">Avg conf.</th>
                  <th className="px-3 py-2">Топ причин отказа</th>
                </tr>
              </thead>
              <tbody>
                {sourcesQ.data.sources.map((s) => (
                  <tr key={s.importSource} className="border-b border-dashed last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{s.importSource}</td>
                    <td className="px-3 py-2 tabular-nums">{s.total}</td>
                    <td className="px-3 py-2 tabular-nums text-xs">
                      {s.approved} / {s.rejected} / {s.merged}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{s.needsReview}</td>
                    <td className="px-3 py-2 tabular-nums">{s.avgConfidence.toFixed(2)}</td>
                    <td className="px-3 py-2 text-xs">
                      {s.topRejectReasons.length === 0
                        ? '—'
                        : s.topRejectReasons
                            .map((r) => `${venueRejectReasonLabel(r.reasonCode as never)} (${r.count})`)
                            .join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sourcesQ.data.sources.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Нет данных.</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
