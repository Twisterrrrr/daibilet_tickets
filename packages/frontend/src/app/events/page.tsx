'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { EventCard } from '@/components/ui/EventCard';
import { DateRibbon } from '@/components/ui/DateRibbon';
import { PromoBlock } from '@/components/ui/PromoBlock';
import {
  CATEGORY_LABELS,
  EventCategory,
  EventAudience,
  AUDIENCE_LABELS,
  QUICK_FILTERS,
  type QuickFilter,
} from '@daibilet/shared';

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
  { value: 'departing_soon', label: 'Начнутся скоро' },
];

const TIME_OF_DAY_OPTIONS = [
  { value: '', label: 'Любое время' },
  { value: 'soon', label: '🔥 Скоро' },
  { value: 'morning', label: '🌅 Утро' },
  { value: 'day', label: '☀️ День' },
  { value: 'evening', label: '🌆 Вечер' },
  { value: 'night', label: '🌙 Ночь' },
];

export default function EventsPage() {
  const searchParams = useSearchParams();

  const [events, setEvents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState<any[]>([]);

  const [city, setCity] = useState(searchParams.get('city') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [audience, setAudience] = useState(searchParams.get('audience') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'popular');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [timeOfDay, setTimeOfDay] = useState(searchParams.get('sort') === 'departing_soon' ? 'soon' : '');
  const [pier, setPier] = useState('');
  const [piers, setPiers] = useState<any[]>([]);
  const [page, setPage] = useState(1);

  // Активный quick-filter чип (id из QUICK_FILTERS)
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>('');

  // Sync from URL on navigation (e.g. /events?tag=bridges)
  const urlTag = searchParams.get('tag') || '';

  // Определяем витрину: конкретная категория, «Детям», или «Все»
  const vitrineKey = audience === 'KIDS' ? 'KIDS' : category || '';

  // Текущие быстрые фильтры для витрины
  const quickFilters = useMemo<QuickFilter[]>(
    () => (vitrineKey ? QUICK_FILTERS[vitrineKey] || [] : []),
    [vitrineKey],
  );

  // Параметры от активного quick filter
  const quickFilterParams = useMemo(() => {
    if (!activeQuickFilter) return {};
    const qf = quickFilters.find((f) => f.id === activeQuickFilter);
    return qf ? qf.params : {};
  }, [activeQuickFilter, quickFilters]);

  // «Скоро» = departing_soon sort
  const isSoonMode = timeOfDay === 'soon';
  const effectiveSort = isSoonMode ? 'departing_soon' : sort;
  const effectiveTimeOfDay = isSoonMode ? '' : timeOfDay;

  useEffect(() => {
    api.getCities().then(setCities).catch((e) => { console.error('Events page error:', e); });
  }, []);

  useEffect(() => {
    if (city) {
      api.getLocations(city, 'PIER').then(setPiers).catch((e) => { console.error('Events page error:', e); setPiers([]); });
    } else {
      setPiers([]);
      setPier('');
    }
  }, [city]);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, sort: effectiveSort };
    if (city) params.city = city;
    if (category) params.category = category;
    if (audience) params.audience = audience;
    if (urlTag) params.tag = urlTag;

    // Лента дат: одиночная дата или диапазон "yyyy-mm-dd..yyyy-mm-dd"
    if (selectedDate) {
      if (selectedDate.includes('..')) {
        const [from, to] = selectedDate.split('..');
        params.dateFrom = `${from}T00:00:00`;
        params.dateTo = `${to}T23:59:59`;
      } else {
        params.dateFrom = `${selectedDate}T00:00:00`;
        params.dateTo = `${selectedDate}T23:59:59`;
      }
    }
    if (effectiveTimeOfDay) params.timeOfDay = effectiveTimeOfDay;
    if (pier) params.pier = pier;

    // Параметры от quick filter
    for (const [k, v] of Object.entries(quickFilterParams)) {
      params[k] = v;
    }

    api
      .getEvents(params)
      .then((res) => { setEvents(res.items); setTotal(res.total); })
      .catch((e) => { console.error('Events page error:', e); setEvents([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [city, category, audience, urlTag, effectiveSort, selectedDate, effectiveTimeOfDay, pier, page, quickFilterParams]);

  const activeFiltersCount = [city, category, selectedDate, audience, urlTag, timeOfDay, pier, activeQuickFilter].filter(Boolean).length;

  const clearAllFilters = useCallback(() => {
    setCity('');
    setCategory('');
    setSelectedDate(null);
    setAudience('');
    setTimeOfDay('');
    setPier('');
    setActiveQuickFilter('');
    setPage(1);
  }, []);

  const handleCategorySelect = useCallback((value: string) => {
    setCategory(value);
    setAudience('');
    setActiveQuickFilter('');
    setPage(1);
  }, []);

  const handleAudienceKids = useCallback(() => {
    setAudience('KIDS');
    setCategory('');
    setActiveQuickFilter('');
    setPage(1);
  }, []);

  const handleQuickFilter = useCallback((filterId: string) => {
    setActiveQuickFilter((prev) => (prev === filterId ? '' : filterId));
    setPage(1);
  }, []);

  return (
    <div className="container-page py-6 sm:py-10">
      {/* Header */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Каталог событий</h1>
        <p className="mt-1 text-sm text-slate-500 sm:text-base">
          {total > 0 ? `${total} событий` : 'Экскурсии, музеи и мероприятия по городам России'}
        </p>
      </div>

      {/* Category tabs — horizontal scroll on mobile */}
      <div className="-mx-4 mb-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => handleCategorySelect(cat.value)}
              className={`flex-shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                category === cat.value && !audience
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
          <button
            onClick={handleAudienceKids}
            className={`flex-shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              audience === 'KIDS'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {AUDIENCE_LABELS[EventAudience.KIDS]}
          </button>

          {/* Clear filters inline */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="ml-1 flex flex-shrink-0 items-center gap-1 rounded-md px-2.5 py-2 text-sm text-slate-500 hover:bg-white hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" /> Сбросить
            </button>
          )}
        </div>
      </div>

      {/* Quick Filters — контекстные чипы витрины */}
      {quickFilters.length > 0 && (
        <div className="-mx-4 mb-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => { setActiveQuickFilter(''); setPage(1); }}
              className={`flex-shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                !activeQuickFilter
                  ? 'bg-primary-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:text-primary-700'
              }`}
            >
              Все
            </button>
            {quickFilters.map((qf) => (
              <button
                key={qf.id}
                onClick={() => handleQuickFilter(qf.id)}
                className={`flex-shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  activeQuickFilter === qf.id
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:text-primary-700'
                }`}
              >
                <span className="mr-1">{qf.emoji}</span>
                {qf.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Promo block - only when no active filters */}
      {!category && !audience && !selectedDate && !urlTag && !activeQuickFilter && (
        <div className="mb-5 sm:mb-6">
          <PromoBlock />
        </div>
      )}

      {/* Date ribbon */}
      <div className="-mx-4 mb-4 px-4 sm:mx-0 sm:mb-5 sm:px-0">
        <DateRibbon
          selected={selectedDate}
          onChange={(date) => { setSelectedDate(date); setPage(1); }}
        />
      </div>

      {/* Time-of-day chips (left) + City / Pier / Sort (right) — single row */}
      <div className="mb-5 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: time chips */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {TIME_OF_DAY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setTimeOfDay(opt.value); setPage(1); }}
              className={`flex-shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                timeOfDay === opt.value
                  ? opt.value === 'soon'
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-800 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Right: city + pier + sort */}
        <div className="flex gap-2 flex-shrink-0">
          <select
            value={city}
            onChange={(e) => { setCity(e.target.value); setPage(1); }}
            className="min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Все города</option>
            {cities.map((c: any) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>

          {city && piers.length > 0 && (
            <select
              value={pier}
              onChange={(e) => { setPier(e.target.value); setPage(1); }}
              className="min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Все причалы</option>
              {piers.map((p: any) => (
                <option key={p.id} value={p.id}>{p.shortTitle || p.title}</option>
              ))}
            </select>
          )}

          <select
            value={isSoonMode ? 'departing_soon' : sort}
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'departing_soon') {
                setTimeOfDay('soon');
                setSort('popular');
              } else {
                setSort(v);
                if (timeOfDay === 'soon') setTimeOfDay('');
              }
            }}
            className="min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
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
              subcategories={event.subcategories}
              audience={event.audience}
              tagSlugs={event.tagSlugs}
              imageUrl={event.imageUrl}
              priceFrom={event.priceFrom}
              rating={event.rating}
              reviewCount={event.reviewCount}
              durationMinutes={event.durationMinutes}
              city={event.city}
              totalAvailableTickets={event.totalAvailableTickets}
              departingSoonMinutes={event.departingSoonMinutes}
              nextSessionAt={event.nextSessionAt}
              isOptimalChoice={event.isOptimalChoice}
              dateMode={event.dateMode}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 sm:py-20 text-center">
          <p className="text-4xl">🔍</p>
          <h2 className="mt-4 text-lg font-semibold text-slate-700 sm:text-xl">Событий пока нет</h2>
          <p className="mt-2 text-sm text-slate-500">
            Попробуйте изменить фильтры или выбрать другую категорию
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
