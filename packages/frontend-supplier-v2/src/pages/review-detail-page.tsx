import { AlertTriangle, FileText, MessageSquare, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { api } from '@/shared/lib/api';
import {
  EmptyState,
  ErrorPanel,
  LoadingBlock,
  PageHeader,
  SectionCard,
} from '@/shared/ui/page-primitives';
import { PageGlyph } from '@/shared/ui/page-glyph';
import { InlineTabs } from '@/shared/ui/inline-tabs';

const API_BASE = '/api/v1';

interface ReviewDetail {
  id: string;
  rating: number;
  title?: string;
  text: string;
  authorName: string;
  isVerified: boolean;
  createdAt: string;
  photos: { id: string; url: string; thumbUrl: string }[];
  event?: { id: string; title: string; slug: string };
  supplierResponse?: {
    id: string;
    text: string;
    status: string;
    moderationComment?: string;
    moderatedAt?: string;
  } | null;
  disputes?: {
    id: string;
    reasonCode: string;
    claimText: string;
    status: string;
    evidence: { id: string; storageKey: string; fileName: string }[];
  }[];
}

const DISPUTE_REASONS: Record<string, string> = {
  FALSE_FACTS: 'Неверные факты',
  OFF_TOPIC: 'Не по теме',
  ABUSIVE: 'Оскорбления',
};

export function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api
      .get<ReviewDetail>(`/supplier/reviews/${id}`)
      .then(setReview)
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить отзыв');
        setReview(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on id
  }, [id]);

  if (!id) {
    return null;
  }

  if (loading && !review) {
    return (
      <div className="space-y-6">
        <Link to="/reviews" className="text-small text-text-muted hover:text-accent">
          ← К списку
        </Link>
        <LoadingBlock label="Загружаем отзыв…" />
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="space-y-6">
        <Link to="/reviews" className="text-small text-text-muted hover:text-accent">
          ← К списку
        </Link>
        {error ? <ErrorPanel title="Отзыв недоступен" description={error} onRetry={load} /> : null}
        {!loading && !review && !error ? (
          <EmptyState title="Отзыв не найден" description="Возможно, он был удалён или у вас нет доступа." />
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/reviews" className="inline-block text-small text-text-muted hover:text-accent">
        ← К списку
      </Link>
      <ReviewDetailBody review={review} onReload={load} />
    </div>
  );
}

function ReviewDetailBody({ review, onReload }: { review: ReviewDetail; onReload: () => void }) {
  const [responseText, setResponseText] = useState(review.supplierResponse?.text || '');
  useEffect(() => {
    setResponseText(review.supplierResponse?.text || '');
  }, [review.id, review.supplierResponse?.text]);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeClaim, setDisputeClaim] = useState('');
  const [disputeConfirm, setDisputeConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msgError, setMsgError] = useState('');
  const [msgSuccess, setMsgSuccess] = useState('');

  const hasResponse = !!review.supplierResponse;
  const responseStatus = review.supplierResponse?.status;
  const canEditResponse = responseStatus === 'DRAFT';
  const hasDispute = review.disputes?.some((d) => d.status === 'MODERATOR_REVIEW');
  const canCreateResponse = !hasResponse;
  const canAccept = !hasResponse && !hasDispute && review.rating > 3;
  const canDispute = !hasDispute && !hasResponse;

  const handleSaveResponse = async () => {
    if (responseText.trim().length < 10) {
      setMsgError('Минимум 10 символов');
      return;
    }
    setSubmitting(true);
    setMsgError('');
    try {
      await api.post(`/supplier/reviews/${review.id}/response`, { text: responseText.trim() });
      setMsgSuccess('Черновик сохранён');
      onReload();
    } catch (e) {
      setMsgError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitResponse = async () => {
    setSubmitting(true);
    setMsgError('');
    try {
      await api.post(`/supplier/reviews/${review.id}/response/submit`);
      setMsgSuccess('Ответ отправлен на модерацию');
      onReload();
    } catch (e) {
      setMsgError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async () => {
    setSubmitting(true);
    setMsgError('');
    try {
      await api.post(`/supplier/reviews/${review.id}/accept`);
      setMsgSuccess('Отзыв принят');
      onReload();
    } catch (e) {
      setMsgError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispute = async () => {
    if (!disputeReason || disputeClaim.trim().length < 20 || !disputeConfirm) {
      setMsgError('Заполните все поля и подтвердите');
      return;
    }
    setSubmitting(true);
    setMsgError('');
    try {
      await api.post(`/supplier/reviews/${review.id}/dispute`, {
        reasonCode: disputeReason,
        claimText: disputeClaim.trim(),
        supplierConfirmedTruth: disputeConfirm,
      });
      setMsgSuccess('Оспаривание создано');
      onReload();
    } catch (e) {
      setMsgError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadEvidence = async (disputeId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const token = localStorage.getItem('supplier_token');
    const res = await fetch(`${API_BASE}/supplier/disputes/${disputeId}/evidence`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { message?: string }).message || 'Ошибка загрузки');
    }
    onReload();
  };

  const overviewCard = (
    <SectionCard>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-lg text-amber-500">
          {'★'.repeat(review.rating)}
          {'☆'.repeat(5 - review.rating)}
        </span>
        <span className="font-medium text-text-primary">{review.authorName}</span>
        {review.isVerified ? (
          <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">
            Подтверждён
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-small text-text-secondary">{review.text}</p>
      <p className="mt-2 text-[11px] text-text-muted">
        {review.event?.title} · {new Date(review.createdAt).toLocaleDateString('ru-RU')}
      </p>

      {review.photos && review.photos.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {review.photos.map((p) => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-control border border-border-soft"
            >
              <img src={p.thumbUrl || p.url} alt="" className="h-20 w-20 object-cover" />
            </a>
          ))}
        </div>
      ) : null}

      {hasDispute ? (
        <div className="mt-4 flex items-center gap-2 rounded-card border border-warning/30 bg-warning-soft px-3 py-2 text-small text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Отзыв оспорен и ожидает проверки
        </div>
      ) : null}

      {hasResponse && responseStatus === 'APPROVED' ? (
        <div className="mt-4 rounded-card border border-border-soft bg-surface-alt px-3 py-3">
          <p className="text-label font-medium text-text-muted">Ответ организатора</p>
          <p className="mt-1 text-small text-text-primary">{review.supplierResponse!.text}</p>
        </div>
      ) : null}

      {hasResponse && (responseStatus === 'PENDING_MODERATION' || responseStatus === 'REJECTED') ? (
        <div className="mt-4 rounded-card border border-border-soft px-3 py-3">
          <p className="text-label font-medium text-text-muted">
            {responseStatus === 'PENDING_MODERATION' ? 'На модерации' : 'Отклонён'}
            {review.supplierResponse?.moderationComment
              ? ` — ${review.supplierResponse.moderationComment}`
              : ''}
          </p>
          <p className="mt-1 text-small text-text-primary">{review.supplierResponse!.text}</p>
        </div>
      ) : null}
    </SectionCard>
  );

  const actionsContent = (
    <div className="space-y-4">
      {canCreateResponse || canEditResponse ? (
        <SectionCard title="Ответ на отзыв">
          <textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            disabled={!canEditResponse && !canCreateResponse}
            rows={4}
            className="w-full rounded-control border border-border-soft bg-surface px-3 py-2 text-small outline-none focus:border-accent disabled:opacity-60"
            placeholder="Ваш ответ (мин. 10 символов)"
          />
          {canEditResponse || canCreateResponse ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleSaveResponse()}
                disabled={submitting}
                className="rounded-control border border-border-soft bg-surface-alt px-4 py-2 text-label font-medium hover:bg-surface"
              >
                Сохранить черновик
              </button>
              <button
                type="button"
                onClick={() => void handleSubmitResponse()}
                disabled={submitting || responseText.trim().length < 10}
                className="inline-flex items-center gap-1.5 rounded-control bg-accent px-4 py-2 text-label font-medium text-accent-foreground disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Отправить на модерацию
              </button>
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {canAccept ? (
        <SectionCard title="Быстрое действие">
          <p className="text-small text-text-secondary">Оценка 4–5. Можно принять без ответа.</p>
          <button
            type="button"
            onClick={() => void handleAccept()}
            disabled={submitting}
            className="mt-3 rounded-control bg-success-soft px-4 py-2 text-label font-medium text-success hover:opacity-90 disabled:opacity-50"
          >
            Принять отзыв
          </button>
        </SectionCard>
      ) : null}

      {canDispute ? (
        <SectionCard title="Оспорить отзыв">
          <select
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            className="w-full rounded-control border border-border-soft px-3 py-2 text-small"
          >
            <option value="">Причина</option>
            {Object.entries(DISPUTE_REASONS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <textarea
            value={disputeClaim}
            onChange={(e) => setDisputeClaim(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-control border border-border-soft px-3 py-2 text-small"
            placeholder="Претензия (мин. 20 символов)"
          />
          <label className="mt-3 flex items-center gap-2 text-small text-text-secondary">
            <input
              type="checkbox"
              checked={disputeConfirm}
              onChange={(e) => setDisputeConfirm(e.target.checked)}
              className="rounded border-border-soft"
            />
            Подтверждаю правдивость
          </label>
          <button
            type="button"
            onClick={() => void handleDispute()}
            disabled={submitting || !disputeReason || disputeClaim.trim().length < 20 || !disputeConfirm}
            className="mt-3 rounded-control bg-warning-soft px-4 py-2 text-label font-medium text-warning disabled:opacity-50"
          >
            Создать оспаривание
          </button>
        </SectionCard>
      ) : null}

      {hasDispute && review.disputes ? (
        <SectionCard title="Доказательства">
          {review.disputes
            .filter((d) => d.status === 'MODERATOR_REVIEW')
            .map((d) => (
              <div key={d.id} className="mt-3 first:mt-0">
                <p className="text-label text-text-muted">{DISPUTE_REASONS[d.reasonCode] || d.reasonCode}</p>
                <p className="mt-1 text-small text-text-primary">{d.claimText}</p>
                {d.evidence && d.evidence.length < 5 ? (
                  <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-control border border-border-soft px-3 py-2 text-small hover:bg-surface-alt">
                    <FileText className="h-4 w-4" />
                    Добавить файл
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f && f.size <= 25 * 1024 * 1024) {
                          void handleUploadEvidence(d.id, f).catch((err) =>
                            window.alert(err instanceof Error ? err.message : 'Ошибка'),
                          );
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                ) : null}
              </div>
            ))}
        </SectionCard>
      ) : null}

      {!canCreateResponse &&
      !canEditResponse &&
      !canAccept &&
      !canDispute &&
      !(hasDispute && review.disputes) ? (
        <p className="text-small text-text-muted">Нет доступных действий для этого отзыва.</p>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Отзыв"
        subtitle={`${review.authorName} · ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}`}
        glyph={<PageGlyph icon={MessageSquare} tone="rose" />}
      />

      <InlineTabs
        defaultId="view"
        items={[
          { id: 'view', label: 'Обзор', content: overviewCard },
          { id: 'actions', label: 'Действия', content: actionsContent },
        ]}
      />

      {msgError ? (
        <div className="rounded-card border border-danger/30 bg-danger-soft px-3 py-2 text-small text-danger">
          {msgError}
        </div>
      ) : null}
      {msgSuccess ? (
        <div className="rounded-card border border-success/30 bg-success-soft px-3 py-2 text-small text-success">
          {msgSuccess}
        </div>
      ) : null}
    </div>
  );
}
