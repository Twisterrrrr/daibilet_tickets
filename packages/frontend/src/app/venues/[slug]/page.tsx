import type { Metadata } from 'next';
import Link from 'next/link';

import type { VenueListItem, VenueDetail, VenueProgramResponse } from '@daibilet/shared';

import { VenuePageView } from '@/components/venue/VenuePageView';
import { api } from '@/lib/api';
import { getSeoMeta } from '@/lib/seo/getSeoMeta';
import { buildVenueTemplateSections } from '@/lib/venues/buildVenueTemplateSections';

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
    const templateSections = buildVenueTemplateSections(venue);
    const title = seo?.title ?? venue.metaTitle ?? `${venue.title} — билеты, часы работы, адрес | Дайбилет`;
    const description =
      seo?.description ??
      venue.metaDescription ??
      templateSections.introLead ??
      stripHtml(templateSections.descriptionHtml || '').slice(0, 160);
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

  let program: VenueProgramResponse | null = null;
  try {
    program = await api.getVenueProgram(slug);
  } catch {
    program = null;
  }

  return <VenuePageView venue={venue} mode="public" program={program} />;
}

