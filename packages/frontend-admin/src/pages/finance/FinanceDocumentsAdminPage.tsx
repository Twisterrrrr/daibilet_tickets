import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState, LoadingState, PageHeader, SectionCard } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Settlement = {
  id: string;
  operatorId: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  netAmount: string | number;
  currency: string;
};

type FinanceDoc = {
  id: string;
  operatorId: string;
  settlementId: string | null;
  type: string;
  status: string;
  title: string;
  createdAt: string;
  htmlPath: string | null;
  pdfPath: string | null;
};

type PolicyPreview = {
  required: string[];
  skipped: Array<{ type: string; reason: string }>;
};

const STATUS_FLOW = ['CALCULATED', 'APPROVED', 'FINALIZED', 'PAID'] as const;
const SETTLEMENT_STATUS_LABELS: Record<string, string> = {
  CALCULATED: 'Рассчитан',
  APPROVED: 'Подтвержден',
  FINALIZED: 'Закрыт',
  PAID: 'Оплачен',
  CANCELED: 'Отменен',
};
const DOC_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  ISSUED: 'Выпущен',
  GENERATED: 'Сгенерирован',
  FAILED: 'Ошибка',
  SENT: 'Отправлен',
  SIGNED: 'Подписан',
  CANCELED: 'Отменен',
};
const DOC_TYPE_LABELS: Record<string, string> = {
  AGENT_REPORT: 'Агентский отчет',
  SERVICE_ACT: 'Акт услуг',
  UPD: 'УПД',
  INVOICE: 'Счет',
  VAT_INVOICE: 'Счет-фактура',
};

function getStatusVariant(status: string): 'secondary' | 'warning' | 'success' | 'destructive' | 'outline' {
  if (status === 'PAID') return 'success';
  if (status === 'FINALIZED') return 'warning';
  if (status === 'CANCELED') return 'destructive';
  if (status === 'APPROVED' || status === 'CALCULATED') return 'secondary';
  return 'outline';
}

