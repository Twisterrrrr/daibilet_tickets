import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import type { MultiEventDetailDto } from '@/lib/api.types';
import { MultiEventPageClient } from './MultiEventPageClient';

type PageProps = { params: { slug: string } };

async function fetchMultiEvent(slug: string): Promise<MultiEventDetailDto | null> {
  try {
    return await api.getMultiEventBySlug(slug);
  } catch (e) {
    const msg = (e as Error).message || '';
    if (/\bHTTP\s*404\b/.test(msg) || msg.toLowerCase().includes('not found')) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const detail = await fetchMultiEvent(params.slug);
  if (!detail) {
    return {
      title: 'Группа событий не найдена',
      description: 'Проверьте корректность ссылки или выберите другое событие.',
    };
  }

  const { group } = detail;
  const title = `${group.title} — билеты и расписание`;
  const citiesPart =
    group.totalCities > 1
      ? ` в ${group.totalCities} городах`
      : group.totalCities === 1
        ? ' в одном городе'
        : '';
  const pricePart =
    group.minPrice != null ? `цены от ${Math.round(group.minPrice / 100)} ₽` : 'цены и даты';

  const description = `${group.title}${citiesPart}. Ближайшие даты, ${pricePart}.`;
  const canonicalPath = `/events/m/${group.slug}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      images: group.coverUrl ? [{ url: group.coverUrl }] : undefined,
      type: 'website',
    },
  };
}

export default async function MultiEventGroupPage({ params }: PageProps) {
  const detail = await fetchMultiEvent(params.slug);
  if (!detail) notFound();
  return <MultiEventPageClient detail={detail} />;
}

