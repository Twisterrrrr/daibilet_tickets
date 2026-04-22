import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { MultiEventDetailDto } from '@/lib/api.types';
import { MultiEventPageClient } from './MultiEventPageClient';

type PageProps = { params: Promise<{ slug: string }> };

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
  const { slug } = await params;
  const detail = await fetchMultiEvent(slug);
  if (!detail) {
    return {
      title: 'Группа событий не найдена',
      description: 'Проверьте корректность ссылки или выберите другое событие.',
      robots: { index: false, follow: true },
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
  const { slug } = await params;
  const detail = await fetchMultiEvent(slug);
  if (!detail) {
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20">
        <span className="text-6xl">🔍</span>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Группа не найдена или недоступна</h1>
        <p className="mt-2 max-w-md text-center text-slate-500">
          Ссылка могла устареть, а события — временно не в продаже. Так страница не отдаёт HTTP 404 поисковикам и
          закладкам.
        </p>
        <Link href="/events" className="btn-primary mt-6 inline-flex">
          Вернуться в каталог
        </Link>
      </div>
    );
  }
  return <MultiEventPageClient detail={detail} />;
}
