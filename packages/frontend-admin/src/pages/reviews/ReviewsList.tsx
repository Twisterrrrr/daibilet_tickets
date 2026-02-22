import { CheckCircle2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
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

const STATUS_VARIANTS: Record<string, 'warning' | 'success' | 'destructive' | 'secondary'> = {
  PENDING_EMAIL: 'secondary',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_EMAIL: 'Ждёт email',
  PENDING: 'На модерации',
  APPROVED: 'Одобрен',
  REJECTED: 'Отклонён',
};

function stars(n: number) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

export function ReviewsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  const statusFilter = (searchParams.get('status') || 'PENDING') as
    | 'PENDING_EMAIL'
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED';
  const page = Number(searchParams.get('page')) || 1;

  const fetchReviews = useCallback(async () => {
    setLoading(true);
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
      console.error('Failed to load reviews', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

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
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Нет отзывов с таким статусом</CardContent>
        </Card>
      );
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
                    <Badge variant={STATUS_VARIANTS[r.status] ?? 'default'}>{STATUS_LABELS[r.status]}</Badge>
                    {r.isVerified && (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Подтверждён
                      </Badge>
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          Отзывы
          {pendingCount > 0 && (
            <Badge variant="warning" className="ml-1">
              {pendingCount}
            </Badge>
          )}
        </h1>
        <p className="text-muted-foreground">
          {total} отзывов • {STATUS_LABELS[statusFilter]}
        </p>
      </div>

      {/* Status tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setFilter('status', v)}>
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="PENDING" className="gap-1.5">
            {STATUS_LABELS.PENDING}
            {pendingCount > 0 && (
              <Badge variant="warning" className="ml-0.5 h-5 px-1.5 text-[10px]">
                {pendingCount}
              </Badge>
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

      {/* Pagination */}
      {pages > 1 && (
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

      {/* Reject dialog */}
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