export function FinanceDocumentsAdminPage() {
  const [operatorId, setOperatorId] = useState('');
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [docs, setDocs] = useState<FinanceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [policyBySettlement, setPolicyBySettlement] = useState<Record<string, PolicyPreview>>({});
  const [busySettlement, setBusySettlement] = useState<string | null>(null);
  const [busyDoc, setBusyDoc] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const load = async (targetOperatorId?: string) => {
    setLoading(true);
    const query = targetOperatorId ? `?operatorId=${encodeURIComponent(targetOperatorId)}` : '';
    try {
      const [settlementRes, docsRes] = await Promise.all([
        adminApi.get<Settlement[]>(`/admin/finance/settlements${query}`),
        adminApi.get<FinanceDoc[]>(`/admin/finance/documents${query}`),
      ]);
      setSettlements(settlementRes);
      setDocs(docsRes);
      setPolicyBySettlement({});
    } catch (e: any) {
      toast.error(e.message ?? 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const previewPolicy = async (settlementId: string) => {
    try {
      const res = await adminApi.get<PolicyPreview>(`/admin/finance/settlements/${settlementId}/document-policy-preview`);
      setPolicyBySettlement((prev) => ({ ...prev, [settlementId]: res }));
    } catch (e: any) {
      toast.error(e.message ?? 'Ошибка preview policy');
    }
  };

  const issueDocs = async (settlementId: string) => {
    setBusySettlement(settlementId);
    try {
      await adminApi.post(`/admin/finance/settlements/${settlementId}/issue-documents`);
      toast.success('Выпуск документов завершён');
      await load(operatorId || undefined);
    } catch (e: any) {
      toast.error(e.message ?? 'Ошибка выпуска документов');
    } finally {
      setBusySettlement(null);
    }
  };

  const transitionSettlement = async (
    settlementId: string,
    action: 'approve' | 'finalize' | 'mark-paid',
    successText: string,
  ) => {
    setBusyAction(`${settlementId}:${action}`);
    try {
      await adminApi.post(`/admin/finance/settlements/${settlementId}/${action}`);
      toast.success(successText);
      await load(operatorId || undefined);
    } catch (e: any) {
      toast.error(e.message ?? 'Ошибка смены статуса settlement');
    } finally {
      setBusyAction(null);
    }
  };

  const regenerateDoc = async (documentId: string) => {
    setBusyDoc(documentId);
    try {
      await adminApi.post(`/admin/finance/documents/${documentId}/regenerate`);
      toast.success('Регенерация выполнена');
      await load(operatorId || undefined);
    } catch (e: any) {
      toast.error(e.message ?? 'Ошибка регенерации');
    } finally {
      setBusyDoc(null);
    }
  };

  if (loading && settlements.length === 0 && docs.length === 0) {
    return <LoadingState label="Загружаем settlements и документы..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Финансовые документы"
        subtitle="Жизненный цикл сверок, превью политики и ручной выпуск/регенерация"
      />

      <SectionCard title="Фильтр по оператору">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="operatorId (опционально)"
            value={operatorId}
            onChange={(e) => setOperatorId(e.target.value)}
            className="max-w-[420px]"
          />
          <Button variant="outline" onClick={() => load(operatorId || undefined)}>
            Применить
          </Button>
          <Button variant="ghost" onClick={() => { setOperatorId(''); load(); }}>
            Сбросить
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Сверки">
        {settlements.length === 0 ? (
          <EmptyState title="Нет сверок" description="Пока нечего показывать по выбранному фильтру." />
        ) : (
          <div className="space-y-2">
            {settlements.map((s) => {
              const preview = policyBySettlement[s.id];
              return (
                <div key={s.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusVariant(s.status)}>{SETTLEMENT_STATUS_LABELS[s.status] ?? s.status}</Badge>
                        <span className="font-medium">{s.operatorId}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.periodStart.slice(0, 10)} - {s.periodEnd.slice(0, 10)} · {Number(s.netAmount).toLocaleString('ru-RU')} {s.currency}
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
                              {SETTLEMENT_STATUS_LABELS[step] ?? step}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => transitionSettlement(s.id, 'approve', 'Сверка подтверждена')}
                        disabled={busyAction === `${s.id}:approve` || s.status !== 'CALCULATED'}
                      >
                        {busyAction === `${s.id}:approve` ? 'Подтверждаем...' : 'Подтвердить'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => transitionSettlement(s.id, 'finalize', 'Сверка закрыта')}
                        disabled={busyAction === `${s.id}:finalize` || s.status !== 'APPROVED'}
                      >
                        {busyAction === `${s.id}:finalize` ? 'Закрываем...' : 'Закрыть'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => transitionSettlement(s.id, 'mark-paid', 'Сверка отмечена как оплаченная')}
                        disabled={busyAction === `${s.id}:mark-paid` || s.status !== 'FINALIZED'}
                      >
                        {busyAction === `${s.id}:mark-paid` ? 'Обновляем...' : 'Отметить оплату'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => previewPolicy(s.id)}>
                        Превью политики
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => issueDocs(s.id)}
                        disabled={busySettlement === s.id || s.status !== 'FINALIZED'}
                      >
                        {busySettlement === s.id ? 'Выпуск...' : 'Выпустить документы'}
                      </Button>
                    </div>
                  </div>
                  {preview && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <div>Будут выпущены: {preview.required.map((x) => DOC_TYPE_LABELS[x] ?? x).join(', ') || '—'}</div>
                      {preview.skipped.length > 0 && (
                        <div>
                          Пропущены: {preview.skipped.map((x) => `${DOC_TYPE_LABELS[x.type] ?? x.type} (${x.reason})`).join('; ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Документы">
        {docs.length === 0 ? (
          <EmptyState title="Нет документов" description="Документы не найдены." />
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <div key={d.id} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{DOC_TYPE_LABELS[d.type] ?? d.type} · {DOC_STATUS_LABELS[d.status] ?? d.status}</div>
                    <div className="text-xs text-muted-foreground">{d.title}</div>
                    <div className="text-xs text-muted-foreground">operator: {d.operatorId}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => regenerateDoc(d.id)} disabled={busyDoc === d.id}>
                    {busyDoc === d.id ? 'Регенерация...' : 'Регенерировать'}
                  </Button>
                </div>
                <div className="mt-2 flex gap-3 text-xs">
                  {d.htmlPath && (
                    <a href={`/${d.htmlPath}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      HTML
                    </a>
                  )}
                  {d.pdfPath && (
                    <a href={`/${d.pdfPath}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      PDF
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

