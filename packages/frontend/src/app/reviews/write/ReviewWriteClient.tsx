'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { api } from '@/lib/api';
import { ReviewSection } from '@/components/ui/ReviewSection';
import { CheckCircle, Loader2 } from 'lucide-react';

function ReviewWriteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [eventData, setEventData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Ссылка недействительна');
      setLoading(false);
      return;
    }

    // Валидируем токен и получаем данные события через API
    async function loadData() {
      try {
        const res = await fetch(`/api/v1/reviews/request-info?token=${token}`);
        if (!res.ok) throw new Error('Ссылка недействительна или истекла');
        const data = await res.json();
        setEventData(data);
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-lg font-medium text-slate-900">{error || 'Ссылка недействительна'}</p>
        <p className="mt-2 text-sm text-slate-500">
          Попробуйте оставить отзыв на странице мероприятия.
        </p>
        <a
          href="/"
          className="mt-6 inline-block rounded-lg bg-primary-600 px-6 py-3 text-sm font-medium text-white hover:bg-primary-700 transition"
        >
          На главную
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          Как вам {eventData.eventTitle}?
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Ваш отзыв будет автоматически отмечен как подтверждённая покупка
        </p>
      </div>

      <ReviewSection
        eventId={eventData.eventId}
        eventSlug={eventData.eventSlug}
        prefillEmail={eventData.email}
        reviewRequestToken={token || undefined}
      />
    </div>
  );
}

export default function ReviewWriteClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      }
    >
      <ReviewWriteContent />
    </Suspense>
  );
}
