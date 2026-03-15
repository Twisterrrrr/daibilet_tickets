import { AlertTriangle, CheckCircle2, FileText, Send } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { EmptyState, ErrorState, LoadingState, PageHeader, SectionCard } from '@daibilet/shared-ui';

import { api } from '../lib/api';

const API_BASE = '/api/v1';

interface ReviewListItem {
  id: string;
  eventId: string;
  rating: number;
  title?: string;
  text: string;
  authorName: string;
  isVerified: boolean;
  createdAt: string;
  event?: { title: string; slug: string };
  supplierResponse?: { id: string; status: string; moderatedAt?: string } | null;
  disputes?: { id: string }[];
}

interface ReviewDetail extends ReviewListItem {
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

export default function Reviews() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('all');
  const [items, setItems] = useState<ReviewListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [listError, setListError] = useState<string | null>(null);

  const fetchList = useCallback(async (resetPage: boolean) => {
    const p = resetPage ? 1 : page;
    setLoading(true);
    setListError(null);
    try {
      const params = new URLSearchParams();
      params.set('tab', tab);
      params.set('page', String(p));
      params.set('limit', '20');
      const res = await api.get<{ items: ReviewListItem[]; total: number; hasMore?: boolean }>(
        `/supplier/reviews?${params}`,
      );
      setItems(resetPage ? res.items : (prev) => [...prev, ...res.items]);
      setTotal(res.total);
      setHasMore(res.hasMore ?? (res.items.length + (p - 1) * 20 < res.total));
      if (resetPage) setPage(1);
      else setPage(p);
    } catch (e) {
      setItems([]);
      setListError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => {
    fetchList(true);
  }, [tab, fetchList]);

  useEffect(() => {
    if (id) {
      setDetailLoading(true);
      api.get<ReviewDetail>(`/supplier/reviews/${id}`).then(setDetail).catch(() => setDetail(null)).finally(() => setDetailLoading(false));
    } else {
      setDetail(null);
    }
  }, [id]);

  const handleSelect = (reviewId: string) => {
    navigate(`/reviews/${reviewId}`);
  };

  const handleBack = () => {
    navigate('/reviews');
    setDetail(null);
  };

  if (id) {
    if (detailLoading && !detail) {
      return <LoadingState label="Загружаем отзыв..." />;
    }
    if (detail) {
      return <ReviewDetailView review={detail} onBack={handleBack} onUpdate={() => fetchList(true)} />;
    }
    return (
      <div className="space-y-4">
        <button onClick={handleBack} className="text-sm text-slate-500 hover:text-slate-700">← К списку</button>
        <ErrorState title="Отзыв не найден" description="Возможно, он был удалён или у вас нет доступа." />
      </div>
    );
  }

  const tabs = [
    { value: 'all', label: 'Все' },
    { value: 'needs_response', label: 'Требуют ответа' },
    { value: 'disputed', label: 'Оспоренные' },
    { value: 'responded', label: 'С ответом' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Отзывы"
        subtitle={total > 0 ? `Всего: ${total}` : undefined}
      />
      {listError && (
        <ErrorState
          title="Ошибка загрузки"
          description={listError}
          action={
            <button
              type="button"
              onClick={() => fetchList(true)}
              className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Повторить
            </button>
          }
        />
      )}
      <SectionCard>
        <div className="flex flex-wrap gap-2 border-b pb-3">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`border-b-2 px-4 py-2 text-sm font-medium ${tab === t.value ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {loading && items.length === 0 ? (
          <LoadingState label="Загружаем отзывы..." />
        ) : items.length === 0 ? (
          <EmptyState title="Нет отзывов" />
        ) : (
          <>
            <div className="space-y-3">
              {items.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSelect(r.id)}
                  className="w-full rounded-lg border bg-white p-4 text-left hover:border-blue-300 hover:bg-blue-50/30"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                        <span className="font-medium">{r.authorName}</span>
                        {r.isVerified && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">Подтверждён</span>}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-gray-600">{r.text}</p>
                      <p className="mt-1 text-xs text-gray-400">{r.event?.title} · {new Date(r.createdAt).toLocaleDateString('ru-RU')}</p>
                    </div>
                    <div className="flex gap-1">
                      {r.disputes && r.disputes.length > 0 && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800"><AlertTriangle className="mr-1 inline h-3 w-3" />Оспорен</span>
                      )}
                      {r.supplierResponse?.status === 'APPROVED' && (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"><CheckCircle2 className="mr-1 inline h-3 w-3" />Ответ</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {hasMore && (
              <button
                onClick={() => fetchList(false)}
                disabled={loading}
                className="mt-4 w-full rounded-lg border py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {loading ? 'Загрузка...' : `Показать ещё (всего ${total})`}
              </button>
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}

function ReviewDetailView({ review, onBack, onUpdate }: { review: ReviewDetail; onBack: () => void; onUpdate: () => void }) {
  const [responseText, setResponseText] = useState(review.supplierResponse?.text || '');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeClaim, setDisputeClaim] = useState('');
  const [disputeConfirm, setDisputeConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const hasResponse = !!review.supplierResponse;
  const responseStatus = review.supplierResponse?.status;
  const canEditResponse = responseStatus === 'DRAFT';
  const hasDispute = review.disputes?.some((d) => d.status === 'MODERATOR_REVIEW');
  const canCreateResponse = !hasResponse;
  const canAccept = !hasResponse && !hasDispute && review.rating > 3;
  const canDispute = !hasDispute && !hasResponse;

  const handleSaveResponse = async () => {
    if (responseText.trim().length < 10) { setError('Минимум 10 символов'); return; }
    setSubmitting(true); setError('');
    try {
      await api.post(`/supplier/reviews/${review.id}/response`, { text: responseText.trim() });
      setSuccess('Черновик сохранён'); onUpdate();
    } catch (e) { setError((e as Error).message); } finally { setSubmitting(false); }
  };

  const handleSubmitResponse = async () => {
    setSubmitting(true); setError('');
    try {
      await api.post(`/supplier/reviews/${review.id}/response/submit`);
      setSuccess('Ответ отправлен на модерацию'); onUpdate();
    } catch (e) { setError((e as Error).message); } finally { setSubmitting(false); }
  };

  const handleAccept = async () => {
    setSubmitting(true); setError('');
    try {
      await api.post(`/supplier/reviews/${review.id}/accept`);
      setSuccess('Отзыв принят'); onUpdate();
    } catch (e) { setError((e as Error).message); } finally { setSubmitting(false); }
  };

  const handleDispute = async () => {
    if (!disputeReason || disputeClaim.trim().length < 20 || !disputeConfirm) { setError('Заполните все поля и подтвердите'); return; }
    setSubmitting(true); setError('');
    try {
      await api.post(`/supplier/reviews/${review.id}/dispute`, {
        reasonCode: disputeReason,
        claimText: disputeClaim.trim(),
        supplierConfirmedTruth: disputeConfirm,
      });
      setSuccess('Оспаривание создано'); onUpdate();
    } catch (e) { setError((e as Error).message); } finally { setSubmitting(false); }
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
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Ошибка');
    onUpdate();
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">← К списку</button>
      <h1 className="text-xl font-bold">Отзыв</h1>

      <div className="rounded-lg border bg-white p-5">
        <div className="flex items-center gap-2">
          <span className="text-amber-500 text-lg">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
          <span className="font-medium">{review.authorName}</span>
          {review.isVerified && <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">Подтверждён</span>}
        </div>
        <p className="mt-2 text-sm text-gray-600">{review.text}</p>
        <p className="mt-2 text-xs text-gray-400">{review.event?.title} · {new Date(review.createdAt).toLocaleDateString('ru-RU')}</p>

        {hasDispute && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            Отзыв оспорен и ожидает проверки
          </div>
        )}

        {hasResponse && responseStatus === 'APPROVED' && (
          <div className="mt-4 rounded-lg border bg-slate-50 p-4">
            <p className="text-xs font-medium text-gray-500">Ответ организатора</p>
            <p className="mt-1 text-sm text-gray-700">{review.supplierResponse!.text}</p>
          </div>
        )}

        {hasResponse && (responseStatus === 'PENDING_MODERATION' || responseStatus === 'REJECTED') && (
          <div className="mt-4 rounded-lg border p-4">
            <p className="text-xs font-medium text-gray-500">
              {responseStatus === 'PENDING_MODERATION' ? 'На модерации' : 'Отклонён'}
              {review.supplierResponse?.moderationComment && ` — ${review.supplierResponse.moderationComment}`}
            </p>
            <p className="mt-1 text-sm text-gray-700">{review.supplierResponse!.text}</p>
          </div>
        )}
      </div>

      {(canCreateResponse || canEditResponse) && (
        <div className="rounded-lg border bg-white p-5">
          <h3 className="font-medium">Ответ на отзыв</h3>
          <textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            disabled={!canEditResponse}
            rows={4}
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Ваш ответ (мин. 10 символов)"
          />
          {canEditResponse && (
            <div className="mt-3 flex gap-2">
              <button onClick={handleSaveResponse} disabled={submitting} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Сохранить черновик</button>
              <button onClick={handleSubmitResponse} disabled={submitting || responseText.trim().length < 10} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Send className="h-4 w-4" />Отправить на модерацию</button>
            </div>
          )}
        </div>
      )}

      {canAccept && (
        <div className="rounded-lg border bg-white p-5">
          <p className="text-sm text-gray-600">Оценка 4–5. Можно принять без ответа.</p>
          <button onClick={handleAccept} disabled={submitting} className="mt-3 rounded-lg bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-200">Принять отзыв</button>
        </div>
      )}

      {canDispute && (
        <div className="rounded-lg border bg-white p-5">
          <h3 className="font-medium">Оспорить отзыв</h3>
          <select value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} className="mt-3 w-full rounded-lg border px-3 py-2 text-sm">
            <option value="">Причина</option>
            {Object.entries(DISPUTE_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <textarea value={disputeClaim} onChange={(e) => setDisputeClaim(e.target.value)} rows={3} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Претензия (мин. 20 символов)" />
          <label className="mt-3 flex items-center gap-2">
            <input type="checkbox" checked={disputeConfirm} onChange={(e) => setDisputeConfirm(e.target.checked)} />
            <span className="text-sm">Подтверждаю правдивость</span>
          </label>
          <button onClick={handleDispute} disabled={submitting || !disputeReason || disputeClaim.trim().length < 20 || !disputeConfirm} className="mt-3 rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200 disabled:opacity-50">Создать оспаривание</button>
        </div>
      )}

      {hasDispute && review.disputes && (
        <div className="rounded-lg border bg-white p-5">
          <h3 className="font-medium">Доказательства</h3>
          {review.disputes.filter((d) => d.status === 'MODERATOR_REVIEW').map((d) => (
            <div key={d.id} className="mt-3">
              <p className="text-xs text-gray-500">{DISPUTE_REASONS[d.reasonCode] || d.reasonCode}</p>
              <p className="text-sm text-gray-700">{d.claimText}</p>
              {d.evidence && d.evidence.length < 5 && (
                <label className="mt-2 inline-block cursor-pointer rounded border px-3 py-1 text-sm hover:bg-gray-50">
                  <FileText className="mr-1 inline h-4 w-4" />Добавить файл
                  <input type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && f.size <= 25 * 1024 * 1024) handleUploadEvidence(d.id, f);
                    e.target.value = '';
                  }} />
                </label>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}
    </div>
  );
}
