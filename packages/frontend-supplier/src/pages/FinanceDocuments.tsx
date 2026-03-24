import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState, ErrorState, LoadingState, PageHeader, SectionCard } from '@daibilet/shared-ui';
import { SupplierSettingsNav } from '@/components/layout/SupplierSettingsNav';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '../lib/api';

type DocumentSettings = {
  generateInvoiceDocuments: boolean;
  closingDocumentMode: 'UPD' | 'ACT';
  isVatPayer: boolean;
  taxMode: string;
  defaultVatRate: number | null;
};

type Settlement = {
  id: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  netAmount: string | number;
  currency: string;
  createdAt: string;
};

type FinanceDoc = {
  id: string;
  settlementId: string | null;
  type: string;
  status: string;
  title: string;
  createdAt: string;
  htmlPath: string | null;
  pdfPath: string | null;
};

const STATUS_FLOW = ['CALCULATED', 'APPROVED', 'FINALIZED', 'PAID'] as const;

function getStatusVariant(status: string): 'secondary' | 'warning' | 'success' | 'destructive' | 'outline' {
  if (status === 'PAID') return 'success';
  if (status === 'FINALIZED') return 'warning';
  if (status === 'CANCELED') return 'destructive';
  if (status === 'APPROVED' || status === 'CALCULATED') return 'secondary';
  return 'outline';
}

export default function FinanceDocumentsPage() {
  const [settings, setSettings] = useState<DocumentSettings | null>(null);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [docs, setDocs] = useState<FinanceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [issuingId, setIssuingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get<DocumentSettings>('/supplier/finance/document-settings'),
      api.get<Settlement[]>('/supplier/finance/settlements'),
      api.get<FinanceDoc[]>('/supplier/finance/documents'),
    ])
      .then(([s, st, d]) => {
        setSettings(s);
        setSettlements(st);
        setDocs(d);
      })
      .catch((e: Error) => {
        setError(e.message);
        toast.error(e.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const vatHint = useMemo(() => {
    if (!settings) return null;
    if (!settings.isVatPayer) return 'Счет-фактура не будет сформирована: поставщик не плательщик НДС.';
    if (settings.taxMode === 'NPD') return 'Счет-фактура недоступна для режима НПД.';
    if (settings.defaultVatRate == null) return 'Укажите ставку НДС в реквизитах для VAT_INVOICE.';
    return null;
  }, [settings]);

  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      await api.patch('/supplier/finance/document-settings', {
        generateInvoiceDocuments: settings.generateInvoiceDocuments,
        closingDocumentMode: settings.closingDocumentMode,
      });
      toast.success('Настройки документов сохранены');
      load();
    } catch (e: any) {
      toast.error(e.message ?? 'Ошибка сохранения');
    } finally {
      setSavingSettings(false);
    }
  };

  const issueForSettlement = async (id: string) => {
    setIssuingId(id);
    try {
      await api.post(`/supplier/finance/settlements/${id}/issue-documents`);
      toast.success('Выпуск документов запущен');
      load();
    } catch (e: any) {
      toast.error(e.message ?? 'Ошибка выпуска');
    } finally {
      setIssuingId(null);
    }
  };

  if (loading && !settings) {
    return <LoadingState label="Загружаем настройки и документы..." />;
  }
  if (!settings) {
    return <EmptyState title="Нет данных" description="Не удалось загрузить настройки документов." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Финансовые документы" subtitle="Настройки генерации и список settlement/документов" />
      <SupplierSettingsNav />
      {error && (
        <ErrorState
          title="Не удалось загрузить документы"
          description={error}
          action={
            <Button type="button" variant="outline" onClick={load}>
              Повторить
            </Button>
          }
        />
      )}

      <SectionCard title="Настройки документов">
        <div className="space-y-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.generateInvoiceDocuments}
              onChange={(e) => setSettings((p) => (p ? { ...p, generateInvoiceDocuments: e.target.checked } : p))}
            />
            <span>Автоматически формировать счет и счет-фактуру (opt-in)</span>
          </label>
          <div className="flex items-center gap-3">
            <span>Закрывающий документ:</span>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="closingMode"
                checked={settings.closingDocumentMode === 'UPD'}
                onChange={() => setSettings((p) => (p ? { ...p, closingDocumentMode: 'UPD' } : p))}
              />
              UPD
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="closingMode"
                checked={settings.closingDocumentMode === 'ACT'}
                onChange={() => setSettings((p) => (p ? { ...p, closingDocumentMode: 'ACT' } : p))}
              />
              ACT
            </label>
          </div>
          {vatHint && <p className="text-xs text-amber-700">{vatHint}</p>}
          <div className="pt-2">
            <Button onClick={saveSettings} disabled={savingSettings}>
              {savingSettings ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Settlement">
        {settlements.length === 0 ? (
          <p className="text-sm text-slate-500">Пока нет settlement.</p>
        ) : (
          <div className="space-y-2">
            {settlements.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <div className="font-medium">{s.periodStart.slice(0, 10)} - {s.periodEnd.slice(0, 10)}</div>
                  <div className="text-xs text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <Badge variant={getStatusVariant(s.status)}>{s.status}</Badge>
                      <span>{Number(s.netAmount).toLocaleString('ru-RU')} {s.currency}</span>
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px]">
                    {STATUS_FLOW.map((step, idx) => {
                      const active = step === s.status;
                      const done = STATUS_FLOW.indexOf(s.status as typeof STATUS_FLOW[number]) >= idx;
                      return (
                        <span
                          key={step}
                          className={`rounded px-1.5 py-0.5 ${
                            active
                              ? 'bg-blue-100 text-blue-800'
                              : done
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {step}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={issuingId === s.id || s.status !== 'FINALIZED'}
                  onClick={() => issueForSettlement(s.id)}
                >
                  {issuingId === s.id ? 'Выпуск...' : 'Выпустить документы'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Документы">
        {docs.length === 0 ? (
          <p className="text-sm text-slate-500">Пока нет документов.</p>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <div key={d.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{d.type} · {d.status}</div>
                    <div className="text-xs text-slate-500">{d.title}</div>
                  </div>
                </div>
                <div className="mt-2 flex gap-3 text-xs">
                  {d.htmlPath && (
                    <a href={`/${d.htmlPath}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      Открыть HTML
                    </a>
                  )}
                  {d.pdfPath && (
                    <a href={`/${d.pdfPath}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      Открыть PDF
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

