'use client';

import { AlertCircle, Camera, CheckCircle, ChevronDown, ExternalLink, Send, Star, ThumbsUp, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';

import { api } from '@/lib/api';

// ========================
// Типы
// ========================

interface RatingSummary {
  avgRating: number;
  reviewCount: number;
  verifiedCount: number;
  distribution: Record<number, number>;
}

interface ReviewPhoto {
  id: string;
  url: string;
  thumbUrl: string;
}

interface ReviewItem {
  id: string;
  rating: number;
  title?: string;
  text: string;
  authorName: string;
  isVerified: boolean;
  helpfulCount: number;
  createdAt: string;
  photos: ReviewPhoto[];
}

interface ExternalReviewItem {
  id: string;
  source: string;
  sourceUrl?: string;
  authorName: string;
  rating: number;
  text: string;
  publishedAt?: string;
}

// ========================
// StarRating
// ========================

function StarRating({
  value,
  max = 5,
  size = 'md',
  interactive = false,
  onChange,
}: {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (v: number) => void;
}) {
  const sizes = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' };
  const cls = sizes[size];

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.round(value);
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(i + 1)}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
          >
            <Star className={`${cls} ${filled ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
          </button>
        );
      })}
    </div>
  );
}

// ========================
// Сводка рейтинга
// ========================

function RatingSummaryBlock({
  summary,
  externalRating,
  externalSource,
}: {
  summary: RatingSummary;
  externalRating?: number;
  externalSource?: string;
}) {
  const maxBar = Math.max(...Object.values(summary.distribution), 1);

  return (
    <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      {/* Left: big number */}
      <div className="flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-slate-900">
          {summary.avgRating > 0 ? summary.avgRating.toFixed(1) : '—'}
        </span>
        <StarRating value={summary.avgRating} size="sm" />
        <p className="mt-1 text-xs text-slate-500">
          {summary.reviewCount} {pluralReviews(summary.reviewCount)}
        </p>
        {summary.verifiedCount > 0 && (
          <p className="flex items-center gap-1 text-[10px] text-emerald-600">
            <CheckCircle className="h-3 w-3" />
            {summary.verifiedCount} верифицированных
          </p>
        )}
      </div>

      {/* Right: distribution bars */}
      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = summary.distribution[star] || 0;
          const width = maxBar > 0 ? (count / maxBar) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-sm">
              <span className="w-4 text-right text-slate-500">{star}</span>
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-amber-400 transition-all"
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className="w-6 text-xs text-slate-400">{count}</span>
            </div>
          );
        })}
      </div>

      {/* External rating badge */}
      {externalRating && externalRating > 0 && (
        <div className="flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-6">
          <span className="text-2xl font-bold text-slate-700">{Number(externalRating).toFixed(1)}</span>
          <StarRating value={Number(externalRating)} size="sm" />
          <p className="mt-1 text-[10px] text-slate-400">{formatSourceName(externalSource)}</p>
        </div>
      )}
    </div>
  );
}

// ========================
// Галерея фото отзыва
// ========================

function PhotoGallery({ photos }: { photos: ReviewPhoto[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="mt-3 flex gap-2 overflow-x-auto">
        {photos.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.url)}
            className="flex-shrink-0 overflow-hidden rounded-lg border border-slate-100 hover:border-primary-300 transition"
          >
            <img src={p.thumbUrl} alt="Фото отзыва" className="h-20 w-20 object-cover" loading="lazy" />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelected(null)}
        >
          <button
            onClick={() => setSelected(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={selected}
            alt="Фото отзыва"
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

// ========================
// Карточка отзыва
// ========================

function ReviewCard({ review }: { review: ReviewItem }) {
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount);
  const [voted, setVoted] = useState(false);

  const date = new Date(review.createdAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleVote = async () => {
    if (voted) return;
    try {
      const res = await api.voteReview(review.id, true);
      setHelpfulCount(res.helpfulCount);
      setVoted(true);
    } catch {
      // no-op
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar initials */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
            {review.authorName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">{review.authorName}</span>
              {review.isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                  <CheckCircle className="h-3 w-3" />
                  Покупка подтверждена
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">{date}</p>
          </div>
        </div>
        <StarRating value={review.rating} size="sm" />
      </div>

      {review.title && <p className="mt-3 text-sm font-semibold text-slate-800">{review.title}</p>}
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{review.text}</p>

      {/* Photos */}
      <PhotoGallery photos={review.photos} />

      {/* Vote button */}
      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3">
        <button
          onClick={handleVote}
          disabled={voted}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            voted
              ? 'bg-primary-50 text-primary-600 cursor-default'
              : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
          }`}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          Полезный{helpfulCount > 0 ? ` (${helpfulCount})` : ''}
        </button>
      </div>
    </div>
  );
}

