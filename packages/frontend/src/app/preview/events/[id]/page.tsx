import type { Metadata } from 'next';

import type { EventDetailFrontend } from '@/lib/api.types';
import { EventPageView } from '@/components/events/EventPageView';
import { PreviewBanner } from '@/components/preview/PreviewBanner';
import { api } from '@/lib/api';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}

export const metadata: Metadata = {
  title: 'Предпросмотр события',
  robots: { index: false, follow: false },
};

export default async function EventPreviewPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20">
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Предпросмотр недоступен</h1>
        <p className="mt-2 text-slate-500">Отсутствует token предпросмотра.</p>
      </div>
    );
  }

  let event: EventDetailFrontend;
  try {
    event = await api.getEventPreview(id, token);
  } catch (e) {
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20">
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Ошибка предпросмотра</h1>
        <p className="mt-2 text-slate-500">
          {(e as Error).message || 'Не удалось загрузить данные предпросмотра.'}
        </p>
      </div>
    );
  }

  const publicUrl = event.slug ? `/events/${event.slug}` : null;

  return (
    <>
      <PreviewBanner publicUrl={publicUrl} />
      <EventPageView event={event} mode="preview" />
    </>
  );
}

