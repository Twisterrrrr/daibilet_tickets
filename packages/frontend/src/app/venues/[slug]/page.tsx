import type { Metadata } from 'next';
import Link from 'next/link';

import type { VenueListItem, VenueDetail } from '@daibilet/shared';

import { VenuePageView } from '@/components/venue/VenuePageView';
import { api } from '@/lib/api';
import { getSeoMeta } from '@/lib/seo/getSeoMeta';

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const res = await api.getVenues({ limit: 200 });
    return res.items.map((v: VenueListItem) => ({ slug: v.slug }));
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
    const venue = await api.getVenueBySlug(slug);
    const seo = await getSeoMeta('VENUE', venue.id);
    const title = seo?.title ?? venue.metaTitle ?? `${venue.title} — билеты, часы работы, адрес | Дайбилет`;
    const description =
      seo?.description ??
      venue.metaDescription ??
      venue.shortDescription ??
      stripHtml(venue.description || '').slice(0, 160);
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
    return { title: 'Место не найдено' };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function VenuePage({ params }: Props) {
  const { slug } = await params;

  let venue: VenueDetail;
  try {
    venue = await api.getVenueBySlug(slug);
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Место не найдено</h1>
          <Link href="/venues" className="text-blue-600 hover:underline">
            Вернуться к каталогу
          </Link>
        </div>
      </div>
    );
  }

  return <VenuePageView venue={venue} mode="public" />;
}

