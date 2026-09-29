import * as React from 'react';
import { Link, useParams } from 'react-router-dom';

import { DataTableShell, EmptyState, InfoNote, PageHeader, RequestErrorState } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createExternalRefundRequest, getExternalOrderDetail, patchExternalRefundRequest } from '@/modules/external-orders/api/external-orders';
import type { ExternalOrderDetailDto, ExternalRefundRequestReason, ExternalRefundRequestStatus } from '@/modules/external-orders/types';
import { presentRequestError } from '@/shared/api/errors';
import { Receipt } from 'lucide-react';

function CopyIdRow({ label, value }: { label: string; value: string | null }) {
  const v = value?.trim() || '';
  const empty = !v;
  return (
    <div className="flex flex-col gap-1 border-b border-border/60 py-2 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:justify-end">
        <span className={`font-mono text-xs ${empty ? 'text-muted-foreground' : 'text-foreground'}`}>{empty ? '—' : v}</span>
        {!empty ? (
          <Button type="button" size="sm" variant="outline" className="h-7 shrink-0 px-2 text-xs" onClick={() => void navigator.clipboard?.writeText(v)}>
            Копировать
          </Button>
        ) : null}
      </div>
    </div>
  );
}

const REASONS: Array<{ id: ExternalRefundRequestReason; label: string }> = [
  { id: 'OTHER', label: 'Другое' },
  { id: 'CUSTOMER_REQUEST', label: 'Запрос клиента' },
  { id: 'PROVIDER_CANCELED', label: 'Отмена провайдером' },
  { id: 'DUPLICATE', label: 'Дубликат' },
  { id: 'WRONG_DATE', label: 'Неверная дата' },
];

const STATUSES: Array<{ id: ExternalRefundRequestStatus; label: string }> = [
  { id: 'REQUESTED', label: 'REQUESTED' },
  { id: 'IN_REVIEW', label: 'IN_REVIEW' },
  { id: 'PROVIDER_CONTACTED', label: 'PROVIDER_CONTACTED' },
  { id: 'APPROVED_MANUAL', label: 'APPROVED_MANUAL' },
  { id: 'REJECTED', label: 'REJECTED' },
  { id: 'COMPLETED', label: 'COMPLETED' },
  { id: 'CANCELED', label: 'CANCELED' },
];

