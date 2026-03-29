import { Check, Plug2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { api } from '@/shared/lib/api';
import { cn } from '@/shared/lib/cn';
import { PageGlyph } from '@/shared/ui/page-glyph';
import { EmptyState, ErrorPanel, LoadingBlock, PageHeader, SectionCard } from '@/shared/ui/page-primitives';
import { SupplierSettingsNav } from '@/shared/ui/supplier-settings-nav';

interface IntegrationStatus {
  id: string;
  name: string;
  status: 'connected' | 'none';
  eventCount: number;
  description?: string;
}

interface IntegrationsData {
  integrations: IntegrationStatus[];
}

export function IntegrationsPage() {
  const [data, setData] = useState<IntegrationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<IntegrationsData>('/supplier/integrations')
      .then(setData)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Не удалось загрузить интеграции'),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Интеграции" glyph={<PageGlyph icon={Plug2} tone="slate" />} />
        <SupplierSettingsNav />
        <LoadingBlock />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Интеграции" glyph={<PageGlyph icon={Plug2} tone="slate" />} />
        <SupplierSettingsNav />
        <ErrorPanel title="Ошибка" description={error} />
      </div>
    );
  }

  const list = data?.integrations ?? [];

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Интеграции"
        subtitle="Источники событий"
        glyph={<PageGlyph icon={Plug2} tone="slate" />}
      />
      <SupplierSettingsNav />

      <SectionCard title="Подключения">
        {list.length === 0 ? (
          <EmptyState title="Нет данных об интеграциях" />
        ) : (
          <div className="space-y-3">
            {list.map((i) => (
              <div
                key={i.id}
                className="flex items-start justify-between gap-3 rounded-card border border-border-soft px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                      i.status === 'connected' ? 'bg-success-soft text-success' : 'bg-surface-alt text-text-muted',
                    )}
                  >
                    {i.status === 'connected' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">{i.name}</p>
                    {i.description ? <p className="text-small text-text-muted">{i.description}</p> : null}
                    {i.eventCount > 0 ? (
                      <p className="mt-1 text-[11px] text-text-muted">Событий: {i.eventCount}</p>
                    ) : null}
                  </div>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                    i.status === 'connected' ? 'bg-success-soft text-success' : 'bg-surface-alt text-text-muted',
                  )}
                >
                  {i.status === 'connected' ? 'Подключено' : 'Нет событий'}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
