'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, LayoutGrid, List as ListIcon } from 'lucide-react';
import { api } from '@/lib/api';
import type { CityListItem, EventListItem, CatalogItem } from '@daibilet/shared';
import type { MultiEventListItemDto } from '@/lib/api.types';
import { EventCard } from '@/components/ui/EventCard';
import { MultiEventCard } from '@/components/ui/MultiEventCard';
import { EventCardHorizontal } from '@/components/ui/EventCardHorizontal';
import { CatalogCard } from '@/components/ui/CatalogCard';
import { DateRibbon } from '@/components/ui/DateRibbon';
import { PromoBlock } from '@/components/ui/PromoBlock';
import {
  AUDIENCE_LABELS,
  CATEGORY_LABELS,
  EventAudience,
  EventCategory,
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

const PRICE_OPTIONS = [
  { value: '', label: 'Любая цена' },
  { value: '500', label: 'До 500 ₽' },
  { value: '1000', label: 'До 1 000 ₽' },
  { value: '2000', label: 'До 2 000 ₽' },
  { value: '5000', label: 'До 5 000 ₽' },
];

const LIMIT_OPTIONS = [20, 50, 100] as const;

type DisplayItem = { type: 'group'; item: MultiEventListItemDto } | { type: 'event'; event: EventListItem };

function buildDisplayItems(events: EventListItem[]): DisplayItem[] {
  const byKey = new Map<string, EventListItem[]>();
  const seenKeys = new Set<string>();
  const result: DisplayItem[] = [];
  for (const e of events) {
    const key = e.groupingKey?.trim();
    if (key && key.length > 0) {
      const list = byKey.get(key) ?? [];
      list.push(e);
      byKey.set(key, list);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      const group = byKey.get(key)!;
      if (group.length === 1) {
        result.push({ type: 'event', event: group[0]! });
      } else {
        const citiesMap = new Map<string, string>();
        for (const ev of group) {
          if (ev.city) citiesMap.set(ev.city.slug, ev.city.name);
        }
        const citiesArray = Array.from(citiesMap.entries()).map(([slug, name]) => ({ slug, name }));
        const previewCount = Math.min(3, citiesArray.length);
        const citiesPreview = citiesArray.slice(0, previewCount);
        const remainingCities = citiesArray.length - previewCount;
        const prices = group.map((ev) => ev.priceFrom).filter((p): p is number => p != null && p > 0);
        const minPrice = prices.length > 0 ? Math.min(...prices) : null;
        const ratings = group.map((ev) => ev.rating ?? 0).filter((r) => r > 0);
        const rating = ratings.length > 0 ? Math.max(...ratings) : null;
        const dates = group
          .map((ev) => ev.nextSessionAt)
          .filter((d): d is string => typeof d === 'string' && d.length > 0);
        const nextDate = dates.length > 0 ? dates.sort()[0]! : null;
        const first = group[0]!;
        result.push({
          type: 'group',
          item: {
            slug: key,
            groupingKey: key,
            title: first.title || '',
            coverUrl: first.imageUrl ?? null,
            totalEvents: group.length,
            totalCities: citiesArray.length,
            citiesPreview,
            remainingCities,
            minPrice,
            rating,
            nextDate,
          },
        });
      }
    } else {
      result.push({ type: 'event', event: e });
    }
  }
  return result;
}

function filtersFromParams(sp: URLSearchParams) {
  const sort = sp.get('sort') || 'popular';
  const isSoon = sort === 'departing_soon';
  const rawLimit = parseInt(sp.get('limit') || '20', 10);
  const limit = LIMIT_OPTIONS.includes(rawLimit as 20 | 50 | 100) ? rawLimit : 20;
  return {
    city: sp.get('city') || '',
    category: sp.get('category') || '',
    audience: sp.get('audience') || '',
    sort,
    timeOfDay: isSoon ? 'soon' : sp.get('timeOfDay') || '',
    tag: sp.get('tag') || '',
    date: sp.get('date') || null,
    pier: sp.get('pier') || '',
    priceMax: sp.get('priceMax') || '',
    page: Math.max(1, parseInt(sp.get('page') || '1', 10)),
    limit,
    qf: sp.get('qf') || '',
    q: sp.get('q') || '',
  };
}

export function EventsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [events, setEvents] = useState<EventListItem[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState<CityListItem[]>([]);
  const [piers, setPiers] = useState<{ id: string; slug?: string; title: string; shortTitle?: string | null }[]>([]);
  const [viewMode, setViewModeState] = useState<'grid' | 'list'>('grid');

  const setViewMode = useCallback((mode: 'grid' | 'list') => {
    setViewModeState(mode);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('catalog:viewMode', mode);
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('catalog:viewMode');
      if (stored === 'grid' || stored === 'list') setViewModeState(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [audience, setAudience] = useState('');
  const [sort, setSort] = useState('popular');
  const [timeOfDay, setTimeOfDay] = useState('');
  const [urlTag, setUrlTag] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [pier, setPier] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>('');

  useEffect(() => {
    const f = filtersFromParams(searchParams);
    setCity(f.city);
    setCategory(f.category);
    setAudience(f.audience);
    setSort(f.sort);
    setTimeOfDay(f.timeOfDay);
    setUrlTag(f.tag);
    setSelectedDate(f.date);
    setPier(f.pier);
    setPriceMax(f.priceMax);
    setPage(f.page);
    setLimit(f.limit);
    setActiveQuickFilter(f.qf);
  }, [searchParams]);

  const updateUrl = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === '' || v === undefined) params.delete(k);
        else params.set(k, String(v));
      }
      const q = params.toString();
      router.replace(`/events${q ? `?${q}` : ''}`);
    },
    [router, searchParams],
  );

  const vitrineKey = audience === 'KIDS' ? 'KIDS' : category || '';
  const quickFilters = useMemo<QuickFilter[]>(() => (vitrineKey ? QUICK_FILTERS[vitrineKey] || [] : []), [vitrineKey]);

  const visibleQuickFilters = useMemo<QuickFilter[]>(() => {
    if (!quickFilters.length) return quickFilters;
    if (vitrineKey !== EventCategory.EVENT) return quickFilters;
    return quickFilters.filter((qf) => {
      const params = qf.params || {};
      const { subcategory, tag, audience: aud, dateMode: dm } = params as Record<string, string | undefined>;
      return events.some((e) => {
        const subs = e.subcategories || [];
        if (subcategory && !subs.includes(subcategory as (typeof subs)[number])) return false;
        if (tag && !(e.tagSlugs || []).includes(tag)) return false;
        if (aud && e.audience !== aud) return false;
        if (dm && e.dateMode !== dm) return false;
        return true;
      });
    });
  }, [quickFilters, vitrineKey, events]);

  const quickFilterParams = useMemo(() => {
    if (!activeQuickFilter) return {};
    const qf = quickFilters.find((f) => f.id === activeQuickFilter);
    return qf ? qf.params : {};
  }, [activeQuickFilter, quickFilters]);

  const isSoonMode = timeOfDay === 'soon';

  useEffect(() => {
    api.getCities().then(setCities).catch((e) => console.warn('Events page error:', e));
  }, []);

  useEffect(() => {
    if (city) {
      api
        .getLocations(city, 'PIER')
        .then(setPiers)
        .catch((e) => {
          console.warn('Events page error:', e);
          setPiers([]);
        });
    } else {
      setPiers([]);
      setPier('');
    }
  }, [city]);

  const isMuseumCategory = category === 'MUSEUM';

  useEffect(() => {
    setLoading(true);
    const f = filtersFromParams(searchParams);
    const cityFromUrl = f.city;
    const sortFromUrl = f.sort === 'departing_soon' || f.timeOfDay === 'soon' ? 'departing_soon' : f.sort;
    const categoryFromUrl = f.category;
    const audienceFromUrl = f.audience;
    const urlTagFromUrl = f.tag;
    const selectedDateFromUrl = f.date;
    const timeOfDayFromUrl = f.timeOfDay === 'soon' ? '' : f.timeOfDay;
    const pageFromUrl = f.page;
    const limitFromUrl = f.limit;
    const isMuseumFromUrl = categoryFromUrl === 'MUSEUM';

    if (isMuseumFromUrl) {
      const params: Record<string, string | number> = {
        category: 'MUSEUM',
        page: pageFromUrl,
        sort: sortFromUrl,
        limit: limitFromUrl,
      };
      if (cityFromUrl) params.city = cityFromUrl;
      api
        .getCatalog(params)
        .then((res) => {
          setCatalogItems(res.items);
          setEvents([]);
          setTotal(res.total);
        })
        .catch((e) => {
          console.warn('Catalog error:', e);
          setCatalogItems([]);
          setEvents([]);
          setTotal(0);
        })
        .finally(() => setLoading(false));
      return;
    }

    const params: Record<string, string | number> = {
      page: pageFromUrl,
      sort: sortFromUrl,
      limit: limitFromUrl,
    };
    if (cityFromUrl) params.city = cityFromUrl;
    if (categoryFromUrl) params.category = categoryFromUrl;
    if (audienceFromUrl) params.audience = audienceFromUrl;
    if (urlTagFromUrl) params.tag = urlTagFromUrl;
    if (selectedDateFromUrl) {
      if (selectedDateFromUrl.includes('..')) {
        const [from, to] = selectedDateFromUrl.split('..');
        params.dateFrom = `${from}T00:00:00`;
        params.dateTo = `${to}T23:59:59`;
      } else {
        params.dateFrom = `${selectedDateFromUrl}T00:00:00`;
        params.dateTo = `${selectedDateFromUrl}T23:59:59`;
      }
    }
    if (timeOfDayFromUrl) params.timeOfDay = timeOfDayFromUrl;
    if (f.pier) params.pier = f.pier;
    if (f.priceMax) params.priceMax = parseInt(f.priceMax, 10) * 100;
    for (const [k, v] of Object.entries(quickFilterParams)) {
      params[k] = v;
    }

    api
      .getEvents(params)
      .then((res) => {
        setEvents(res.items);
        setCatalogItems([]);
        setTotal(res.total);
      })
      .catch((e) => {
        console.warn('Events page error:', e);
        setEvents([]);
        setCatalogItems([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [searchParams, quickFilterParams]);

  const activeFiltersCount = [
    city,
    category,
    selectedDate,
    audience,
    urlTag,
    timeOfDay,
    pier,
    priceMax,
    activeQuickFilter,
  ].filter(Boolean).length;

  const clearAllFilters = useCallback(
    () =>
      updateUrl({
        city: null,
        category: null,
        audience: null,
        sort: null,
        timeOfDay: null,
        tag: null,
        date: null,
        pier: null,
        priceMax: null,
        qf: null,
        page: 1,
      }),
    [updateUrl],
  );

  const handleCategorySelect = useCallback(
    (value: string) => updateUrl({ category: value || null, audience: null, qf: null, page: 1 }),
    [updateUrl],
  );

  const handleAudienceKids = useCallback(
    () => updateUrl({ audience: 'KIDS', category: null, qf: null, page: 1 }),
    [updateUrl],
  );

  const handleQuickFilter = useCallback(
    (filterId: string) => {
      const next = activeQuickFilter === filterId ? '' : filterId;
      updateUrl({ qf: next || null, page: 1 });
    },
    [activeQuickFilter, updateUrl],
  );

  const dropdownCities = useMemo(() => {
    if (!isSoonMode) return cities;
    const slugsWithSoon = new Set(events.filter((e) => e.city).map((e) => e.city!.slug));
    return cities.filter((c) => slugsWithSoon.has(c.slug));
  }, [isSoonMode, cities, events]);

  const displayItems: DisplayItem[] = useMemo(() => {
    if (!events.length) return [];
    return city ? events.map((e) => ({ type: 'event' as const, event: e })) : buildDisplayItems(events);
  }, [events, city]);

  return (
    <div className="container-page py-6 sm:py-10">
      <div className="mb-5 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Каталог событий</h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            {total > 0
              ? `${total} ${isMuseumCategory ? 'мест' : 'событий'}`
              : 'Экскурсии, музеи и мероприятия по городам России'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="whitespace-nowrap">Показывать по</span>
            <select
              value={limit}
              onChange={(e) => updateUrl({ limit: Number(e.target.value), page: 1 })}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          {!isMuseumCategory && (
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-slate-500 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center justify-center rounded-md px-2.5 py-1.5 sm:px-2.5 ${
                  viewMode === 'grid' ? 'bg-slate-900 text-white shadow-sm' : 'hover:bg-slate-50'
                }`}
                title="Сеткой"
                aria-label="Показать сеткой"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="sr-only">Сеткой</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center justify-center rounded-md px-2.5 py-1.5 sm:px-2.5 ${
                  viewMode === 'list' ? 'bg-slate-900 text-white shadow-sm' : 'hover:bg-slate-50'
                }`}
                title="С описанием"
                aria-label="Показать с описанием"
              >
                <ListIcon className="h-4 w-4" />
                <span className="sr-only">С описанием</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="-mx-4 mb-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => handleCategorySelect(cat.value)}
              className={`flex-shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                category === cat.value && !audience ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
          <button
            onClick={handleAudienceKids}
            className={`flex-shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              audience === 'KIDS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {AUDIENCE_LABELS[EventAudience.KIDS]}
          </button>
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

      {visibleQuickFilters.length > 0 && (
        <div className="-mx-4 mb-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => updateUrl({ qf: null, page: 1 })}
              className={`flex-shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                !activeQuickFilter
                  ? 'bg-primary-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:text-primary-700'
              }`}
            >
              Все
            </button>
            {visibleQuickFilters.map((qf) => (
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

      {!category && !audience && !selectedDate && !urlTag && !activeQuickFilter && (
        <div className="mb-5 sm:mb-6">
          <PromoBlock citySlug={city || undefined} />
        </div>
      )}

      <div className="-mx-4 mb-4 px-4 sm:mx-0 sm:mb-5 sm:px-0">
        <DateRibbon selected={selectedDate} onChange={(date) => updateUrl({ date: date || null, page: 1 })} />
      </div>

      <div className="mb-5 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {TIME_OF_DAY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                if (opt.value === 'soon') {
                  updateUrl({ sort: 'departing_soon', timeOfDay: null, page: 1 });
                } else {
                  updateUrl({
                    timeOfDay: opt.value || null,
                    sort: sort === 'departing_soon' ? 'popular' : sort,
                    page: 1,
                  });
                }
              }}
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
        <div className="flex gap-2 flex-shrink-0">
          <select
            value={city}
            onChange={(e) => updateUrl({ city: e.target.value || null, page: 1 })}
            className="min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Все города</option>
            {dropdownCities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          {city && piers.length > 0 && (
            <select
              value={pier}
              onChange={(e) => updateUrl({ pier: e.target.value || null, page: 1 })}
              className="min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Все причалы</option>
              {piers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.shortTitle || p.title}
                </option>
              ))}
            </select>
          )}
          {!isMuseumCategory && (
            <select
              value={priceMax}
              onChange={(e) => updateUrl({ priceMax: e.target.value || null, page: 1 })}
              className="min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {PRICE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
          <select
            value={isSoonMode ? 'departing_soon' : sort}
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'departing_soon') {
                updateUrl({ sort: 'departing_soon', timeOfDay: null, page: 1 });
              } else {
                updateUrl({ sort: v, timeOfDay: timeOfDay === 'soon' ? null : timeOfDay, page: 1 });
              }
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
      </div>

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
      ) : isMuseumCategory && catalogItems.length > 0 ? (
        <div className="grid gap-3 grid-cols-1 min-[361px]:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
          {catalogItems.map((item) => (
            <CatalogCard key={item.id} item={item} />
          ))}
        </div>
      ) : events.length > 0 ? (
        viewMode === 'list' ? (
          <div className="space-y-3 sm:space-y-4">
            {displayItems.map((d) =>
              d.type === 'group' ? (
                <MultiEventCard key={`g-${d.item.slug}`} item={d.item} />
              ) : (
                (() => {
                  const e = d.event;
                  const desc =
                    (e as typeof e & { description?: string | null; shortDescription?: string | null }).description ??
                    (e as typeof e & { shortDescription?: string | null }).shortDescription ??
                    null;
                  return (
                    <EventCardHorizontal
                      key={e.id}
                      slug={e.slug}
                      title={e.title}
                      category={e.category}
                      imageUrl={e.imageUrl ?? null}
                      priceFrom={e.priceFrom ?? null}
                      rating={e.rating}
                      reviewCount={e.reviewCount}
                      durationMinutes={e.durationMinutes ?? null}
                      city={e.city}
                      totalAvailableTickets={e.totalAvailableTickets ?? undefined}
                      departingSoonMinutes={e.departingSoonMinutes ?? undefined}
                      nextSessionAt={e.nextSessionAt ?? undefined}
                      isOptimalChoice={e.isOptimalChoice}
                      dateMode={e.dateMode ?? undefined}
                      priceOriginalKopecks={e.priceOriginalKopecks}
                      groupSize={e.groupSize ?? undefined}
                      sessionTimes={e.sessionTimes ?? []}
                      highlights={e.highlights ?? []}
                      description={desc}
                    />
                  );
                })()
              ),
            )}
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 min-[361px]:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
            {displayItems.map((d) =>
              d.type === 'group' ? (
                <MultiEventCard key={`g-${d.item.slug}`} item={d.item} />
              ) : (
                <EventCard
                  key={d.event.id}
                  slug={d.event.slug}
                  title={d.event.title}
                  category={d.event.category}
                  subcategories={d.event.subcategories}
                  audience={d.event.audience}
                  tagSlugs={d.event.tagSlugs}
                  imageUrl={d.event.imageUrl}
                  priceFrom={d.event.priceFrom ?? null}
                  rating={d.event.rating}
                  reviewCount={d.event.reviewCount}
                  durationMinutes={d.event.durationMinutes ?? null}
                  city={d.event.city}
                  address={d.event.address as string | null | undefined}
                  totalAvailableTickets={d.event.totalAvailableTickets}
                  departingSoonMinutes={d.event.departingSoonMinutes}
                  nextSessionAt={d.event.nextSessionAt}
                  isOptimalChoice={d.event.isOptimalChoice}
                  dateMode={d.event.dateMode ?? undefined}
                />
              ),
            )}
          </div>
        )
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 sm:py-20 text-center">
          <p className="text-4xl">🔍</p>
          <h2 className="mt-4 text-lg font-semibold text-slate-700 sm:text-xl">Событий пока нет</h2>
          <p className="mt-2 text-sm text-slate-500">Попробуйте изменить фильтры или выбрать другую категорию</p>
        </div>
      )}

      {total > limit && (
        <div className="mt-8 sm:mt-10 flex items-center justify-center gap-2">
          <button
            onClick={() => updateUrl({ page: Math.max(1, page - 1) })}
            disabled={page === 1}
            className="btn-secondary px-4 py-2.5 text-sm disabled:opacity-40"
          >
            Назад
          </button>
          <span className="px-3 text-sm text-slate-500">
            {page} / {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => updateUrl({ page: page + 1 })}
            disabled={page >= Math.ceil(total / limit)}
            className="btn-secondary px-4 py-2.5 text-sm disabled:opacity-40"
          >
            Далее
          </button>
        </div>
      )}
    </div>
  );
}
