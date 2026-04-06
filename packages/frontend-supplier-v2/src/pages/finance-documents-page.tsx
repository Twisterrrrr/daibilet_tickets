import { FileCheck2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { api } from '@/shared/lib/api';
import { PageGlyph } from '@/shared/ui/page-glyph';
import {
  EmptyState,
  ErrorPanel,
  LoadingBlock,
  PageHeader,
  SectionCard,
} from '@/shared/ui/page-primitives';

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
};

type FinanceDoc = {
  id: string;
  type: string;
  status: string;
  title: string;
  htmlPath: string | null;
  pdfPath: string | null;
};

const STATUS_FLOW = ['CALCULATED', 'APPROVED', 'FINALIZED', 'PAID'] as const;

const SETTLEMENT_STEP_LABELS: Record<(typeof STATUS_FLOW)[number], string> = {
  CALCULATED: 'Рассчитан',
  APPROVED: 'Согласован',
  FINALIZED: 'Закрыт',
  PAID: 'Оплачен',
};

const SETTLEMENT_STATUS_LABEL: Record<string, string> = {
  CALCULATED: 'Рассчитан',
  APPROVED: 'Согласован',
  FINALIZED: 'Закрыт',
  PAID: 'Оплачен',
};

const DOC_KIND_LABEL: Record<string, string> = {
  AGENT_REPORT: 'Отчёт агента',
  SERVICE_ACT: 'Акт оказанных услуг',
  UPD: 'УПД',
  INVOICE: 'Счёт',
  VAT_INVOICE: 'Счёт-фактура',
};

type SampleDocItem = { kind: string; title: string; html: string };

