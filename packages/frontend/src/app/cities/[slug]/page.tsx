import { CATEGORY_LABELS, EventCategory, type VenueListItem, type EventListItem } from '@daibilet/shared';
import { ArrowRight, Tag, Ticket, TrendingUp } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { EventCard } from '@/components/ui/EventCard';
import { VenueCard } from '@/components/ui/VenueCard';
import { api } from '@/lib/api';
import { CITY_INFO } from '@/lib/cityInfo';
import { CITY_IMAGES } from '@/lib/cityImages';
import type { CityDetail } from '@/lib/api.types';
import { getSeoMeta } from '@/lib/seo/getSeoMeta';

// ISR: обновлять каждые 6 часов
export const revalidate = 21600;

/** Предварительная генерация для featured-городов */
export async function generateStaticParams() {
  try {
    const cities = await api.getCities(true);
    return cities.map((c) => ({ slug: c.slug }));
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
    const city = await api.getCityBySlug(slug);
    const seo = await getSeoMeta('CITY', city.id);
    const title = String(seo?.title ?? city.metaTitle ?? `${city.name} — экскурсии, музеи и билеты на мероприятия | Дайбилет`);
    const description = String(
      seo?.description ??
        city.metaDescription ??
        city.description ??
        `Лучшие экскурсии, музеи и мероприятия в ${city.name}. Покупайте билеты онлайн на Дайбилет.`,
    );
    const robots = String(seo?.robots ?? 'index,follow');
    const canonical = typeof seo?.canonicalUrl === 'string' ? seo.canonicalUrl : undefined;
    const ogTitle = typeof (seo?.ogTitle ?? title) === 'string' ? (seo?.ogTitle ?? title) : title;
    const ogDescription = typeof (seo?.ogDescription ?? description) === 'string' ? (seo?.ogDescription ?? description) : description;
    const ogImage = typeof seo?.ogImage === 'string' ? seo.ogImage : undefined;
    return {
      title,
      description,
      robots,
      ...(canonical && { alternates: { canonical } }),
      openGraph: {
        title: ogTitle,
        description: ogDescription,
        ...(ogImage && { images: [{ url: ogImage }] }),
        type: 'website',
      },
    };
  } catch {
    return { title: 'Город не найден' };
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

/** Склонение названия региона в предложный падеж ("Также в ...") */
function declineRegionName(name: string): string {
  // Словарь исключений
  const exceptions: Record<string, string> = {
    'Золотое кольцо': 'Золотом кольце',
    Татарстан: 'Татарстане',
  };
  if (exceptions[name]) return exceptions[name];

  // "Xская область" → "Xской области", "Xая область" → "Xой области"
  if (name.endsWith('ская область')) return name.replace('ская область', 'ской области');
  if (name.endsWith('кая область')) return name.replace('кая область', 'кой области');

  // Общий fallback для "область"
  if (name.endsWith(' область')) return name.replace(' область', ' области');

  return name;
}

export default async function CityPage({ params }: Props) {
  const { slug } = await params;
  let city: CityDetail | null = null;
  try {
    city = await api.getCityBySlug(slug);
  } catch {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Город не найден</h1>
        <p className="mt-2 text-slate-500">Попробуйте выбрать другой город</p>
        <Link href="/" className="btn-primary mt-6 inline-flex">
          На главную
        </Link>
      </div>
    );
  }

  const imageConfig = CITY_IMAGES[slug];
  const heroImage = imageConfig?.hero ?? city.heroImage ?? null;

  // Загрузить venues для города
  let venues: VenueListItem[] = [];
  try {
    const venuesRes = await api.getVenues({ city: slug, limit: 6 });
    venues = (venuesRes.items as VenueListItem[]) || [];
  } catch {
    /* noop */
  }

  const info = CITY_INFO[slug];
  const stats = city.stats ?? {};
  const popularTags = city.popularTags ?? [];

  const categories = [
    { category: EventCategory.EXCURSION, emoji: '🚶', count: stats.excursionCount || 0 },
    { category: EventCategory.MUSEUM, emoji: '🏛️', count: stats.museumCount || 0 },
    { category: EventCategory.EVENT, emoji: '🎭', count: stats.eventCount || 0 },
  ];

  // Разделяем события: топ-6 рекомендуемых + остальные
  const allEvents: EventListItem[] = city.events ?? [];
  const topEvents = allEvents.slice(0, 6);
  const moreEvents = allEvents.slice(6);

  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-700 to-primary-900 py-16 sm:py-20">
        {heroImage && (
          <Image src={heroImage} alt={city.name} fill priority sizes="100vw" className="object-cover opacity-20" />
        )}
        <div className="container-page relative">
          <div className="flex items-center gap-2 text-sm text-primary-200">
            <Link href="/" className="hover:text-white">
              Главная
            </Link>
            <span>/</span>
            <span className="text-white">{city.name}</span>
          </div>
          <h1 className="mt-3 text-4xl font-extrabold text-white sm:text-5xl">{city.name}</h1>
          <p className="mt-4 max-w-2xl text-lg text-primary-100">
            {info?.brief || city.description || `Экскурсии, музеи и мероприятия в ${city.name}`}
          </p>

          {/* Stats badges */}
          {(stats.totalCount ?? 0) > 0 && (
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
                <TrendingUp className="h-4 w-4 text-emerald-300" />
                {pluralEvents(stats.totalCount ?? 0)} в каталоге
              </div>
              {categories
                .filter((c) => c.count > 0)
                .map(({ category, emoji, count }) => (
                  <div
                    key={category}
                    className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80"
                  >
                    <span>{emoji}</span>
                    {CATEGORY_LABELS[category]}: {count}
                  </div>
                ))}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/events?city=${slug}`} className="btn-primary bg-white !text-primary-700 hover:!bg-primary-50">
              <Ticket className="mr-2 h-4 w-4" />
              Все события в {city.name}
            </Link>
          </div>
        </div>
      </section>

      {/* Landing pages — спецпредложения для города */}
      {city.landingPages && city.landingPages.length > 0 && (
        <section className="bg-gradient-to-r from-primary-50 to-amber-50 py-8">
          <div className="container-page">
            <h2 className="text-lg font-bold text-slate-900">Популярные направления</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {city.landingPages.map((lp) => (
                <Link
                  key={lp.slug}
                  href={`/cities/${slug}/${lp.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-white px-4 py-2 text-sm font-medium text-primary-700 shadow-sm transition-colors hover:bg-primary-100 hover:border-primary-300"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  {lp.title}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Must-see places */}
      {info?.mustSee && info.mustSee.length > 0 && (
        <section className="container-page py-12">
          <h2 className="text-2xl font-bold text-slate-900">Что обязательно посетить в {city.name}</h2>
          <p className="mt-2 text-slate-500">Главные достопримечательности, которые стоит увидеть</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {info.mustSee.map((place, i) => (
              <div
                key={i}
                className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100 text-lg font-bold text-primary-600">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{place.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{place.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Категории с количеством */}
      <section className="bg-slate-50 py-10">
        <div className="container-page">
          <div className="grid gap-3 sm:grid-cols-3">
            {categories.map(({ category, emoji, count }) => (
              <Link
                key={category}
                href={
                  category === EventCategory.MUSEUM
                    ? `/cities/${slug}/museums`
                    : `/events?city=${slug}&category=${category}`
                }
                className="card flex items-center gap-4 p-5 transition-transform hover:scale-[1.02]"
              >
                <span className="text-3xl">{emoji}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{CATEGORY_LABELS[category]}</h3>
                  <p className="text-sm text-slate-500">{count > 0 ? pluralEvents(count) : 'Скоро'}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Venues (Музеи и Арт) */}
      {venues.length > 0 && (
        <section className="container-page py-10">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Музеи и искусство</h2>
              <p className="mt-1 text-sm text-slate-500">Музеи, галереи и арт-пространства</p>
            </div>
            <Link
              href={`/cities/${slug}/museums`}
              className="hidden text-sm font-medium text-primary-600 hover:text-primary-700 sm:flex sm:items-center sm:gap-1"
            >
              Все музеи <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <VenueCard key={venue.id} {...venue} />
            ))}
          </div>
        </section>
      )}

      {/* Popular tags */}
      {popularTags.length > 0 && (
        <section className="container-page py-10">
          <h3 className="text-lg font-semibold text-slate-900">Популярные теги</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {popularTags.map((t) => (
              <Link
                key={t.id}
                href={`/tags/${t.slug}?city=${slug}`}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
              >
                <Tag className="h-3.5 w-3.5" />
                {t.name}
                {(t._count?.events ?? 0) > 0 && (
                <span className="text-xs text-slate-400">({t._count?.events ?? 0})</span>
              )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Рекомендуемые события */}
      {topEvents.length > 0 && (
        <section className="container-page pb-12">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Рекомендуем в {city.name}</h2>
              <p className="mt-1 text-sm text-slate-500">Топ событий по рейтингу</p>
            </div>
            <Link
              href={`/events?city=${slug}`}
              className="hidden text-sm font-medium text-primary-600 hover:text-primary-700 sm:flex sm:items-center sm:gap-1"
            >
              Все события <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topEvents.map((event) => (
              <EventCard
                key={event.id}
                slug={event.slug}
                title={event.title}
                category={event.category}
                imageUrl={event.imageUrl}
                priceFrom={event.priceFrom}
                rating={event.rating}
                reviewCount={event.reviewCount}
                durationMinutes={event.durationMinutes}
                city={{ slug: city.slug, name: city.name }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Ещё события */}
      {moreEvents.length > 0 && (
        <section className="container-page pb-16">
          <h2 className="text-xl font-bold text-slate-900">Ещё события</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {moreEvents.map((event) => (
              <EventCard
                key={event.id}
                slug={event.slug}
                title={event.title}
                category={event.category}
                imageUrl={event.imageUrl}
                priceFrom={event.priceFrom}
                rating={event.rating}
                reviewCount={event.reviewCount}
                durationMinutes={event.durationMinutes}
                compact
              />
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href={`/events?city=${slug}`} className="btn-secondary inline-flex items-center gap-2">
              Все события в {city.name}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* Также в регионе — превью событий из соседних городов */}
      {city.regionPreview && city.regionPreview.events?.length > 0 && (
        <section className="bg-gradient-to-b from-slate-50 to-white py-12">
          <div className="container-page">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Также в {declineRegionName(city.regionPreview.regionName)}
                </h2>
                <p className="mt-1 text-sm text-slate-500">События из соседних городов региона</p>
              </div>
              <Link
                href={`/regions/${city.regionPreview.regionSlug}`}
                className="hidden text-sm font-medium text-primary-600 hover:text-primary-700 sm:flex sm:items-center sm:gap-1"
              >
                Все события региона <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-6 -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
                {city.regionPreview.events.map((event) => (
                  <div key={event.id} className="min-w-[260px] flex-shrink-0 sm:min-w-0">
                    <EventCard
                      slug={event.slug}
                      title={event.title}
                      category={event.category}
                      imageUrl={event.imageUrl}
                      priceFrom={event.priceFrom}
                      rating={event.rating}
                      reviewCount={event.reviewCount}
                      durationMinutes={event.durationMinutes}
                      city={event.city}
                      dateMode={event.dateMode}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 text-center sm:hidden">
              <Link
                href={`/regions/${city.regionPreview.regionSlug}`}
                className="btn-secondary inline-flex items-center gap-2 text-sm"
              >
                Все события региона
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Empty state */}
      {allEvents.length === 0 && (
        <section className="container-page pb-16">
          <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center">
            <p className="text-4xl">🎭</p>
            <h2 className="mt-4 text-xl font-semibold text-slate-700">События скоро появятся</h2>
            <p className="mt-2 text-slate-500">
              Мы подключаем билетные системы — события в {city.name} будут доступны в ближайшее время
            </p>
          </div>
        </section>
      )}

      {/* JSON-LD: Place */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Place',
            name: city.name,
            description: city.description || city.metaDescription || `Экскурсии и мероприятия в городе ${city.name}`,
            ...(typeof city.lat === 'number' && typeof city.lng === 'number'
              ? {
                  geo: {
                    '@type': 'GeoCoordinates',
                    latitude: city.lat,
                    longitude: city.lng,
                  },
                }
              : {}),
            url: `https://daibilet.ru/cities/${city.slug}`,
            image: city.heroImage || undefined,
          }),
        }}
      />

      {/* JSON-LD: BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Города',
                item: 'https://daibilet.ru/cities',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: city.name,
              },
            ],
          }),
        }}
      />
    </>
  );
}
