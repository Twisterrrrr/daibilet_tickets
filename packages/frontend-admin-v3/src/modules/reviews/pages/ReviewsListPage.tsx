import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { DataTableShell } from '@/components/shared/table/DataTableShell';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getAdminErrorDisplay } from '@/lib/get-admin-error-message';
import {
  approveAdminReview,
  deleteAdminReview,
  fetchAdminReviewDisputes,
  fetchAdminReviews,
  fetchAdminSupplierResponses,
  rejectAdminReview,
  approveSupplierResponse,
  rejectSupplierResponse,
  resolveReviewDispute,
  type AdminReviewRow,
  type DisputeRow,
  type SupplierResponseRow,
} from '@/modules/reviews/api/reviews';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

function readInt(v: string | null, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function ReviewsListPage() {
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();

  const [tab, setTab] = React.useState<'reviews' | 'supplierResponses' | 'disputes'>('reviews');

  // Reviews filters
  const [status, setStatus] = React.useState<string>('');
  const [eventId, setEventId] = React.useState<string>('');
  const [page, setPage] = React.useState<number>(1);
  const limit = 25;

  const didInitFromUrl = React.useRef(false);
  React.useEffect(() => {
    if (didInitFromUrl.current) return;
    didInitFromUrl.current = true;
    const t = sp.get('tab');
    if (t === 'reviews' || t === 'supplierResponses' || t === 'disputes') setTab(t);
    setStatus(sp.get('status') ?? '');
    setEventId(sp.get('eventId') ?? '');
    setPage(readInt(sp.get('page'), 1));
  }, [sp]);

  React.useEffect(() => {
    if (!didInitFromUrl.current) return;
    const out = new URLSearchParams(sp);
    if (tab !== 'reviews') out.set('tab', tab);
    else out.delete('tab');
    if (status) out.set('status', status);
    else out.delete('status');
    if (eventId) out.set('eventId', eventId);
    else out.delete('eventId');
    if (page !== 1) out.set('page', String(page));
    else out.delete('page');
    if (out.toString() !== sp.toString()) setSp(out, { replace: true });
  }, [tab, status, eventId, page, sp, setSp]);

  const reviewsQ = useQuery({
    queryKey: ['admin-reviews', { status, eventId, page, limit }],
    queryFn: () => fetchAdminReviews({ status: status || undefined, eventId: eventId || undefined, page, limit }),
    enabled: tab === 'reviews',
    staleTime: 15_000,
  });

  const supplierQ = useQuery({
    queryKey: ['admin-reviews-supplier-responses', { page, limit }],
    queryFn: () => fetchAdminSupplierResponses({ page, limit }),
    enabled: tab === 'supplierResponses',
    staleTime: 15_000,
  });

  const disputesQ = useQuery({
    queryKey: ['admin-reviews-disputes', { page, limit }],
    queryFn: () => fetchAdminReviewDisputes({ page, limit }),
    enabled: tab === 'disputes',
    staleTime: 15_000,
  });

  const approveM = useMutation({
    mutationFn: async (id: string) => approveAdminReview(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
  });
  const rejectM = useMutation({
    mutationFn: async ({ id, adminComment }: { id: string; adminComment?: string }) => rejectAdminReview(id, adminComment),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
  });
  const deleteM = useMutation({
    mutationFn: async (id: string) => deleteAdminReview(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
  });

  const approveRespM = useMutation({
    mutationFn: async (id: string) => approveSupplierResponse(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-reviews-supplier-responses'] });
    },
  });
  const rejectRespM = useMutation({
    mutationFn: async ({ id, moderationComment }: { id: string; moderationComment: string }) =>
      rejectSupplierResponse(id, moderationComment),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-reviews-supplier-responses'] });
    },
  });

  const resolveDisputeM = useMutation({
    mutationFn: async ({ id, status, decisionComment }: { id: string; status: string; decisionComment?: string }) =>
      resolveReviewDispute(id, { status, decisionComment }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-reviews-disputes'] });
    },
  });

  const activeQ = tab === 'reviews' ? reviewsQ : tab === 'supplierResponses' ? supplierQ : disputesQ;

  if (activeQ.isLoading) return <LoadingState label="Загрузка отзывов…" />;
  if (activeQ.isError) {
    const meta = activeQ.error ? getAdminErrorDisplay(activeQ.error) : null;
    return (
      <ErrorState
        title={meta?.title ?? 'Не удалось загрузить'}
        description={meta?.description ?? meta?.rawMessage}
        onRetry={() => activeQ.refetch()}
      />
    );
  }

  const data = activeQ.data as any;
  const totalPages = Math.max(1, data?.pages ?? 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Отзывы"
        subtitle="Модерация отзывов, ответы поставщиков и очередь оспариваний"
        actions={
          <Button type="button" variant="outline" onClick={() => activeQ.refetch()}>
            Обновить
          </Button>
        }
      />

      <div className="flex flex-wrap gap-1 border-b pb-2">
        <Button type="button" size="sm" variant={tab === 'reviews' ? 'secondary' : 'ghost'} onClick={() => { setTab('reviews'); setPage(1); }}>
          Отзывы
        </Button>
        <Button type="button" size="sm" variant={tab === 'supplierResponses' ? 'secondary' : 'ghost'} onClick={() => { setTab('supplierResponses'); setPage(1); }}>
          Ответы поставщика
        </Button>
        <Button type="button" size="sm" variant={tab === 'disputes' ? 'secondary' : 'ghost'} onClick={() => { setTab('disputes'); setPage(1); }}>
          Оспаривания
        </Button>
        {tab === 'reviews' && (reviewsQ.data?.pendingCount != null) ? (
          <div className="ml-auto text-xs text-muted-foreground">
            На модерации: <span className="tabular-nums text-foreground">{reviewsQ.data.pendingCount}</span>
          </div>
        ) : null}
      </div>

      {tab === 'reviews' ? (
        <div className="rounded-lg border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Статус</span>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              >
                <option value="">Все</option>
                <option value="PENDING">На модерации (PENDING)</option>
                <option value="APPROVED">Одобрено (APPROVED)</option>
                <option value="REJECTED">Отклонено (REJECTED)</option>
                <option value="HIDDEN">Скрыто (HIDDEN)</option>
              </select>
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-muted-foreground">ID события (необязательно)</span>
              <Input value={eventId} onChange={(e) => { setEventId(e.target.value); setPage(1); }} placeholder="UUID события" />
            </label>
          </div>
        </div>
      ) : null}

      <DataTableShell
        footer={
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Страница <span className="tabular-nums text-foreground">{page} / {totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Назад
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Вперёд
              </Button>
            </div>
          </div>
        }
      >
        {tab === 'reviews' ? (
          <ReviewsTable
            items={(reviewsQ.data?.items ?? []) as AdminReviewRow[]}
            onApprove={(id) => approveM.mutate(id)}
            onReject={(id) => {
              const text = prompt('Причина отклонения (adminComment)', '') ?? '';
              rejectM.mutate({ id, adminComment: text.trim() || undefined });
            }}
            onDelete={(id) => deleteM.mutate(id)}
            busy={approveM.isPending || rejectM.isPending || deleteM.isPending}
          />
        ) : tab === 'supplierResponses' ? (
          <SupplierResponsesTable
            items={(supplierQ.data?.items ?? []) as SupplierResponseRow[]}
            onApprove={(id) => approveRespM.mutate(id)}
            onReject={(id) => {
              const text = prompt('Комментарий модерации', '') ?? '';
              if (!text.trim()) return;
              rejectRespM.mutate({ id, moderationComment: text.trim() });
            }}
            busy={approveRespM.isPending || rejectRespM.isPending}
          />
        ) : (
          <DisputesTable
            items={(disputesQ.data?.items ?? []) as DisputeRow[]}
            onResolve={(id) => {
              const status = prompt('Код решения для API: KEEP, HIDE или DELETE', 'KEEP') ?? '';
              if (!status.trim()) return;
              const comment = prompt('Комментарий решения (опционально)', '') ?? '';
              resolveDisputeM.mutate({ id, status: status.trim(), decisionComment: comment.trim() || undefined });
            }}
            busy={resolveDisputeM.isPending}
          />
        )}
      </DataTableShell>
    </div>
  );
}

function ReviewsTable({
  items,
  onApprove,
  onReject,
  onDelete,
  busy,
}: {
  items: AdminReviewRow[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-sm">
        <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Entity</th>
            <th className="px-4 py-3 text-left">Review</th>
            <th className="px-4 py-3 text-center">Status</th>
            <th className="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                Нет отзывов
              </td>
            </tr>
          ) : (
            items.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="px-4 py-3 align-top">
                  <div className="font-medium">
                    {r.event?.id ? (
                      <Link className="hover:underline" to={`/admin-v3/events/${encodeURIComponent(r.event.id)}`}>
                        {r.event?.title ?? r.event.id}
                      </Link>
                    ) : r.venue?.id ? (
                      <Link className="hover:underline" to={`/admin-v3/venues/${encodeURIComponent(r.venue.id)}`}>
                        {r.venue?.title ?? r.venue.id}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">{r.event?.slug ?? r.venue?.slug ?? '—'}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    created: {r.createdAt ? new Date(r.createdAt).toLocaleString('ru-RU') : '—'}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="text-xs text-muted-foreground">
                    {r.authorName ?? '—'}{r.authorEmail ? ` · ${r.authorEmail}` : ''}
                  </div>
                  <div className="mt-1">{(r as any).text ?? '—'}</div>
                  <div className="mt-2 text-xs text-muted-foreground">rating: {r.rating}</div>
                </td>
                <td className="px-4 py-3 text-center align-top">
                  <Badge variant={r.status === 'APPROVED' ? 'info' : r.status === 'REJECTED' ? 'warning' : 'outline'}>
                    {r.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center align-top">
                  <div className="flex flex-wrap justify-center gap-2">
                    {r.event?.id ? (
                      <Button type="button" variant="secondary" size="sm" disabled={busy} asChild>
                        <Link to={`/admin-v3/events/${encodeURIComponent(r.event.id)}`}>Открыть</Link>
                      </Button>
                    ) : r.venue?.id ? (
                      <Button type="button" variant="secondary" size="sm" disabled={busy} asChild>
                        <Link to={`/admin-v3/venues/${encodeURIComponent(r.venue.id)}`}>Открыть</Link>
                      </Button>
                    ) : null}
                    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onApprove(r.id)}>
                      Approve
                    </Button>
                    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onReject(r.id)}>
                      Reject
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        if (!confirm('Удалить отзыв?')) return;
                        onDelete(r.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SupplierResponsesTable({
  items,
  onApprove,
  onReject,
  busy,
}: {
  items: SupplierResponseRow[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  busy: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Response</th>
            <th className="px-4 py-3 text-center">Status</th>
            <th className="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                Нет ответов
              </td>
            </tr>
          ) : (
            items.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="px-4 py-3 align-top">
                  <div className="font-mono text-xs text-muted-foreground">{r.id}</div>
                  <div className="mt-1">{r.text}</div>
                </td>
                <td className="px-4 py-3 text-center align-top">
                  <Badge variant="outline">{r.status}</Badge>
                </td>
                <td className="px-4 py-3 text-center align-top">
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onApprove(r.id)}>
                      Approve
                    </Button>
                    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onReject(r.id)}>
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function DisputesTable({
  items,
  onResolve,
  busy,
}: {
  items: DisputeRow[];
  onResolve: (id: string) => void;
  busy: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Dispute</th>
            <th className="px-4 py-3 text-center">Status</th>
            <th className="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                Нет оспариваний
              </td>
            </tr>
          ) : (
            items.map((d) => (
              <tr key={d.id} className="border-b">
                <td className="px-4 py-3 align-top">
                  <div className="font-mono text-xs text-muted-foreground">{d.id}</div>
                  <div className="mt-1 text-xs text-muted-foreground">reviewId: {d.reviewId}</div>
                </td>
                <td className="px-4 py-3 text-center align-top">
                  <Badge variant="outline">{d.status}</Badge>
                </td>
                <td className="px-4 py-3 text-center align-top">
                  <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onResolve(d.id)}>
                    Resolve
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

