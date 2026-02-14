import Link from 'next/link';
import { ArrowRight, TrendingUp, Ticket, Landmark, MapPin, Star, Headphones } from 'lucide-react';
import { CATEGORY_LABELS, EventCategory } from '@daibilet/shared';
import { api } from '@/lib/api';
import { EventCard } from '@/components/ui/EventCard';
import { PromoBlock } from '@/components/ui/PromoBlock';
import { HeroCitySearch } from '@/components/ui/HeroCitySearch';

// ISR: обновлять каждый час
export const revalidate = 3600;

const categoryMeta = [
  { category: EventCategory.EXCURSION, emoji: '🚶' },
  { category: EventCategory.MUSEUM, emoji: '🏛️' },
  { category: EventCategory.EVENT, emoji: '🎭' },
];

function pluralEvents(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${n} событий`;
  if (mod10 === 1) return `${n} событие`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} события`;
  return `${n} событий`;
}

export default async function HomePage() {
  let cities: any[] = [];
  try {
    cities = await api.getCities(true);
  } catch {
    cities = [];
  }

  let popularEvents: any[] = [];
  try {
    const res = await api.getEvents({ sort: 'popular', limit: 8 });
    popularEvents = res.items || [];
  } catch {
    popularEvents = [];
  }

  // Fallback: если popular пусто — берём по рейтингу
  if (popularEvents.length === 0) {
    try {
      const res = await api.getEvents({ sort: 'rating', limit: 8 });
      popularEvents = res.items || [];
    } catch {
      popularEvents = [];
    }
  }

  let popularTags: any[] = [];
  try {
    const allTags = await api.getTags();
    popularTags = (allTags as any[])
      .filter((t: any) => t._count?.events > 0)
      .sort((a: any, b: any) => (b._count?.events ?? 0) - (a._count?.events ?? 0))
      .slice(0, 20);
  } catch {
    popularTags = [];
  }

  // Счётчики для социального доказательства
  const totalEvents = cities.reduce((sum: number, c: any) => sum + (c._count?.events ?? 0), 0);
  const totalVenues = cities.reduce((sum: number, c: any) => sum + (c._count?.venues ?? 0), 0);
  const totalCities = cities.length;

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="relative overflow-visible bg-gradient-to-br from-slate-900 via-primary-900 to-primary-800">
        {/* Subtle pattern */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="container-page relative py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Билеты на экскурсии, музеи
              <span className="block text-primary-300">и мероприятия</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-300">
              {totalEvents > 0 ? `${totalEvents}+ событий` : 'Сотни событий'} в {totalCities > 0 ? `${totalCities} городах` : 'городах'} России.
              Экскурсии, музеи, концерты, шоу — выбирайте и покупайте онлайн.
            </p>

            {/* City search */}
            <div className="mx-auto mt-10 max-w-lg">
              <HeroCitySearch cities={cities} />
            </div>

            {/* Quick links */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {cities.slice(0, 4).map((city: any) => (
                <Link
                  key={city.slug}
                  href={`/cities/${city.slug}`}
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/80 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white"
                >
                  {city.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ POPULAR EVENTS ============ */}
      {popularEvents.length > 0 && (
        <section className="py-12 sm:py-16">
          <div className="container-page">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Популярные события</h2>
                <p className="mt-1 text-slate-500">Лучшие экскурсии и мероприятия по рейтингу</p>
              </div>
              <Link
                href="/events"
                className="hidden text-sm font-medium text-primary-600 hover:text-primary-700 sm:block"
              >
                Все события →
              </Link>
            </div>
            <div className="mt-6 grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {popularEvents.map((event: any) => (
                <EventCard
                  key={event.id}
                  slug={event.slug}
                  title={event.title}
                  category={event.category}
                  subcategories={event.subcategories}
                  imageUrl={event.imageUrl}
                  priceFrom={event.priceFrom}
                  rating={event.rating}
                  reviewCount={event.reviewCount}
                  durationMinutes={event.durationMinutes}
                  city={event.city}
                  nextSessionAt={event.nextSessionAt}
                  compact
                />
              ))}
            </div>
            <div className="mt-6 text-center sm:hidden">
              <Link
                href="/events"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-600"
              >
                Все события <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ============ SEASONAL PROMOS ============ */}
      <section className="py-12 sm:py-16">
        <div className="container-page">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Сезонные предложения</h2>
          <p className="mt-1 text-slate-500">Лучшие события и экскурсии сезона</p>
          <div className="mt-6">
            <PromoBlock />
          </div>
        </div>
      </section>

      {/* ============ CITIES ============ */}
      <section className="py-16 sm:py-20">
        <div className="container-page">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Города</h2>
              <p className="mt-1 text-slate-500">Выберите город — покажем лучшие события</p>
            </div>
            <Link
              href="/cities"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Все города →
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cities.map((city: any) => (
              <Link
                key={city.slug}
                href={`/cities/${city.slug}`}
                className="card group relative flex h-48 flex-col justify-end overflow-hidden bg-gradient-to-br from-primary-800 to-primary-950 transition-transform hover:scale-[1.02]"
              >
                {city.heroImage && (
                  <img
                    src={city.heroImage}
                    alt={city.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="relative p-5">
                  <h3 className="text-xl font-bold text-white">{city.name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-300">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                      {pluralEvents(city._count?.events ?? 0)}
                    </span>
                    {(city._count?.venues ?? 0) > 0 && (
                      <span className="flex items-center gap-1.5 text-sm text-white/60">
                        {city._count.venues} {city._count.venues === 1 ? 'музей' : city._count.venues < 5 ? 'музея' : 'музеев'}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CATEGORIES + TAGS ============ */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="container-page">
          <h2 className="text-3xl font-bold text-slate-900">Что посмотреть</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categoryMeta.map(({ category, emoji }) => (
              <Link
                key={category}
                href={category === EventCategory.MUSEUM ? '/venues' : `/events?category=${category}`}
                className="card flex items-center gap-4 p-6 transition-transform hover:scale-[1.02]"
              >
                <span className="text-4xl">{emoji}</span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {CATEGORY_LABELS[category]}
                  </h3>
                  <p className="text-sm text-slate-500">Смотреть все</p>
                </div>
                <ArrowRight className="ml-auto h-5 w-5 text-slate-400" />
              </Link>
            ))}
            <Link
              href="/events?audience=KIDS"
              className="card flex items-center gap-4 p-6 transition-transform hover:scale-[1.02]"
            >
              <span className="text-4xl">👶</span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Детям</h3>
                <p className="text-sm text-slate-500">Смотреть все</p>
              </div>
              <ArrowRight className="ml-auto h-5 w-5 text-slate-400" />
            </Link>
          </div>

          {popularTags.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-slate-700">Популярные темы</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {popularTags.map((tag: any) => (
                  <Link
                    key={tag.slug}
                    href={`/events?tag=${tag.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-primary-300 hover:text-primary-700 hover:shadow-md"
                  >
                    {tag.name}
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500">
                      {tag._count?.events ?? 0}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ============ SOCIAL PROOF ============ */}
      <section className="py-16 sm:py-20">
        <div className="container-page">
          <div className="grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100">
                <Ticket className="h-6 w-6 text-primary-600" />
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                {totalEvents > 0 ? `${totalEvents}+` : '1000+'}
              </p>
              <p className="mt-1 text-sm text-slate-500">событий в каталоге</p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                <Landmark className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                {totalVenues > 0 ? `${totalVenues}+` : '50+'}
              </p>
              <p className="mt-1 text-sm text-slate-500">площадок и музеев</p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
                <MapPin className="h-6 w-6 text-amber-600" />
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                {totalCities > 0 ? totalCities : '5'}
              </p>
              <p className="mt-1 text-sm text-slate-500">городов России</p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">4.8</p>
              <p className="mt-1 text-sm text-slate-500">средний рейтинг</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ BOTTOM CTA ============ */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 py-14 sm:py-18">
        <div className="container-page">
          <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                Нужна помощь с выбором?
              </h2>
              <p className="mt-2 max-w-lg text-base text-white/70">
                Напишите нам — подберём события под ваши даты, интересы и бюджет. Или посмотрите каталог самостоятельно.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/events"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary-700 shadow-lg transition-all hover:bg-primary-50 hover:shadow-xl"
              >
                <Ticket className="h-5 w-5" />
                Смотреть каталог
              </Link>
              <Link
                href="/help"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/50 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
              >
                <Headphones className="h-5 w-5" />
                Написать нам
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