// ========================
// Внешний отзыв
// ========================

function ExternalReviewCard({ review }: { review: ExternalReviewItem }) {
  const date = review.publishedAt
    ? new Date(review.publishedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-500">
            {review.authorName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">{review.authorName}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                <ExternalLink className="h-2.5 w-2.5" />
                {formatSourceName(review.source)}
              </span>
            </div>
            {date && <p className="text-xs text-slate-400">{date}</p>}
          </div>
        </div>
        <StarRating value={review.rating} size="sm" />
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{review.text}</p>
      {review.sourceUrl && (
        <a
          href={review.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 transition"
        >
          <ExternalLink className="h-3 w-3" />
          Читать оригинал
        </a>
      )}
    </div>
  );
}

// ========================
// Форма отзыва с фото, honeypot, таймером
// ========================

function ReviewForm({
  eventId,
  venueId,
  onSuccess,
  prefillEmail,
  reviewRequestToken,
}: {
  eventId?: string;
  venueId?: string;
  onSuccess: () => void;
  prefillEmail?: string;
  reviewRequestToken?: string;
}) {
  const formStartedAt = useRef(Date.now());
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState(prefillEmail || '');
  const [voucherCode, setVoucherCode] = useState('');
  const [honeypot, setHoneypot] = useState(''); // hidden
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const remaining = 5 - photos.length;
      const selected = files.slice(0, remaining);

      const validFiles = selected.filter((f) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return false;
        if (f.size > 5 * 1024 * 1024) return false;
        return true;
      });

      setPhotos((prev) => [...prev, ...validFiles]);
      // Create preview URLs
      validFiles.forEach((f) => {
        const reader = new FileReader();
        reader.onload = () => setPreviews((prev) => [...prev, reader.result as string]);
        reader.readAsDataURL(f);
      });

      // Reset input
      if (fileRef.current) fileRef.current.value = '';
    },
    [photos.length],
  );

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Поставьте оценку');
      return;
    }
    if (text.trim().length < 10) {
      setError('Отзыв слишком короткий (мин. 10 символов)');
      return;
    }
    if (!authorName.trim()) {
      setError('Укажите ваше имя');
      return;
    }
    if (!authorEmail.includes('@')) {
      setError('Укажите корректный email');
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.submitReview({
        eventId,
        venueId,
        rating,
        title: title.trim() || undefined,
        text: text.trim(),
        authorName: authorName.trim(),
        authorEmail: authorEmail.trim(),
        voucherCode: voucherCode.trim() || undefined,
        website: honeypot || undefined,
        formStartedAt: formStartedAt.current,
        reviewRequestToken: reviewRequestToken || undefined,
      });

      // Если есть фото и review ID — загружаем
      if (photos.length > 0 && result.id) {
        try {
          await api.uploadReviewPhotos(result.id, photos, authorEmail.trim());
        } catch {
          // Фото не загрузились, но отзыв создан — ок
        }
      }

      setSuccessMessage(typeof result?.message === 'string' ? result.message : 'Спасибо за отзыв!');
      onSuccess();
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : String(err)) || 'Ошибка при отправке отзыва');
    } finally {
      setSubmitting(false);
    }
  }

  if (successMessage) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle className="mx-auto h-10 w-10 text-emerald-500" />
        <p className="mt-3 text-sm font-medium text-emerald-800">{successMessage}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
      <h3 className="text-base font-bold text-slate-900">Оставить отзыв</h3>

      {/* Honeypot — скрытое поле от ботов */}
      <div className="absolute -left-[9999px] opacity-0" aria-hidden="true">
        <label htmlFor="review-website">Website</label>
        <input
          id="review-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {/* Rating stars */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500">Ваша оценка *</label>
        <StarRating value={rating} size="lg" interactive onChange={setRating} />
      </div>

      {/* Title */}
      <input
        type="text"
        placeholder="Заголовок (необязательно)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        maxLength={100}
      />

      {/* Text */}
      <textarea
        placeholder="Расскажите о вашем опыте... *"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full resize-none rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        maxLength={2000}
      />

      {/* Photo upload */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500">
          Фото (до 5 штук, JPEG/PNG/WebP, макс. 5 МБ)
        </label>
        <div className="flex flex-wrap gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200">
              <img src={src} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white shadow hover:bg-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {photos.length < 5 && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-200 text-slate-400 hover:border-primary-300 hover:text-primary-500 transition"
            >
              <Camera className="h-5 w-5" />
              <span className="text-[10px]">Фото</span>
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Ваше имя *</label>
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            maxLength={50}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Email * (не публикуется)</label>
          <input
            type="email"
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
            readOnly={!!prefillEmail}
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 read-only:bg-slate-50"
          />
        </div>
      </div>

      {/* Voucher for verification (только для event) */}
      {!reviewRequestToken && eventId && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Код ваучера (если покупали через нас)</label>
          <input
            type="text"
            placeholder="Например: ABCD1234"
            value={voucherCode}
            onChange={(e) => setVoucherCode(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            maxLength={20}
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Если вы приобретали билет через Дайбилет — введите код из ваучера. Отзыв получит метку «Покупка
            подтверждена».
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
        {submitting ? 'Отправляем...' : 'Отправить отзыв'}
      </button>
    </form>
  );
}

// ========================
// Основной блок отзывов
// ========================

export function ReviewSection({
  eventId,
  eventSlug,
  venueId,
  venueSlug,
  externalRating,
  externalSource,
  prefillEmail,
  reviewRequestToken,
}: {
  eventId?: string;
  eventSlug?: string;
  venueId?: string;
  venueSlug?: string;
  externalRating?: number;
  externalSource?: string;
  prefillEmail?: string;
  reviewRequestToken?: string;
}) {
  const [data, setData] = useState<{
    items: ReviewItem[];
    externalReviews: ExternalReviewItem[];
    total: number;
    page: number;
    totalPages: number;
    summary: RatingSummary;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(!!reviewRequestToken);

  const loadReviews = async (page = 1) => {
    try {
      const res = venueSlug ? await api.getVenueReviews(venueSlug, page) : await api.getEventReviews(eventSlug!, page);
      setData(res as Parameters<typeof setData>[0]);
    } catch {
      // no-op
    } finally {
      setLoading(false);
    }
  };

  const slug = venueSlug ?? eventSlug;
  useEffect(() => {
    loadReviews();
  }, [slug]);

  if (loading) {
    return (
      <section className="py-8">
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      </section>
    );
  }

  const summary = data?.summary || {
    avgRating: 0,
    reviewCount: 0,
    verifiedCount: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };
  const reviews = data?.items || [];
  const externalReviews = data?.externalReviews || [];

  return (
    <section className="space-y-6" id="reviews">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">
          Отзывы{' '}
          {summary.reviewCount > 0 && <span className="text-slate-400 font-normal">({summary.reviewCount})</span>}
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 transition hover:bg-primary-100"
        >
          {showForm ? 'Скрыть форму' : 'Написать отзыв'}
        </button>
      </div>

      {/* Rating summary */}
      {(summary.reviewCount > 0 || (externalRating && externalRating > 0)) && (
        <RatingSummaryBlock summary={summary} externalRating={externalRating} externalSource={externalSource} />
      )}

      {/* Review form */}
      {showForm && (
        <ReviewForm
          eventId={eventId}
          venueId={venueId}
          prefillEmail={prefillEmail}
          reviewRequestToken={reviewRequestToken}
          onSuccess={() => {
            if (!reviewRequestToken) setShowForm(false);
            loadReviews();
          }}
        />
      )}

      {/* Reviews list */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}

          {/* Load more */}
          {data && data.page < data.totalPages && (
            <button
              onClick={() => loadReviews(data.page + 1)}
              className="flex items-center gap-2 mx-auto text-sm font-medium text-primary-600 hover:text-primary-700 transition"
            >
              <ChevronDown className="h-4 w-4" />
              Показать ещё
            </button>
          )}
        </div>
      ) : !showForm ? (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-500">Пока нет отзывов. Будьте первым!</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700 transition"
          >
            Написать отзыв
          </button>
        </div>
      ) : null}

      {/* External reviews */}
      {externalReviews.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <ExternalLink className="h-4 w-4" />
            Отзывы с других площадок
          </h3>
          {externalReviews.map((r) => (
            <ExternalReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}
    </section>
  );
}

// ========================
// Компактный виджет рейтинга (для карточки события)
// ========================

export function RatingBadge({
  rating,
  reviewCount,
  variant = 'dark',
}: {
  rating: number;
  reviewCount: number;
  variant?: 'dark' | 'light';
}) {
  if (!rating || rating === 0) return null;
  const textColor = variant === 'light' ? 'text-white' : 'text-slate-900';
  const subColor = variant === 'light' ? 'text-white/70' : 'text-slate-400';
  return (
    <div className="flex items-center gap-1.5">
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
      <span className={`text-sm font-semibold ${textColor}`}>{Number(rating).toFixed(1)}</span>
      {reviewCount > 0 && <span className={`text-xs ${subColor}`}>({reviewCount})</span>}
    </div>
  );
}

// ========================
// Хелперы
// ========================

function pluralReviews(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'отзыв';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'отзыва';
  return 'отзывов';
}

function formatSourceName(source?: string): string {
  if (!source) return 'Внешний';
  const map: Record<string, string> = {
    yandex_maps: 'Яндекс.Карты',
    '2gis': '2ГИС',
    tripadvisor: 'Tripadvisor',
    google: 'Google',
  };
  return map[source] || source;
}
