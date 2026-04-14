import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { fetchImportSourceTrust } from '@/modules/venues/api/venue-automation';
import { VenueAutoModerationDryRun } from '@/modules/venues/components/automation/VenueAutoModerationDryRun';
import { VenueAutoModerationRunPanel } from '@/modules/venues/components/automation/VenueAutoModerationRunPanel';
import { VenueSourceTrustTable } from '@/modules/venues/components/automation/VenueSourceTrustTable';
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';

export function VenueAutomationPage() {
  const trustQ = useQuery({
    queryKey: ['venue-import-source-trust'],
    queryFn: fetchImportSourceTrust,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Авто-модерация площадок"
        subtitle="Dry-run, ограниченный запуск, уровни доверия по источникам. Сначала наблюдение, затем осторожная автоматизация."
      />

      <VenueAutoModerationDryRun />
      <VenueAutoModerationRunPanel />

      <div className="space-y-2">
        <h2 className="text-lg font-medium">Уровни доверия (источники импорта)</h2>
        {trustQ.isLoading ? <LoadingState label="Загрузка профилей…" /> : null}
        {trustQ.isError ? (
          <ErrorState
            title="Не удалось загрузить trust"
            description={trustQ.error instanceof Error ? trustQ.error.message : 'Ошибка'}
            onRetry={() => trustQ.refetch()}
          />
        ) : null}
        {trustQ.data ? <VenueSourceTrustTable rows={trustQ.data} /> : null}
      </div>
    </div>
  );
}
