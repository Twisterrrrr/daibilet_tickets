'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { EventCard } from '@/components/ui/EventCard';
import { CATEGORY_LABELS, EventCategory } from '@daibilet/shared';

const categories = [
  { value: '', label: 'Все' },
  { value: EventCategory.EXCURSION, label: CATEGORY_LABELS[EventCategory.EXCURSION] },
  { value: EventCategory.MUSEUM, label: CATEGORY_LABELS[EventCategory.MUSEUM] },
  { value: EventCategory.EVENT, label: CATEGORY_LABELS[EventCategory.EVENT] },
];

const sortOptions = [
  { value: 'popular', label: 'По популярности' },
  { value: 'rating', label: 'По рейтингу' },
  { value: 'price_asc', label: 'Сначала дешёвые' },
  { value: 'price_desc', label: 'Сначала дорогие' },
];

export default function EventsPage() {
  const searchParams = useSearchParams();

  const [events, setEvents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState<any[]>([]);

  const [city, setCity] = useState(searchParams.get('city') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'popular');
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.getCities().then(setCities).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, sort };
    if (city) params.city = city;
    if (category) params.category = category;

    api
      .getEvents(params)
      .then((res) => { setEvents(res.items); setTotal(res.total); })
      .catch(() => { setEvents([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [city, category, sort, page]);

  const activeFilters = [city, category].filter(Boolean).length;

  return (
    <div className="container-page py-6 sm:py-10">
      {/* Header */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Каталог событий</h1>
        <p className="mt-1 text-sm text-slate-500 sm:text-base">
          {total > 0 ? `${total} событий` : 'Экскурсии, музеи и мероприятия по городам России'}
        </p>
      </div>

      {/* Filters — stacked on mobile, inline on desktop */}
      <div className="mb-6 space-y-3 sm:mb-8 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        {/* Row 1 on mobile: City + Sort */}
        <div className="flex gap-2">
          <select
            value={city}
            onChange={(e) => { setCity(e.target.value); setPage(1); }}
            className="flex-1 min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:flex-none sm:py-2"
          >
            <option value="">Все города</option>
            {cities.map((c: any) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="flex-1 min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:ml-auto sm:flex-none sm:py-2"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Row 2: Category tabs — horizontal scroll on mobile */}
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => { setCategory(cat.value); setPage(1); }}
                className={`flex-shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  category === cat.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}

            {/* Clear filters inline */}
            {activeFilters > 0 && (
              <button
                onClick={() => { setCity(''); setCategory(''); setPage(1); }}
                className="ml-1 flex flex-shrink-0 items-center gap-1 rounded-md px-2.5 py-2 text-sm text-slate-500 hover:bg-white hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" /> Сбросить
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Events grid */}
      {loading ? (
        <div className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
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
        <div className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {events.map((event: any) => (
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
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 sm:py-20 text-center">
          <p className="text-4xl">🔍</p>
          <h2 className="mt-4 text-lg font-semibold text-slate-700 sm:text-xl">Событий пока нет</h2>
          <p className="mt-2 text-sm text-slate-500">
            После подключения Ticketscloud здесь появятся экскурсии, музеи и мероприятия
          </p>
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="mt-8 sm:mt-10 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary px-4 py-2.5 text-sm disabled:opacity-40"
          >
            Назад
          </button>
          <span className="px-3 text-sm text-slate-500">
            {page} / {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="btn-secondary px-4 py-2.5 text-sm disabled:opacity-40"
          >
            Далее
          </button>
        </div>
      )}
    </div>
  );
}