export function ExternalOrderDetailPage() {
  const { id = '' } = useParams();

  const [data, setData] = React.useState<ExternalOrderDetailDto | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [mutating, setMutating] = React.useState(false);
  const [mutateError, setMutateError] = React.useState<unknown>(null);

  const [reason, setReason] = React.useState<ExternalRefundRequestReason>('OTHER');
  const [reasonNote, setReasonNote] = React.useState('');
  const [amount, setAmount] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const res = await getExternalOrderDetail(id);
        if (!cancelled) setData(res);
      } catch (e: unknown) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const o = data;
  const refundRequests = o?.refundRequests ?? [];

  return (
    <>
      <PageHeader
        title="Внешний заказ"
        description={o ? `${o.provider} · ${o.externalOrderId}` : id}
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin-v4/orders">Назад к списку</Link>
          </Button>
        }
      />

      <InfoNote>
        Факты провайдера — только чтение. Ниже — операционный контур Daibilet: заявки на ручной возврат и их статусы. Связи с checkout/package в Admin V4 пока без отдельного экрана — UUID можно скопировать
        для поиска в БД, логах или в другой админке (если подключена).
      </InfoNote>

      {!loading && error ? (
        <div className="mb-3 mt-3">
          {(() => {
            const p = presentRequestError(error);
            return <RequestErrorState title={p.title} description={p.message} requestId={p.requestId} onRetry={() => setReloadKey((x) => x + 1)} />;
          })()}
        </div>
      ) : null}

      {mutateError ? (
        <div className="mb-3 mt-3">
          {(() => {
            const p = presentRequestError(mutateError);
            return <RequestErrorState title={p.title} description={p.message} requestId={p.requestId} onRetry={() => setMutateError(null)} />;
          })()}
        </div>
      ) : null}

      {o ? (
        <Card className="mb-3 mt-4 border-border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-border font-normal text-muted-foreground">
              id: <span className="ml-1 font-mono text-foreground">{o.id}</span>
            </Badge>
            <Badge variant="outline" className="border-border font-normal text-muted-foreground">
              provider: <span className="ml-1 font-mono text-foreground">{o.provider}</span>
            </Badge>
            <Badge variant="outline" className="border-border font-normal text-muted-foreground">
              status: <span className="ml-1 font-mono text-foreground">{o.status}</span>
            </Badge>
            <Badge variant="outline" className="border-border font-normal text-muted-foreground">
              integration: <span className="ml-1 font-mono text-foreground">{o.integrationState}</span>
            </Badge>
            {o.lastError ? (
              <Badge variant="outline" className="border-destructive/30 bg-destructive/5 font-normal text-destructive">
                lastError: {o.lastError}
              </Badge>
            ) : null}
          </div>
        </Card>
      ) : null}

      {o ? (
        <Card className="mb-3 border-border p-4">
          <div className="text-sm font-medium">Связи внутри Daibilet</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Заполняются, если внешний заказ привязан к внутреннему checkout/package. Для чистого зеркала провайдера часто все поля пустые.
          </p>
          <div className="mt-2">
            <CopyIdRow label="checkoutSessionId" value={o.checkoutSessionId} />
            <CopyIdRow label="packageId" value={o.packageId} />
            <CopyIdRow label="packageItemId" value={o.packageItemId} />
          </div>
        </Card>
      ) : null}

      {o ? (
        <Card className="mb-3 border-border p-4">
          <div className="text-sm font-medium">Новая заявка на ручной возврат</div>
          <div className="mt-3 grid gap-3 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              reason
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ExternalRefundRequestReason)}
                className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                disabled={mutating}
              >
                {REASONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              amount (копейки, optional)
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9" disabled={mutating} />
            </label>

            <div className="lg:col-span-2">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                note
                <Textarea value={reasonNote} onChange={(e) => setReasonNote(e.target.value)} className="min-h-[70px]" disabled={mutating} />
              </label>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              disabled={mutating}
              onClick={async () => {
                if (!o) return;
                setMutateError(null);
                setMutating(true);
                try {
                  const parsedAmount = amount.trim() ? Number(amount.trim()) : undefined;
                  await createExternalRefundRequest(o.id, {
                    reason,
                    reasonNote: reasonNote.trim() ? reasonNote.trim() : undefined,
                    amount: parsedAmount && Number.isFinite(parsedAmount) ? parsedAmount : undefined,
                  });
                  setReason('OTHER');
                  setReasonNote('');
                  setAmount('');
                  setReloadKey((x) => x + 1);
                } catch (e: unknown) {
                  setMutateError(e);
                } finally {
                  setMutating(false);
                }
              }}
            >
              Создать
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="mb-3 border-border">
        <DataTableShell
          columns={['createdAt', 'status', 'reason', 'amount', 'note', 'actions']}
          loading={loading}
          empty={!loading && !error && refundRequests.length === 0 ? <EmptyState icon={Receipt} title="Заявок на возврат нет" description="Создайте первую заявку выше." /> : null}
        >
          {refundRequests.map((r) => (
            <tr key={r.id} className="border-b border-border/60 hover:bg-secondary/40">
              <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString('ru-RU')}</td>
              <td className="px-4 py-3">
                <select
                  value={r.status}
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
                  disabled={mutating}
                  onChange={async (e) => {
                    const next = e.target.value as ExternalRefundRequestStatus;
                    setMutateError(null);
                    setMutating(true);
                    try {
                      await patchExternalRefundRequest(r.id, { status: next });
                      setReloadKey((x) => x + 1);
                    } catch (err: unknown) {
                      setMutateError(err);
                    } finally {
                      setMutating(false);
                    }
                  }}
                >
                  {STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{r.reason}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{r.amount ?? '—'}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{r.reasonNote ?? '—'}</td>
              <td className="px-4 py-3">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={mutating}
                  onClick={async () => {
                    setMutateError(null);
                    setMutating(true);
                    try {
                      await patchExternalRefundRequest(r.id, { status: 'CANCELED' });
                      setReloadKey((x) => x + 1);
                    } catch (err: unknown) {
                      setMutateError(err);
                    } finally {
                      setMutating(false);
                    }
                  }}
                >
                  Cancel
                </Button>
              </td>
            </tr>
          ))}
        </DataTableShell>
      </Card>
    </>
  );
}

