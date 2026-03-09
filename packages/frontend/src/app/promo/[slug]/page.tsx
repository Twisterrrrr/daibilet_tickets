import type { Metadata } from 'next';
import Link from 'next/link';

import { EventCard } from '@/components/ui/EventCard';
import { VenueCard } from '@/components/ui/VenueCard';
import { api, type PromoCollectionDto } from '@/lib/api';

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await api.getPromoCollection(slug);
    return {
      title: `${data.title} | Дайбилет`,
      description:
        data.description?.slice(0, 160) || `${data.title} — подборка событий и мест на Дайбилет`,
    };
  } catch {
    return { title: 'Подборка не найдена' };
  }
}

function pluralEvents(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${n} событий`;
  if (mod10 === 1) return `${n} событие`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} события`;
  return `${n} событий`;
}

export default async function PromoCollectionPage({ params }: Props) {
  const { slug } = await params;

  let data: PromoCollectionDto;
  try {
    data = await api.getPromoCollection(slug);
  } catch {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Подборка не найдена</h1>
        <p className="mt-2 text-slate-500">
          Подборка была удалена или деактивирована.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-primary-600 px-6 py-3 text-white hover:bg-primary-700"
        >
          На главную
        </Link>
      </div>
    );
  }

  const events = data.events ?? [];
  const venues = data.venues ?? [];
  const total = events.length + venues.length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <section className="bg-gradient-to-br from-slate-900 via-primary-900 to-primary-800 py-12 sm:py-16">
        <div className="container-page">
          <nav className="mb-4 flex items-center gap-2 text-sm text-white/60">
            <Link href="/" className="hover:text-white/80">
              Главная
            </Link>
            <span>/</span>
            <span className="text-white/90">{data.title}</span>
          </nav>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{data.title}</h1>
          {data.description && (
            <p className="mt-3 max-w-2xl text-lg text-white/80">{data.description}</p>
          )}
          <p className="mt-2 text-sm text-white/60">
            {data.contentType === 'EVENTS'
              ? pluralEvents(total)
              : `${total} ${total === 1 ? 'место' : total < 5 ? 'места' : 'мест'}`}
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="container-page py-10">
        {events.length > 0 ? (
          <section>
            <h2 className="mb-6 text-xl font-semibold text-slate-900">События</h2>
            <div className="grid gap-4 grid-cols-1 min-[361px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {events.map((e) => (
                <EventCard
                  key={e.id}
                  slug={e.slug}
                  title={e.title}
                  category={e.category}
                  imageUrl={e.imageUrl}
                  priceFrom={e.priceFrom}
                  rating={Number(e.rating)}
                  city={e.city ?? undefined}
                  compact
                />
              ))}
            </div>
          </section>
        ) : venues.length > 0 ? (
          <section>
            <h2 className="mb-6 text-xl font-semibold text-slate-900">Места</h2>
            <div className="grid gap-4 grid-cols-1 min-[361px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {venues.map((v) => (
                <VenueCard
                  key={v.id}
                  slug={v.slug}
                  title={v.title}
                  imageUrl={v.imageUrl}
                  priceFrom={v.priceFrom}
                  rating={Number(v.rating)}
                  venueType="MUSEUM"
                  address={null}
                  metro={null}
                  reviewCount={0}
                />
              ))}
            </div>
          </section>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <p className="text-slate-500">В подборке пока нет элементов</p>
            <Link
              href="/"
              className="mt-4 inline-block text-primary-600 hover:text-primary-700"
            >
              Вернуться на главную
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
