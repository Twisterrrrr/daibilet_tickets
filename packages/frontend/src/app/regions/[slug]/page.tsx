'use client';

import { CATEGORY_LABELS, EventCategory, type EventListItem } from '@daibilet/shared';
import { MapPin, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

import { EventCard } from '@/components/ui/EventCard';
import { api } from '@/lib/api';
import type { RegionDetail } from '@/lib/api.types';

const categories = [
  { value: '', label: 'Все' },
  { value: EventCategory.EXCURSION, label: CATEGORY_LABELS[EventCategory.EXCURSION] },
  { value: EventCategory.MUSEUM, label: CATEGORY_LABELS[EventCategory.MUSEUM] },
  { value: EventCategory.EVENT, label: CATEGORY_LABELS[EventCategory.EVENT] },
];

const sortOptions = [
  { value: 'rating', label: 'По рейтингу' },
  { value: 'price_asc', label: 'Сначала дешёвые' },
  { value: 'price_desc', label: 'Сначала дорогие' },
];

function pluralEvents(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${n} событий`;
  if (mod10 === 1) return `${n} событие`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} события`;
  return `${n} событий`;
}

export default function RegionPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [region, setRegion] = useState<RegionDetail | null>(null);
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [_total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [selectedCity, setSelectedCity] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('rating');
  const [page, setPage] = useState(1);

  // Загрузка данных региона (один раз)
  useEffect(() => {
    api
      .getRegionBySlug(slug)
      .then(setRegion)
      .catch((e) => {
        console.warn('Region page error:', e);
        setError(true);
      });
  }, [slug]);

  // Загрузка событий (при изменении фильтров)
  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = {
      page,
      limit: 20,
      sort,
    };
    if (selectedCity) params.city = selectedCity;
    if (category) params.category = category;

    api
      .getRegionEvents(slug, params)
      .then((res) => {
        setEvents(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch((e) => {
        console.warn('Region page error:', e);
        setEvents([]);
        setTotal(0);
        setTotalPages(0);
      })
      .finally(() => setLoading(false));
  }, [slug, selectedCity, category, sort, page]);

  if (error) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Регион не найден</h1>
        <p className="mt-2 text-slate-500">Попробуйте выбрать другой город</p>
        <Link href="/" className="btn-primary mt-6 inline-flex">
          На главную
        </Link>
      </div>
    );
  }

  const stats = region?.stats ?? {};
  const totalCount = stats.totalCount ?? (stats.excursionCount ?? 0) + (stats.museumCount ?? 0) + (stats.eventCount ?? 0);
  const regionCategories = [
    { category: EventCategory.EXCURSION, emoji: '🚶', count: stats.excursionCount || 0 },
    { category: EventCategory.MUSEUM, emoji: '🏛️', count: stats.museumCount || 0 },
    { category: EventCategory.EVENT, emoji: '🎭', count: stats.eventCount || 0 },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-700 to-primary-900 py-14 sm:py-18">
        {region?.heroImage && (
          <Image
            src={region.heroImage}
            alt={region?.name || ''}
            fill
            className="absolute inset-0 h-full w-full object-cover opacity-20"
            sizes="100vw"
          />
        )}
        <div className="container-page relative">
          <div className="flex items-center gap-2 text-sm text-primary-200">
            <Link href="/" className="hover:text-white">
              Главная
            </Link>
            <span>/</span>
            {region?.hubCity != null && (
              <>
                <Link href={`/cities/${region.hubCity!.slug}`} className="hover:text-white">
                  {region.hubCity!.name}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-white">{region?.name || 'Регион'}</span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">{region?.name || 'Загрузка...'}</h1>
          {region?.description && <p className="mt-4 max-w-2xl text-base text-primary-100">{region.description}</p>}

          {/* Stats badges */}
          {totalCount > 0 && (
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
                <TrendingUp className="h-4 w-4 text-emerald-300" />
                {pluralEvents(totalCount)} в регионе
              </div>
              {regionCategories
                .filter((c) => c.count > 0)
                .map(({ category: cat, emoji, count }) => (
                  <div
                    key={cat}
                    className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80"
                  >
                    <span>{emoji}</span>
                    {CATEGORY_LABELS[cat]}: {count}
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>

      <div className="container-page py-8">
        {/* City chips — фильтр по городу */}
        {region?.cities && region.cities.length > 1 && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-slate-500">Города региона</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setSelectedCity('');
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  !selectedCity
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:text-primary-700'
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                Все города
                {totalCount > 0 && <span className="text-xs opacity-70">({totalCount})</span>}
              </button>
              {(region.cities ?? []).map((c) => (
                <button
                  key={c.id ?? c.slug}
                  onClick={() => {
                    setSelectedCity(c.slug);
                    setPage(1);
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    selectedCity === c.slug
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:text-primary-700'
                  }`}
                >
                  {c.name}
                  {(c.eventCount ?? 0) > 0 && <span className="text-xs opacity-70">({c.eventCount ?? 0})</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filters row: category tabs + sort */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Category tabs */}
          <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => {
                  setCategory(cat.value);
                  setPage(1);
                }}
                className={`flex-shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  category === cat.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Events grid */}
        {loading ? (
          <div className="grid gap-3 grid-cols-1 min-[361px]:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-36 sm:h-48 bg-slate-200" />
                <div className="p-3 sm:p-4 space-y-2.5">
                  <div className="h-4 w-3/4 rounded bg-slate-200" />
                  <div className="h-3 w-1/2 rounded bg-slate-200" />
                  <div className="h-5 w-1/3 rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length > 0 ? (
          <div className="grid gap-3 grid-cols-1 min-[361px]:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
            {events.map((event) => (
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
                city={event.city}
                address={event.address}
                dateMode={event.dateMode}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center">
            <p className="text-4xl">🔍</p>
            <h2 className="mt-4 text-lg font-semibold text-slate-700">Событий пока нет</h2>
            <p className="mt-2 text-sm text-slate-500">Попробуйте изменить фильтры или выбрать другой город</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary px-4 py-2.5 text-sm disabled:opacity-40"
            >
              Назад
            </button>
            <span className="px-3 text-sm text-slate-500">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="btn-secondary px-4 py-2.5 text-sm disabled:opacity-40"
            >
              Далее
            </button>
          </div>
        )}
      </div>

      {/* JSON-LD: Place */}
      {region && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Place',
              name: region.name,
              description: region.description || `Экскурсии и мероприятия в ${region.name}`,
              url: `https://daibilet.ru/regions/${region.slug ?? slug}`,
            }),
          }}
        />
      )}
    </>
  );
}
