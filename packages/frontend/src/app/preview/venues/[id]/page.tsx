import type { Metadata } from 'next';

import type { VenueDetail } from '@daibilet/shared';
import { VenuePageView } from '@/components/venue/VenuePageView';
import { PreviewBanner } from '@/components/preview/PreviewBanner';
import { api } from '@/lib/api';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}

export const metadata: Metadata = {
  title: 'Предпросмотр места',
  robots: { index: false, follow: false },
};

export default async function VenuePreviewPage({ params, searchParams }: Props) {
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

  let venue: VenueDetail;
  try {
    venue = await api.getVenuePreview(id, token);
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

  const publicUrl = venue.slug ? `/venues/${venue.slug}` : null;

  return (
    <>
      <PreviewBanner publicUrl={publicUrl} />
      <VenuePageView venue={venue} mode="preview" />
    </>
  );
}

