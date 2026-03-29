import { AlertTriangle, CheckCircle2, MessageSquare } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { api } from '@/shared/lib/api';
import { PageGlyph } from '@/shared/ui/page-glyph';
import {
  EmptyState,
  ErrorPanel,
  LoadingBlock,
  PageHeader,
  SectionCard,
} from '@/shared/ui/page-primitives';

interface ReviewListItem {
  id: string;
  rating: number;
  text: string;
  authorName: string;
  isVerified: boolean;
  createdAt: string;
  event?: { title: string; slug: string };
  supplierResponse?: { id: string; status: string; moderatedAt?: string } | null;
  disputes?: { id: string }[];
}

export function ReviewsListPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('all');
  const [items, setItems] = useState<ReviewListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async (targetPage: number, mode: 'replace' | 'append') => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('tab', tab);
      params.set('page', String(targetPage));
      params.set('limit', '20');
      const res = await api.get<{ items: ReviewListItem[]; total: number; hasMore?: boolean }>(
        `/supplier/reviews?${params}`,
      );
      const list = res.items ?? [];
      const tot = res.total ?? 0;
      setTotal(tot);
      if (mode === 'replace') {
        setItems(list);
        setPage(1);
        const shown = list.length;
        setHasMore(res.hasMore ?? shown < tot);
      } else {
        setItems((prev) => {
          const merged = [...prev, ...list];
          setHasMore(res.hasMore ?? merged.length < tot);
          return merged;
        });
        setPage(targetPage);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      if (mode === 'replace') setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void fetchReviews(1, 'replace');
  }, [fetchReviews]);

  const tabs = [
    { value: 'all', label: 'Все' },
    { value: 'needs_response', label: 'Требуют ответа' },
    { value: 'disputed', label: 'Оспоренные' },
    { value: 'responded', label: 'С ответом' },
  ];

  const loadMore = () => {
    if (loading || !hasMore) return;
    void fetchReviews(page + 1, 'append');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Отзывы"
        subtitle={total > 0 ? `Всего: ${total}` : undefined}
        glyph={<PageGlyph icon={MessageSquare} tone="rose" />}
      />

      {error ? <ErrorPanel title="Ошибка загрузки" description={error} /> : null}

      <SectionCard>
        <div className="-mx-4 -mt-2 mb-4 flex flex-wrap gap-1 border-b border-border-soft px-4 pb-3">
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={
                tab === t.value
                  ? 'rounded-control bg-accent px-3 py-1.5 text-label font-medium text-accent-foreground'
                  : 'rounded-control px-3 py-1.5 text-label text-text-muted hover:bg-surface-alt'
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && items.length === 0 ? <LoadingBlock label="Загружаем отзывы…" /> : null}

        {!loading && items.length === 0 ? (
          <EmptyState title="Нет отзывов" />
        ) : items.length > 0 ? (
          <>
            <div className="space-y-2">
              {items.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => navigate(`/reviews/${r.id}`)}
                  className="w-full rounded-card border border-border-soft bg-surface p-4 text-left shadow-soft transition-shadow hover:border-accent/40 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-amber-500">
                          {'★'.repeat(r.rating)}
                          {'☆'.repeat(5 - r.rating)}
                        </span>
                        <span className="font-medium text-text-primary">{r.authorName}</span>
                        {r.isVerified ? (
                          <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-medium text-success">
                            Подтверждён
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-small text-text-secondary">{r.text}</p>
                      <p className="mt-1 text-[11px] text-text-muted">
                        {r.event?.title ?? '—'} ·{' '}
                        {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      {r.disputes && r.disputes.length > 0 ? (
                        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-medium text-warning">
                          <AlertTriangle className="h-3 w-3" />
                          Оспорен
                        </span>
                      ) : null}
                      {r.supplierResponse?.status === 'APPROVED' ? (
                        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-medium text-success">
                          <CheckCircle2 className="h-3 w-3" />
                          Ответ
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {hasMore ? (
              <button
                type="button"
                onClick={loadMore}
                disabled={loading}
                className="mt-4 w-full rounded-control border border-border-soft py-2 text-small text-text-secondary hover:bg-surface-alt disabled:opacity-50"
              >
                {loading ? 'Загрузка…' : `Показать ещё (всего ${total})`}
              </button>
            ) : null}
          </>
        ) : null}
      </SectionCard>
    </div>
  );
}
