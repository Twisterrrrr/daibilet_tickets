import { CheckCircle2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { CountBadge, EmptyState, ErrorState, PageHeader, StatusBadge } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface ReviewPhoto {
  id: string;
  url: string;
  thumbUrl: string;
}

interface Review {
  id: string;
  rating: number;
  title: string | null;
  text: string;
  authorName: string;
  authorEmail: string;
  isVerified: boolean;
  helpfulCount: number;
  voucherCode: string | null;
  status: 'PENDING_EMAIL' | 'PENDING' | 'APPROVED' | 'REJECTED';
  adminComment: string | null;
  createdAt: string;
  event: { id: string; title: string; slug: string } | null;
  photos: ReviewPhoto[];
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_EMAIL: 'Ждёт email',
  PENDING: 'На модерации',
  APPROVED: 'Одобрен',
  REJECTED: 'Отклонён',
};

interface SupplierResponseItem {
  id: string;
  text: string;
  status: string;
  createdAt: string;
  review: {
    id: string;
    rating: number;
    title: string | null;
    text: string;
    authorName: string;
    createdAt: string;
    event: { id: string; title: string; slug: string } | null;
  };
}

interface DisputeItem {
  id: string;
  reasonCode: string;
  claimText: string;
  status: string;
  createdAt: string;
  review: {
    id: string;
    rating: number;
    title: string | null;
    text: string;
    authorName: string;
    createdAt: string;
    status: string;
    event: { id: string; title: string; slug: string } | null;
  };
  evidence: { id: string; storageKey: string; fileName: string; url?: string }[];
}

const DISPUTE_REASONS: Record<string, string> = {
  FALSE_FACTS: 'Неверные факты',
  OFF_TOPIC: 'Не по теме',
  ABUSIVE: 'Оскорбления',
};

const RESOLVE_OPTIONS = [
  { value: 'RESOLVED_KEEP', label: 'Оставить отзыв' },
  { value: 'RESOLVED_HIDE', label: 'Скрыть отзыв' },
  { value: 'RESOLVED_DELETE', label: 'Удалить отзыв' },
];

function stars(n: number) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

export function ReviewsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [section, setSection] = useState<'reviews' | 'responses' | 'disputes'>('reviews');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectResponseId, setRejectResponseId] = useState<string | null>(null);
  const [rejectResponseComment, setRejectResponseComment] = useState('');

  const [responses, setResponses] = useState<SupplierResponseItem[]>([]);
  const [responsesTotal, setResponsesTotal] = useState(0);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [responsesError, setResponsesError] = useState<string | null>(null);

  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [disputesTotal, setDisputesTotal] = useState(0);
  const [disputesLoading, setDisputesLoading] = useState(false);
  const [disputesError, setDisputesError] = useState<string | null>(null);
  const [resolveDialogId, setResolveDialogId] = useState<string | null>(null);
  const [resolveStatus, setResolveStatus] = useState('');
  const [resolveComment, setResolveComment] = useState('');

  const statusFilter = (searchParams.get('status') || 'PENDING') as
    | 'PENDING_EMAIL'
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED';
  const page = Number(searchParams.get('page')) || 1;

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setReviewsError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', String(page));
      params.set('limit', '20');
      const res = await adminApi.get<{
        items: Review[];
        total: number;
        pages: number;
        pendingCount: number;
      }>(`/admin/reviews?${params}`);
      setReviews(res.items);
      setTotal(res.total);
      setPages(res.pages);
      setPendingCount(res.pendingCount);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки отзывов';
      setReviews([]);
      setTotal(0);
      setPages(1);
      setPendingCount(0);
      setReviewsError(message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const fetchResponses = useCallback(async () => {
    setResponsesLoading(true);
    setResponsesError(null);
    try {
      const res = await adminApi.get<{ items: SupplierResponseItem[]; total: number; page: number; pages: number }>(
        '/admin/reviews/supplier-responses?limit=20',
      );
      setResponses(res.items);
      setResponsesTotal(res.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки ответов поставщика';
      setResponses([]);
      setResponsesTotal(0);
      setResponsesError(message);
    } finally {
      setResponsesLoading(false);
    }
  }, []);

  const fetchDisputes = useCallback(async () => {
    setDisputesLoading(true);
    setDisputesError(null);
    try {
      const res = await adminApi.get<{ items: DisputeItem[]; total: number; page: number; pages: number }>(
        '/admin/reviews/disputes?limit=20',
      );
      setDisputes(res.items);
      setDisputesTotal(res.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки оспариваний';
      setDisputes([]);
      setDisputesTotal(0);
      setDisputesError(message);
    } finally {
      setDisputesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (section === 'responses') fetchResponses();
  }, [section, fetchResponses]);

  useEffect(() => {
    if (section === 'disputes') fetchDisputes();
  }, [section, fetchDisputes]);

  const setFilter = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams);
    p.set(key, value);
    p.delete('page');
    setSearchParams(p);
  };

  const handleApprove = async (id: string) => {
    try {
      await adminApi.patch(`/admin/reviews/${id}/approve`);
      toast.success('Отзыв одобрен');
      fetchReviews();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const handleReject = async () => {
    if (!rejectDialogId) return;
    try {
      await adminApi.patch(`/admin/reviews/${rejectDialogId}/reject`, {
        adminComment: rejectComment || undefined,
      });
      setRejectDialogId(null);
      setRejectComment('');
      fetchReviews();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить отзыв навсегда?')) return;
    try {
      await adminApi.delete(`/admin/reviews/${id}`);
      toast.success('Отзыв удалён');
      fetchReviews();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const handleApproveResponse = async (id: string) => {
    try {
      await adminApi.patch(`/admin/reviews/supplier-responses/${id}/approve`);
      toast.success('Ответ одобрен');
      fetchResponses();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const handleRejectResponse = async () => {
    if (!rejectResponseId) return;
    try {
      await adminApi.patch(`/admin/reviews/supplier-responses/${rejectResponseId}/reject`, {
        moderationComment: rejectResponseComment || undefined,
      });
      toast.success('Ответ отклонён');
      setRejectResponseId(null);
      setRejectResponseComment('');
      fetchResponses();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const handleResolveDispute = async () => {
    if (!resolveDialogId || !resolveStatus) return;
    try {
      await adminApi.patch(`/admin/reviews/disputes/${resolveDialogId}/resolve`, {
        status: resolveStatus,
        decisionComment: resolveComment || undefined,
      });
      toast.success('Оспаривание закрыто');
      setResolveDialogId(null);
      setResolveStatus('');
      setResolveComment('');
      fetchDisputes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const ReviewsContent = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
    if (reviews.length === 0) {
      return <EmptyState title="Нет отзывов с таким статусом" />;
    }
    return (
      <div className="space-y-3">
        {reviews.map((r) => (
          <Card key={r.id}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{r.authorName}</span>
                    <span className="text-amber-500 text-sm tracking-wider">{stars(r.rating)}</span>
                    <StatusBadge
                      tone={r.status === 'APPROVED' ? 'success' : r.status === 'REJECTED' ? 'danger' : r.status === 'PENDING' ? 'warning' : 'neutral'}
                      label={STATUS_LABELS[r.status]}
                    />
                    {r.isVerified && (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <StatusBadge tone="success" label="Подтвержден" />
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{r.authorEmail}</span>
                    <span>{new Date(r.createdAt).toLocaleDateString('ru-RU')}</span>
                    {r.voucherCode && <span>Ваучер: {r.voucherCode}</span>}
                  </div>
                  {r.event && (
                    <Link to={`/events/${r.event.id}`} className="mt-1 block text-xs text-primary hover:underline">
                      {r.event.title}
                    </Link>
                  )}
                  {r.title && <p className="mt-2 text-sm font-medium">{r.title}</p>}
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{r.text}</p>
                  {r.photos && r.photos.length > 0 && (
                    <div className="mt-2 flex gap-1.5">
                      {r.photos.map((p) => (
                        <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={p.thumbUrl}
                            alt="Фото"
                            className="h-12 w-12 rounded object-cover border hover:border-primary transition"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  {r.helpfulCount > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">👍 Полезный: {r.helpfulCount}</p>
                  )}
                  {r.adminComment && (
                    <p className="mt-2 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
                      Причина: {r.adminComment}
                    </p>
                  )}
                </div>
                <div className="flex flex-shrink-0 flex-wrap gap-1.5">
                  {r.status === 'PENDING' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                        onClick={() => handleApprove(r.id)}
                      >
                        Одобрить
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                        onClick={() => {
                          setRejectDialogId(r.id);
                          setRejectComment('');
                        }}
                      >
                        Отклонить
                      </Button>
                    </>
                  )}
                  {r.status === 'REJECTED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                      onClick={() => handleApprove(r.id)}
                    >
                      Вернуть
                    </Button>
                  )}
                  {r.status === 'APPROVED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                      onClick={() => {
                        setRejectDialogId(r.id);
                        setRejectComment('');
                      }}
                    >
                      Скрыть
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)}>
                    Удалить
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (section === 'reviews' && reviewsError) {
    return (
      <ErrorState
        title="Не удалось загрузить отзывы"
        description={reviewsError}
        action={
          <Button variant="outline" onClick={fetchReviews}>
            Повторить попытку
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            Отзывы
            {pendingCount > 0 && (
              <CountBadge count={pendingCount} className="ml-1" />
            )}
          </span>
        }
        subtitle={
          section === 'reviews'
            ? `${total} отзывов • ${STATUS_LABELS[statusFilter]}`
            : section === 'responses'
              ? `${responsesTotal} ответов на модерации`
              : `${disputesTotal} оспариваний`
        }
      />

      {/* Section tabs */}
      <Tabs value={section} onValueChange={(v) => setSection(v as 'reviews' | 'responses' | 'disputes')}>
        <TabsList className="mb-4 grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="reviews">Отзывы</TabsTrigger>
          <TabsTrigger value="responses">Ответы поставщика</TabsTrigger>
          <TabsTrigger value="disputes">Оспаривания</TabsTrigger>
        </TabsList>

        <TabsContent value="responses" className="mt-4">
          {responsesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}><CardContent className="py-4"><Skeleton className="h-4 w-48" /><Skeleton className="mt-2 h-3 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : responsesError ? (
            <ErrorState
              title="Не удалось загрузить ответы поставщика"
              description={responsesError}
              action={
                <Button variant="outline" size="sm" onClick={fetchResponses}>
                  Повторить
                </Button>
              }
            />
          ) : responses.length === 0 ? (
            <EmptyState title="Нет ответов на модерации" />
          ) : (
            <div className="space-y-3">
              {responses.map((r) => (
                <Card key={r.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{r.review.authorName}</span>
                          <span className="text-amber-500 text-sm">{stars(r.review.rating)}</span>
                          {r.review.event && <Link to={`/events/${r.review.event.id}`} className="text-xs text-primary hover:underline">{r.review.event.title}</Link>}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{r.review.text}</p>
                        <div className="mt-3 rounded-md border-l-4 border-primary/50 bg-muted/30 px-3 py-2">
                          <p className="text-xs font-medium text-muted-foreground">Ответ поставщика</p>
                          <p className="mt-1 text-sm">{r.text}</p>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 gap-1.5">
                        <Button variant="outline" size="sm" className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" onClick={() => handleApproveResponse(r.id)}>Одобрить</Button>
                        <Button variant="outline" size="sm" className="border-red-200 bg-red-50 text-red-600 hover:bg-red-100" onClick={() => { setRejectResponseId(r.id); setRejectResponseComment(''); }}>Отклонить</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="disputes" className="mt-4">
          {disputesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}><CardContent className="py-4"><Skeleton className="h-4 w-48" /><Skeleton className="mt-2 h-3 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : disputesError ? (
            <ErrorState
              title="Не удалось загрузить оспаривания"
              description={disputesError}
              action={
                <Button variant="outline" size="sm" onClick={fetchDisputes}>
                  Повторить
                </Button>
              }
            />
          ) : disputes.length === 0 ? (
            <EmptyState title="Нет оспариваний" />
          ) : (
            <div className="space-y-3">
              {disputes.map((d) => (
                <Card key={d.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone="warning" label="Оспаривание" />
                          <span className="font-semibold">{d.review.authorName}</span>
                          <span className="text-amber-500 text-sm">{stars(d.review.rating)}</span>
                          <span className="text-xs text-muted-foreground">{DISPUTE_REASONS[d.reasonCode] || d.reasonCode}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{d.review.text}</p>
                        <div className="mt-3 rounded-md border-l-4 border-amber-500/50 bg-amber-50/50 px-3 py-2">
                          <p className="text-xs font-medium text-muted-foreground">Претензия поставщика</p>
                          <p className="mt-1 text-sm">{d.claimText}</p>
                        </div>
                        {d.evidence && d.evidence.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {d.evidence.map((ev) => (
                              <a key={ev.id} href={ev.url || `/uploads/ev/${ev.storageKey}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">{ev.fileName}</a>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => { setResolveDialogId(d.id); setResolveStatus(''); setResolveComment(''); }}>Закрыть</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="mt-4">
      {/* Status tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setFilter('status', v)}>
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="PENDING" className="gap-1.5">
            {STATUS_LABELS.PENDING}
            {pendingCount > 0 && (
              <CountBadge count={pendingCount} className="ml-0.5" />
            )}
          </TabsTrigger>
          <TabsTrigger value="PENDING_EMAIL">{STATUS_LABELS.PENDING_EMAIL}</TabsTrigger>
          <TabsTrigger value="APPROVED">{STATUS_LABELS.APPROVED}</TabsTrigger>
          <TabsTrigger value="REJECTED">{STATUS_LABELS.REJECTED}</TabsTrigger>
        </TabsList>
        <TabsContent value="PENDING" className="mt-4">
          <ReviewsContent />
        </TabsContent>
        <TabsContent value="PENDING_EMAIL" className="mt-4">
          <ReviewsContent />
        </TabsContent>
        <TabsContent value="APPROVED" className="mt-4">
          <ReviewsContent />
        </TabsContent>
        <TabsContent value="REJECTED" className="mt-4">
          <ReviewsContent />
        </TabsContent>
      </Tabs>
        </TabsContent>
      </Tabs>

      {/* Pagination - reviews only */}
      {section === 'reviews' && pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              variant={page === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('page', String(p))}
            >
              {p}
            </Button>
          ))}
        </div>
      )}

      {/* Reject response dialog */}
      <Dialog open={!!rejectResponseId} onOpenChange={(open) => !open && setRejectResponseId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отклонить ответ поставщика</DialogTitle>
            <DialogDescription>
              Укажите причину отклонения (необязательно).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Причина (необязательно)"
            value={rejectResponseComment}
            onChange={(e) => setRejectResponseComment(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectResponseId(null)}>Отмена</Button>
            <Button variant="destructive" onClick={handleRejectResponse}>Отклонить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve dispute dialog */}
      <Dialog open={!!resolveDialogId} onOpenChange={(open) => !open && setResolveDialogId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Закрыть оспаривание</DialogTitle>
            <DialogDescription>
              Выберите решение. Комментарий опционально.
            </DialogDescription>
          </DialogHeader>
          <select
            value={resolveStatus}
            onChange={(e) => setResolveStatus(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="">Решение</option>
            {RESOLVE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <Textarea
            placeholder="Комментарий (необязательно)"
            value={resolveComment}
            onChange={(e) => setResolveComment(e.target.value)}
            rows={2}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogId(null)}>Отмена</Button>
            <Button onClick={handleResolveDispute} disabled={!resolveStatus}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject review dialog */}
      <Dialog open={!!rejectDialogId} onOpenChange={(open) => !open && setRejectDialogId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отклонить отзыв</DialogTitle>
            <DialogDescription>
              Укажите причину отклонения (необязательно). Отзыв будет скрыт с сайта.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Причина отклонения (необязательно)"
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogId(null)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Отклонить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