export function FinanceDocumentsPage() {
  const [settings, setSettings] = useState<DocumentSettings | null>(null);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [docs, setDocs] = useState<FinanceDoc[]>([]);
  const [samples, setSamples] = useState<SampleDocItem[]>([]);
  const [sampleKind, setSampleKind] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get<DocumentSettings>('/supplier/finance/document-settings'),
      api.get<Settlement[]>('/supplier/finance/settlements'),
      api.get<FinanceDoc[]>('/supplier/finance/documents'),
    ])
      .then(([s, st, d]) => {
        setSettings(s ?? null);
        setSettlements(Array.isArray(st) ? st : []);
        setDocs(Array.isArray(d) ? d : []);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!settings) return;
    api
      .get<{ items: SampleDocItem[] }>('/supplier/finance/sample-documents-preview')
      .then((res) => {
        const items = Array.isArray(res?.items) ? res.items : [];
        setSamples(items);
        setSampleKind((prev) => prev ?? items[0]?.kind ?? null);
      })
      .catch(() => {
        setSamples([]);
        setSampleKind(null);
      });
  }, [settings]);

  const activeSample = useMemo(
    () => samples.find((s) => s.kind === sampleKind) ?? samples[0] ?? null,
    [samples, sampleKind],
  );

  const vatHint = useMemo(() => {
    if (!settings) return null;
    if (!settings.isVatPayer) return 'Счёт-фактура не формируется: не плательщик НДС.';
    if (settings.taxMode === 'NPD') return 'Счёт-фактура недоступна для режима НПД.';
    if (settings.defaultVatRate == null) return 'Укажите ставку НДС в реквизитах.';
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
      window.alert('Настройки сохранены');
      load();
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSavingSettings(false);
    }
  };

  const downloadActiveSamplePdf = async () => {
    if (!activeSample) return;
    setPdfLoading(true);
    try {
      const token = localStorage.getItem('supplier_token');
      const res = await fetch(
        `/api/v1/supplier/finance/sample-documents-preview/${encodeURIComponent(activeSample.kind)}/pdf`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `obrazets-${activeSample.kind}.pdf`;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : 'Не удалось скачать PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const issueForSettlement = async (sid: string) => {
    setIssuingId(sid);
    try {
      await api.post(`/supplier/finance/settlements/${sid}/issue-documents`);
      window.alert('Выпуск документов запущен');
      load();
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : 'Ошибка выпуска');
    } finally {
      setIssuingId(null);
    }
  };

  if (loading && !settings) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Финансовые документы"
          subtitle="Настройки и закрывающие документы"
          glyph={<PageGlyph icon={FileCheck2} tone="sky" />}
        />
        <LoadingBlock />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Финансовые документы"
          subtitle="Настройки и закрывающие документы"
          glyph={<PageGlyph icon={FileCheck2} tone="sky" />}
        />
        <EmptyState title="Нет данных" description={error || 'Не удалось загрузить настройки.'} />
        {error ? <ErrorPanel title="Ошибка" description={error} onRetry={load} /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Финансовые документы"
        subtitle="Настройки и закрывающие документы"
        glyph={<PageGlyph icon={FileCheck2} tone="sky" />}
      />
      {error ? <ErrorPanel title="Частичная ошибка" description={error} onRetry={load} /> : null}

      <SectionCard title="Настройки документов">
        <div className="space-y-3 text-small">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.generateInvoiceDocuments}
              onChange={(e) =>
                setSettings((p) => (p ? { ...p, generateInvoiceDocuments: e.target.checked } : p))
              }
            />
            Формировать счёт и счёт-фактуру
          </label>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="closingMode"
                checked={settings.closingDocumentMode === 'UPD'}
                onChange={() => setSettings((p) => (p ? { ...p, closingDocumentMode: 'UPD' } : p))}
              />
              УПД
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="closingMode"
                checked={settings.closingDocumentMode === 'ACT'}
                onChange={() => setSettings((p) => (p ? { ...p, closingDocumentMode: 'ACT' } : p))}
              />
              Акт
            </label>
          </div>
          <p className="text-[11px] text-text-muted">
            Закрывающий документ: <strong>УПД</strong> — универсальный передаточный документ;{' '}
            <strong>Акт</strong> — отдельный акт оказанных услуг. Выбор зависит от учёта и договора с
            контрагентом.
          </p>
          {vatHint ? <p className="text-[11px] text-warning">{vatHint}</p> : null}
          <button
            type="button"
            onClick={() => void saveSettings()}
            disabled={savingSettings}
            className="rounded-control bg-accent px-4 py-2 text-label text-accent-foreground disabled:opacity-50"
          >
            {savingSettings ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Как выглядят документы"
        description="Те же шаблоны, что при выпуске. Условные реквизиты «ООО Пример» — только для ориентира."
      >
        {samples.length === 0 ? (
          <p className="text-small text-text-muted">Образцы недоступны. Обновите страницу позже.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="block min-w-[200px] flex-1 text-label text-text-muted">
                Тип документа
                <select
                  value={sampleKind ?? samples[0]?.kind ?? ''}
                  onChange={(e) => setSampleKind(e.target.value)}
                  className="mt-1 block w-full max-w-md rounded-control border border-border-soft px-3 py-2 text-small"
                >
                  {samples.map((s) => (
                    <option key={s.kind} value={s.kind}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={!activeSample || pdfLoading}
                onClick={() => void downloadActiveSamplePdf()}
                className="h-9 shrink-0 rounded-control border border-border-soft bg-surface-alt px-3 text-label text-text-primary disabled:opacity-50"
              >
                {pdfLoading ? 'PDF…' : 'Скачать PDF'}
              </button>
            </div>
            {activeSample ? (
              <div className="overflow-hidden rounded-control border border-border-soft bg-surface-alt/30">
                <iframe
                  title={activeSample.title}
                  sandbox=""
                  className="h-[min(480px,70vh)] w-full bg-white"
                  srcDoc={activeSample.html}
                />
              </div>
            ) : null}
            <p className="text-[11px] text-text-muted">
              Один PDF на выбранный тип — тот же пайплайн, что при реальном выпуске. Текст в PDF на
              латинице (ограничение встроенного шрифта); русская вёрстка — в превью HTML выше.
            </p>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Электронный документооборот (ЭДО)"
        description="Подключение к оператору ЭДО и обмен с контрагентами"
      >
        <div className="space-y-2 text-small text-text-secondary">
          <p>
            Настройка <strong>ЭДО</strong> в этом интерфейсе пока не вынесена: параметры ящика, оператор
            (например Диадок) и статус подключения заводятся{' '}
            <strong>администратором платформы</strong> на стороне Daibilet после вашей заявки.
          </p>
          <p className="text-text-muted">
            Если нужен обмен УПД/счетами-фактурами в электронном виде, напишите в поддержку — укажем
            необходимые реквизиты для карточки ЭДО.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="Расчётные периоды"
        description="Закрытие отчётного периода по продажам и комиссии; на этапе «Закрыт» можно выпустить комплект документов."
      >
        {settlements.length === 0 ? (
          <p className="text-small text-text-muted">Пока нет расчётных периодов.</p>
        ) : (
          <div className="space-y-3">
            {settlements.map((s) => (
              <div
                key={s.id}
                className="flex flex-col gap-2 rounded-card border border-border-soft p-3 text-small sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium">
                    {s.periodStart.slice(0, 10)} — {s.periodEnd.slice(0, 10)}
                  </div>
                  <div className="text-text-muted">
                    {SETTLEMENT_STATUS_LABEL[s.status] ?? s.status} ·{' '}
                    {Number(s.netAmount).toLocaleString('ru-RU')} {s.currency}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                    {STATUS_FLOW.map((step, idx) => {
                      const active = step === s.status;
                      const idxSt = STATUS_FLOW.indexOf(s.status as (typeof STATUS_FLOW)[number]);
                      const done = idxSt >= idx;
                      return (
                        <span
                          key={step}
                          className={
                            active
                              ? 'rounded bg-accent/15 px-1.5 text-accent'
                              : done
                                ? 'rounded bg-success-soft px-1.5 text-success'
                                : 'rounded bg-surface-alt px-1.5 text-text-muted'
                          }
                        >
                          {SETTLEMENT_STEP_LABELS[step]}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={issuingId === s.id || s.status !== 'FINALIZED'}
                  onClick={() => void issueForSettlement(s.id)}
                  className="h-9 rounded-control border px-3 text-label disabled:opacity-50"
                >
                  {issuingId === s.id ? 'Выпуск…' : 'Выпустить документы'}
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Документы">
        {docs.length === 0 ? (
          <p className="text-small text-text-muted">Пока нет документов.</p>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <div key={d.id} className="rounded-card border border-border-soft p-3 text-small">
                <div className="font-medium">
                  {DOC_KIND_LABEL[d.type] ?? d.type} · {d.status}
                </div>
                <div className="text-text-muted">{d.title}</div>
                <div className="mt-2 flex gap-3 text-[11px]">
                  {d.htmlPath ? (
                    <a href={`/${d.htmlPath}`} target="_blank" rel="noreferrer" className="text-accent">
                      HTML
                    </a>
                  ) : null}
                  {d.pdfPath ? (
                    <a href={`/${d.pdfPath}`} target="_blank" rel="noreferrer" className="text-accent">
                      PDF
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
