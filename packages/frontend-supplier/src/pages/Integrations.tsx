import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

import { PageHeader, SectionCard, LoadingState } from '@daibilet/shared-ui';

import { api } from '../lib/api';

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

export default function Integrations() {
  const [data, setData] = useState<IntegrationsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<IntegrationsData>('/supplier/integrations')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Загружаем статус интеграций..." />;

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Интеграции" />
      <SectionCard title="Источники событий">
        <p className="mb-4 text-sm text-gray-500">
          Откуда поступают ваши события и как они подключены к платформе.
        </p>
        <div className="space-y-3">
          {(data?.integrations || []).map((i) => (
            <div
              key={i.id}
              className="flex items-start justify-between rounded-lg border px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    i.status === 'connected' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {i.status === 'connected' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </div>
                <div>
                  <p className="font-medium">{i.name}</p>
                  {i.description && <p className="text-sm text-gray-500">{i.description}</p>}
                  {i.eventCount > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      Событий: {i.eventCount}
                    </p>
                  )}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  i.status === 'connected'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {i.status === 'connected' ? 'Подключено' : 'Нет событий'}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
