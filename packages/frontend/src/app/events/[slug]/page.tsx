import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import type { EventListItem } from '@daibilet/shared';
import type { EventDetailFrontend } from '@/lib/api.types';

import { EventPageView } from '@/components/events/EventPageView';
import { api } from '@/lib/api';
import { getSeoMeta } from '@/lib/seo/getSeoMeta';

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const res = await api.getEvents({ sort: 'popular', limit: 200 });
    return res.items.map((e: EventListItem) => ({ slug: e.slug }));
  } catch {
    return [];
  }
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const event = await api.getEventBySlug(slug);
    const seo = await getSeoMeta('EVENT', event.id);

    const title = seo?.title ?? `${event.title} — купить билет | Дайбилет`;
    const description =
      seo?.description ?? event.shortDescription ?? stripHtml(event.description || '').slice(0, 160);
    const robots = seo?.robots ?? 'index,follow';
    const canonical = seo?.canonicalUrl ?? undefined;

    return {
      title,
      description,
      robots,
      ...(canonical && { alternates: { canonical } }),
      openGraph: {
        title: seo?.ogTitle ?? title,
        description: seo?.ogDescription ?? description,
        ...(seo?.ogImage && { images: [{ url: seo.ogImage }] }),
        type: 'website',
      },
    };
  } catch {
    return { title: 'Событие не найдено' };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  let event: EventDetailFrontend;

  try {
    event = await api.getEventBySlug(slug);
  } catch {
    // Если slug — это venue (музей/площадка), перенаправляем
    try {
      await api.getVenueBySlug(slug);
      redirect(`/venues/${slug}`);
    } catch {
      // И event, и venue не найдены — показываем 404
    }
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20">
        <span className="text-6xl">🔍</span>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Событие не найдено</h1>
        <p className="mt-2 text-slate-500">Возможно, оно было снято с продажи</p>
        <Link href="/events" className="btn-primary mt-6 inline-flex">
          Вернуться в каталог
        </Link>
      </div>
    );
  }

  return <EventPageView event={event} mode="public" />;
}

