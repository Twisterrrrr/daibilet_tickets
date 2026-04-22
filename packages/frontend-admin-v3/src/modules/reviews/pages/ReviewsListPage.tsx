import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { DataTableShell } from '@/components/shared/table/DataTableShell';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  DISPUTE_REASON_LABELS,
  DISPUTE_RESOLVE_OPTIONS,
  REVIEW_STATUS_LABELS,
  reviewStars,
} from '@/modules/reviews/review-moderation-labels';
import { cn } from '@/shared/lib/cn';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const REVIEW_STATUS_TABS = ['PENDING', 'PENDING_EMAIL', 'APPROVED', 'REJECTED', 'HIDDEN'] as const;

function readInt(v: string | null, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function reviewStatusBadgeVariant(
  status: string,
): 'success' | 'warning' | 'danger' | 'info' | 'outline' {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED' || status === 'HIDDEN') return 'danger';
  if (status === 'PENDING') return 'warning';
  if (status === 'PENDING_EMAIL') return 'info';
  return 'outline';
}

export function ReviewsListPage() {
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();

  const [tab, setTab] = React.useState<'reviews' | 'supplierResponses' | 'disputes'>('reviews');

  const [status, setStatus] = React.useState<string>('PENDING');
  const [eventId, setEventId] = React.useState<string>('');
  const [page, setPage] = React.useState<number>(1);
  const limit = 25;

  const [rejectDialogId, setRejectDialogId] = React.useState<string | null>(null);
  const [rejectComment, setRejectComment] = React.useState('');
  const [rejectResponseId, setRejectResponseId] = React.useState<string | null>(null);
  const [rejectResponseComment, setRejectResponseComment] = React.useState('');
  const [resolveDialogId, setResolveDialogId] = React.useState<string | null>(null);
  const [resolveStatus, setResolveStatus] = React.useState('');
  const [resolveComment, setResolveComment] = React.useState('');
  const [deleteReviewId, setDeleteReviewId] = React.useState<string | null>(null);

  const didInitFromUrl = React.useRef(false);
  React.useEffect(() => {
    if (didInitFromUrl.current) return;
    didInitFromUrl.current = true;
    const t = sp.get('tab');
    if (t === 'reviews' || t === 'supplierResponses' || t === 'disputes') setTab(t);
    setStatus(sp.get('status') || 'PENDING');
    setEventId(sp.get('eventId') ?? '');
    setPage(readInt(sp.get('page'), 1));
  }, [sp]);

  React.useEffect(() => {
    if (!didInitFromUrl.current) return;
    const out = new URLSearchParams(sp);
    if (tab !== 'reviews') out.set('tab', tab);
    else out.delete('tab');
    if (status && status !== 'PENDING') out.set('status', status);
    else out.delete('status');
    if (eventId) out.set('eventId', eventId);
    else out.delete('eventId');
    if (page !== 1) out.set('page', String(page));
    else out.delete('page');
    if (out.toString() !== sp.toString()) setSp(out, { replace: true });
  }, [tab, status, eventId, page, sp, setSp]);

  const reviewsQ = useQuery({
    queryKey: ['admin-reviews', { status, eventId, page, limit }],
    queryFn: () =>
      fetchAdminReviews({
        status: status || undefined,
        eventId: eventId || undefined,
        page,
        limit,
      }),
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
      setRejectDialogId(null);
      setRejectComment('');
      await qc.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
  });
  const deleteM = useMutation({
    mutationFn: async (id: string) => deleteAdminReview(id),
    onSuccess: async () => {
      setDeleteReviewId(null);
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
    mutationFn: async ({ id, moderationComment }: { id: string; moderationComment?: string }) =>
      rejectSupplierResponse(id, moderationComment),
    onSuccess: async () => {
      setRejectResponseId(null);
      setRejectResponseComment('');
      await qc.invalidateQueries({ queryKey: ['admin-reviews-supplier-responses'] });
    },
  });

  const resolveDisputeM = useMutation({
    mutationFn: async ({ id, status: st, decisionComment }: { id: string; status: string; decisionComment?: string }) =>
      resolveReviewDispute(id, { status: st, decisionComment }),
    onSuccess: async () => {
      setResolveDialogId(null);
      setResolveStatus('');
      setResolveComment('');
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

  const data = activeQ.data as { items: unknown[]; pages?: number; total?: number; pendingCount?: number };
  const totalPages = Math.max(1, data?.pages ?? 1);
  const pendingCount = reviewsQ.data?.pendingCount ?? 0;
  const busyReview = approveM.isPending || rejectM.isPending || deleteM.isPending;
  const busyResp = approveRespM.isPending || rejectRespM.isPending;
  const busyDispute = resolveDisputeM.isPending;

  const subtitle =
    tab === 'reviews'
      ? `${reviewsQ.data?.total ?? 0} отзывов · ${REVIEW_STATUS_LABELS[status] ?? status}`
      : tab === 'supplierResponses'
        ? `${supplierQ.data?.total ?? 0} ответов на модерации`
        : `${disputesQ.data?.total ?? 0} оспариваний в очереди`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Отзывы"
        subtitle={subtitle}
        meta={
          tab === 'reviews' && pendingCount > 0 ? (
            <span className="inline-flex items-center gap-2">
              <Badge variant="warning" className="tabular-nums">
                На модерации (PENDING): {pendingCount}
              </Badge>
            </span>
          ) : null
        }
        actions={
          <Button type="button" variant="outline" onClick={() => activeQ.refetch()}>
            Обновить
          </Button>
        }
      />

      <div className="flex flex-wrap gap-1 border-b pb-2">
        <Button
          type="button"
          size="sm"
          variant={tab === 'reviews' ? 'secondary' : 'ghost'}
          onClick={() => {
            setTab('reviews');
            setPage(1);
          }}
        >
          Отзывы
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === 'supplierResponses' ? 'secondary' : 'ghost'}
          onClick={() => {
            setTab('supplierResponses');
            setPage(1);
          }}
        >
          Ответы поставщика
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === 'disputes' ? 'secondary' : 'ghost'}
          onClick={() => {
            setTab('disputes');
            setPage(1);
          }}
        >
          Оспаривания
        </Button>
      </div>

      {tab === 'reviews' ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {REVIEW_STATUS_TABS.map((st) => (
              <Button
                key={st}
                type="button"
                size="sm"
                variant={status === st ? 'secondary' : 'ghost'}
                className="gap-1.5"
                onClick={() => {
                  setStatus(st);
                  setPage(1);
                }}
              >
                {REVIEW_STATUS_LABELS[st]}
                {st === 'PENDING' && pendingCount > 0 ? (
                  <Badge variant="outline" className="h-5 min-w-[1.25rem] px-1 tabular-nums">
                    {pendingCount}
                  </Badge>
                ) : null}
              </Button>
            ))}
          </div>
          <div className="rounded-lg border bg-card p-4">
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">ID события (необязательно)</span>
              <Input
                value={eventId}
                onChange={(e) => {
                  setEventId(e.target.value);
                  setPage(1);
                }}
                placeholder="UUID события"
              />
            </label>
          </div>
        </div>
      ) : null}

      <DataTableShell
        footer={
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Страница{' '}
              <span className="tabular-nums text-foreground">
                {page} / {totalPages}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Назад
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Вперёд
              </Button>
            </div>
          </div>
        }
      >
        {tab === 'reviews' ? (
          <ReviewsCards
            items={(reviewsQ.data?.items ?? []) as AdminReviewRow[]}
            busy={busyReview}
            onApprove={(id) => approveM.mutate(id)}
            onOpenReject={(id) => {
              setRejectDialogId(id);
              setRejectComment('');
            }}
            onOpenDelete={(id) => setDeleteReviewId(id)}
          />
        ) : tab === 'supplierResponses' ? (
          <SupplierResponseCards
            items={(supplierQ.data?.items ?? []) as SupplierResponseRow[]}
            busy={busyResp}
            onApprove={(id) => approveRespM.mutate(id)}
            onOpenReject={(id) => {
              setRejectResponseId(id);
              setRejectResponseComment('');
            }}
          />
        ) : (
          <DisputeCards
            items={(disputesQ.data?.items ?? []) as DisputeRow[]}
            busy={busyDispute}
            onOpenResolve={(id) => {
              setResolveDialogId(id);
              setResolveStatus('');
              setResolveComment('');
            }}
          />
        )}
      </DataTableShell>

      <Dialog open={!!rejectResponseId} onOpenChange={(open) => !open && setRejectResponseId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отклонить ответ поставщика</DialogTitle>
            <DialogDescription>Укажите причину отклонения (необязательно).</DialogDescription>
          </DialogHeader>
          <textarea
            className={cn(
              'flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
            placeholder="Причина (необязательно)"
            value={rejectResponseComment}
            onChange={(e) => setRejectResponseComment(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectResponseId(null)}>
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={rejectRespM.isPending}
              onClick={() => {
                if (!rejectResponseId) return;
                rejectRespM.mutate({ id: rejectResponseId, moderationComment: rejectResponseComment.trim() || undefined });
              }}
            >
              Отклонить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resolveDialogId} onOpenChange={(open) => !open && setResolveDialogId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Закрыть оспаривание</DialogTitle>
            <DialogDescription>Выберите решение. Комментарий опционально.</DialogDescription>
          </DialogHeader>
          <select
            value={resolveStatus}
            onChange={(e) => setResolveStatus(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Решение</option>
            {DISPUTE_RESOLVE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <textarea
            className={cn(
              'flex min-h-[56px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
            placeholder="Комментарий (необязательно)"
            value={resolveComment}
            onChange={(e) => setResolveComment(e.target.value)}
            rows={2}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResolveDialogId(null)}>
              Отмена
            </Button>
            <Button
              type="button"
              disabled={!resolveStatus || resolveDisputeM.isPending}
              onClick={() => {
                if (!resolveDialogId || !resolveStatus) return;
                resolveDisputeM.mutate({
                  id: resolveDialogId,
                  status: resolveStatus,
                  decisionComment: resolveComment.trim() || undefined,
                });
              }}
            >
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectDialogId} onOpenChange={(open) => !open && setRejectDialogId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отклонить отзыв</DialogTitle>
            <DialogDescription>
              Укажите причину отклонения (необязательно). Отзыв будет скрыт с сайта.
            </DialogDescription>
          </DialogHeader>
          <textarea
            className={cn(
              'flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
            placeholder="Причина отклонения (необязательно)"
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectDialogId(null)}>
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={rejectM.isPending}
              onClick={() => {
                if (!rejectDialogId) return;
                rejectM.mutate({ id: rejectDialogId, adminComment: rejectComment.trim() || undefined });
              }}
            >
              Отклонить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteReviewId} onOpenChange={(open) => !open && setDeleteReviewId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить отзыв</DialogTitle>
            <DialogDescription>Удалить отзыв навсегда? Это действие нельзя отменить.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteReviewId(null)}>
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteM.isPending}
              onClick={() => {
                if (!deleteReviewId) return;
                deleteM.mutate(deleteReviewId);
              }}
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReviewsCards({
  items,
  busy,
  onApprove,
  onOpenReject,
  onOpenDelete,
}: {
  items: AdminReviewRow[];
  busy: boolean;
  onApprove: (id: string) => void;
  onOpenReject: (id: string) => void;
  onOpenDelete: (id: string) => void;
}) {
  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Нет отзывов с таким статусом</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((r) => (
        <div key={r.id} className="rounded-lg border bg-card p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{r.authorName ?? '—'}</span>
                <span className="text-sm tracking-wider text-amber-500">{reviewStars(r.rating)}</span>
                <Badge variant={reviewStatusBadgeVariant(r.status)}>{REVIEW_STATUS_LABELS[r.status] ?? r.status}</Badge>
                {r.isVerified ? (
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <Badge variant="success">Подтверждён</Badge>
                  </span>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>{r.authorEmail ?? '—'}</span>
                <span>{r.createdAt ? new Date(r.createdAt).toLocaleDateString('ru-RU') : '—'}</span>
                {r.voucherCode ? <span>Ваучер: {r.voucherCode}</span> : null}
              </div>
              {r.event?.id ? (
                <Link
                  className="mt-1 block text-xs text-primary hover:underline"
                  to={`/admin-v3/events/${encodeURIComponent(r.event.id)}`}
                >
                  {r.event.title}
                </Link>
              ) : r.venue?.id ? (
                <Link
                  className="mt-1 block text-xs text-primary hover:underline"
                  to={`/admin-v3/venues/${encodeURIComponent(r.venue.id)}`}
                >
                  {r.venue.title}
                </Link>
              ) : null}
              {r.title ? <p className="mt-2 text-sm font-medium">{r.title}</p> : null}
              <p className="mt-1 line-clamp-4 text-sm text-muted-foreground">{r.text ?? '—'}</p>
              {r.photos && r.photos.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.photos.map((p) => (
                    <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={p.thumbUrl}
                        alt=""
                        className="h-12 w-12 rounded border object-cover transition hover:border-primary"
                      />
                    </a>
                  ))}
                </div>
              ) : null}
              {r.helpfulCount != null && r.helpfulCount > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">Полезный: {r.helpfulCount}</p>
              ) : null}
              {r.adminComment ? (
                <p className="mt-2 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">Причина: {r.adminComment}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              {r.event?.id ? (
                <Button type="button" variant="secondary" size="sm" disabled={busy} asChild>
                  <Link to={`/admin-v3/events/${encodeURIComponent(r.event.id)}`}>Событие</Link>
                </Button>
              ) : r.venue?.id ? (
                <Button type="button" variant="secondary" size="sm" disabled={busy} asChild>
                  <Link to={`/admin-v3/venues/${encodeURIComponent(r.venue.id)}`}>Площадка</Link>
                </Button>
              ) : null}
              {(r.status === 'PENDING' || r.status === 'PENDING_EMAIL') && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200"
                    disabled={busy}
                    onClick={() => onApprove(r.id)}
                  >
                    Одобрить
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-rose-950 dark:text-rose-200"
                    disabled={busy}
                    onClick={() => onOpenReject(r.id)}
                  >
                    Отклонить
                  </Button>
                </>
              )}
              {r.status === 'REJECTED' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200"
                  disabled={busy}
                  onClick={() => onApprove(r.id)}
                >
                  Вернуть
                </Button>
              )}
              {r.status === 'APPROVED' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-200"
                  disabled={busy}
                  onClick={() => onOpenReject(r.id)}
                >
                  Скрыть
                </Button>
              )}
              {r.status === 'HIDDEN' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200"
                  disabled={busy}
                  onClick={() => onApprove(r.id)}
                >
                  Вернуть (опубликовать)
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onOpenDelete(r.id)}>
                Удалить
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SupplierResponseCards({
  items,
  busy,
  onApprove,
  onOpenReject,
}: {
  items: SupplierResponseRow[];
  busy: boolean;
  onApprove: (id: string) => void;
  onOpenReject: (id: string) => void;
}) {
  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Нет ответов на модерации</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((r) => {
        const rev = r.review;
        return (
          <div key={r.id} className="rounded-lg border bg-card p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{rev?.authorName ?? '—'}</span>
                  <span className="text-sm text-amber-500">{rev ? reviewStars(rev.rating) : ''}</span>
                  <Badge variant="outline">{r.status}</Badge>
                  {rev?.event?.id ? (
                    <Link
                      className="text-xs text-primary hover:underline"
                      to={`/admin-v3/events/${encodeURIComponent(rev.event.id)}`}
                    >
                      {rev.event.title}
                    </Link>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{rev?.text ?? '—'}</p>
                <div className="mt-3 rounded-md border-l-4 border-primary/50 bg-muted/30 px-3 py-2">
                  <p className="text-xs font-medium text-muted-foreground">Ответ поставщика</p>
                  <p className="mt-1 text-sm">{r.text}</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200"
                  disabled={busy}
                  onClick={() => onApprove(r.id)}
                >
                  Одобрить
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-rose-950 dark:text-rose-200"
                  disabled={busy}
                  onClick={() => onOpenReject(r.id)}
                >
                  Отклонить
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DisputeCards({
  items,
  busy,
  onOpenResolve,
}: {
  items: DisputeRow[];
  busy: boolean;
  onOpenResolve: (id: string) => void;
}) {
  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Нет оспариваний в очереди</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((d) => (
        <div key={d.id} className="rounded-lg border bg-card p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="warning">Оспаривание</Badge>
                <span className="font-semibold">{d.review.authorName}</span>
                <span className="text-sm text-amber-500">{reviewStars(d.review.rating)}</span>
                <span className="text-xs text-muted-foreground">
                  {DISPUTE_REASON_LABELS[d.reasonCode] ?? d.reasonCode}
                </span>
              </div>
              <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{d.review.text}</p>
              <div className="mt-3 rounded-md border-l-4 border-amber-500/50 bg-amber-50/50 px-3 py-2 dark:bg-amber-950/30">
                <p className="text-xs font-medium text-muted-foreground">Претензия поставщика</p>
                <p className="mt-1 text-sm">{d.claimText}</p>
              </div>
              {d.evidence && d.evidence.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {d.evidence.map((ev) => (
                    <a
                      key={ev.id}
                      href={ev.url ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      {ev.fileName}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onOpenResolve(d.id)}>
              Закрыть
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
