'use client';

import {
  AUDIENCE_LABELS,
  CATEGORY_LABELS,
  EventAudience,
  EventCategory,
  formatPrice,
  QUICK_FILTERS,
  type QuickFilter,
} from '@daibilet/shared';
import { LayoutGrid, List as ListIcon, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';

import { CatalogCard } from '@/components/ui/CatalogCard';
import { DateRibbon } from '@/components/ui/DateRibbon';
import { EventCard } from '@/components/ui/EventCard';
import { EventCardHorizontal } from '@/components/ui/EventCardHorizontal';
import { PromoBlock } from '@/components/ui/PromoBlock';
import { api } from '@/lib/api';

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

/** Собрать объект фильтров из URL */
const PRICE_OPTIONS = [
  { value: '', label: 'Любая цена' },
  { value: '500', label: 'До 500 ₽' },
  { value: '1000', label: 'До 1 000 ₽' },
  { value: '2000', label: 'До 2 000 ₽' },
  { value: '5000', label: 'До 5 000 ₽' },
];

const LIMIT_OPTIONS = [20, 50, 100] as const;

/** Регионы, заголовки которых временно скрываем */
const HIDDEN_REGION_HEADERS = ['Золотое кольцо'];

/** Хаб-города регионов: не показывать заголовок области над ними */
const REGION_HUB_CITIES: Record<string, string> = {
  'Ленинградская область': 'Санкт-Петербург',
  'Московская область': 'Москва',
  Татарстан: 'Казань',
  'Свердловская область': 'Екатеринбург',
  'Кемеровская область': 'Кемерово',
  'Нижегородская область': 'Нижний Новгород',
};

/** Список музеев: город — отдельно; областные музеи — под заголовком области */
function MuseumsListByCity({ items }: { items: any[] }) {
  // Группируем: регион → город → [items]
  const byRegion = new Map<string | null, Map<string, { cityName: string; items: any[] }>>();
  for (const item of items) {
    const rn = item.regionName || null;
    const cSlug = item.citySlug || item.cityId || 'other';
    const cName = item.cityName || 'Другие';
    if (!byRegion.has(rn)) byRegion.set(rn, new Map());
    const byCity = byRegion.get(rn)!;
    if (!byCity.has(cSlug)) byCity.set(cSlug, { cityName: cName, items: [] });
    byCity.get(cSlug)!.items.push(item);
  }

  // Сортировка: регионы по сумме мест, города по кол-ву
  const regionEntries = Array.from(byRegion.entries()).map(([regionName, cities]) => {
    const cityEntries = Array.from(cities.entries())
      .map(([slug, { cityName, items: its }]) => ({ slug, cityName, items: its, count: its.length }))
      .sort((a, b) => b.count - a.count);
    const total = cityEntries.reduce((s, c) => s + c.count, 0);
    return { regionName, cityEntries, total };
  });
  regionEntries.sort((a, b) => b.total - a.total);

  // Блоки: город-хаб — без заголовка области; областные города — под заголовком области
  const blocks: { regionName: string | null; cityName: string; items: any[] }[] = [];
  for (const { regionName, cityEntries } of regionEntries) {
    for (const { cityName, items: its } of cityEntries) {
      const isHubCity = regionName && REGION_HUB_CITIES[regionName] === cityName;
      const hideRegion = regionName && HIDDEN_REGION_HEADERS.includes(regionName);
      blocks.push({
        regionName: isHubCity || hideRegion ? null : regionName,
        cityName,
        items: its,
      });
    }
  }

  let lastRegion: string | null = null;
  return (
    <div className="space-y-6 sm:space-y-8">
      {blocks.map((block, idx) => {
        const showRegion = block.regionName && block.regionName !== lastRegion;
        if (showRegion) lastRegion = block.regionName;
        return (
          <div key={`${block.regionName}-${block.cityName}-${idx}`}>
            {showRegion && <h3 className="mb-2 text-sm font-semibold text-slate-500">{block.regionName}</h3>}
            <h2 className="mb-3 text-lg font-semibold text-slate-800 sm:text-xl">{block.cityName}</h2>
            <div className="grid grid-cols-1 gap-y-3 min-[800px]:grid-cols-2 min-[800px]:gap-x-6 min-[800px]:gap-y-2">
              {block.items.map((item: any) => {
                const href = item.type === 'venue' ? `/venues/${item.slug}` : `/events/${item.slug}`;
                const addr = item.location?.address || item.address || '';
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 min-h-[3rem]"
                  >
                    <div className="min-w-0 flex-1">
                      <Link href={href} className="font-medium text-slate-900 hover:text-primary-600">
                        {item.title}
                      </Link>
                      {addr && <p className="mt-0.5 text-xs text-slate-500">{addr}</p>}
                    </div>
                    {item.priceFrom != null && item.priceFrom > 0 ? (
                      <Link
                        href={href}
                        className="shrink-0 self-center rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
                      >
                        от {formatPrice(item.priceFrom)}
                      </Link>
                    ) : (
                      <span className="shrink-0 self-center text-sm text-slate-500">Цена уточняется</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function filtersFromParams(sp: URLSearchParams) {
  const sort = sp.get('sort') || 'popular';
  const isSoon = sort === 'departing_soon';
  const rawLimit = parseInt(sp.get('limit') || '20', 10);
  const limit = LIMIT_OPTIONS.includes(rawLimit as 20 | 50 | 100) ? rawLimit : 20;
  const vm = sp.get('vm') || 'grid';
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
    vm: vm === 'list' ? 'list' : 'grid',
  };
}

function EventsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [events, setEvents] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState<any[]>([]);
  const [piers, setPiers] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Фильтры — единый источник: URL
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
  const [museumViewMode, setMuseumViewMode] = useState<'grid' | 'list'>('grid');

  // Синхронизация URL → состояние (при загрузке и навигации)
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
    setMuseumViewMode(f.vm as 'grid' | 'list');
  }, [searchParams]);

  /** Обновить URL, сохраняя остальные фильтры */
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

  // Определяем витрину: конкретная категория, «Детям», или «Все»
  const vitrineKey = audience === 'KIDS' ? 'KIDS' : category || '';

  // Текущие быстрые фильтры для витрины
  const quickFilters = useMemo<QuickFilter[]>(() => (vitrineKey ? QUICK_FILTERS[vitrineKey] || [] : []), [vitrineKey]);

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
    api
      .getCities()
      .then(setCities)
      .catch((e) => {
        console.error('Events page error:', e);
      });
  }, []);

  useEffect(() => {
    if (city) {
      api
        .getLocations(city, 'PIER')
        .then(setPiers)
        .catch((e) => {
          console.error('Events page error:', e);
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

    // Берём фильтры из URL (не из state), чтобы при переходе с главной city/sort уже были в первом запросе
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
    const vmFromUrl = f.vm;
    const isMuseumFromUrl = categoryFromUrl === 'MUSEUM';

    if (isMuseumFromUrl) {
      // Музеи → единый каталог. В режиме «Списком» — region для областных музеев (СПб + Выборг, Пушкин и др.)
      const effectiveLimit = vmFromUrl === 'list' ? 200 : limitFromUrl;
      const params: Record<string, string | number> = {
        category: 'MUSEUM',
        page: vmFromUrl === 'list' ? 1 : pageFromUrl,
        sort: sortFromUrl,
        limit: effectiveLimit,
      };
      if (vmFromUrl === 'list') {
        // region — города региона (хаб + областные). Пустой город — все музеи всех городов
        const citySlug = cityFromUrl || '';
        const regionByCity: Record<string, string> = {
          'saint-petersburg': 'leningradskaya-oblast',
          moscow: 'moskovskaya-oblast',
          kazan: 'tatarstan',
          yaroslavl: 'zolotoe-koltso',
          ekaterinburg: 'sverdlovskaya-oblast',
          kemerovo: 'kemerovskaya-oblast',
          'nizhny-novgorod': 'nizhegorodskaya-oblast',
        };
        const regionSlug = citySlug ? regionByCity[citySlug] : undefined;
        if (regionSlug) params.region = regionSlug;
        else if (citySlug) params.city = citySlug;
        // иначе city/region не передаём — все города
      } else if (cityFromUrl) {
        params.city = cityFromUrl;
      }
      api
        .getCatalog(params)
        .then((res) => {
          setCatalogItems(res.items);
          setEvents([]);
          setTotal(res.total);
        })
        .catch((e) => {
          console.error('Catalog error:', e);
          setCatalogItems([]);
          setEvents([]);
          setTotal(0);
        })
        .finally(() => setLoading(false));
      return;
    }

    // Экскурсии / Мероприятия / Все → Events
    const params: Record<string, string | number> = { page: pageFromUrl, sort: sortFromUrl, limit: limitFromUrl };
    if (cityFromUrl) params.city = cityFromUrl;
    if (categoryFromUrl) params.category = categoryFromUrl;
    if (audienceFromUrl) params.audience = audienceFromUrl;
    if (urlTagFromUrl) params.tag = urlTagFromUrl;

    // Лента дат
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
    if (f.priceMax) params.priceMax = parseInt(f.priceMax, 10) * 100; // рубли → копейки

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
        console.error('Events page error:', e);
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

  const clearAllFilters = useCallback(() => {
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
    });
  }, [updateUrl]);

  const handleCategorySelect = useCallback(
    (value: string) => {
      updateUrl({ category: value || null, audience: null, qf: null, page: 1 });
    },
    [updateUrl],
  );

  const handleAudienceKids = useCallback(() => {
    updateUrl({ audience: 'KIDS', category: null, qf: null, page: 1 });
  }, [updateUrl]);

  const handleQuickFilter = useCallback(
    (filterId: string) => {
      const next = activeQuickFilter === filterId ? '' : filterId;
      updateUrl({ qf: next || null, page: 1 });
    },
    [activeQuickFilter, updateUrl],
  );

  // Города для дропдауна: в режиме "Начнутся скоро" — только города с событиями в текущей выдаче
  const dropdownCities = useMemo(() => {
    if (!isSoonMode) return cities;
    const slugsWithSoon = new Set(events.filter((e: any) => e.city).map((e: any) => e.city.slug));
    return cities.filter((c: any) => slugsWithSoon.has(c.slug));
  }, [isSoonMode, cities, events]);

  return (
    <div className="container-page py-6 sm:py-10">
      {/* Header */}
      <div className="mb-5 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Каталог событий</h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            {total > 0
              ? `${total} ${isMuseumCategory ? 'мест' : 'событий'}`
              : 'Экскурсии, музеи и мероприятия по городам России'}
          </p>
        </div>
        {/* Limit selector + View mode toggle */}
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
          {isMuseumCategory ? (
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-slate-500 shadow-sm">
              <button
                type="button"
                onClick={() => updateUrl({ vm: 'grid', page: 1 })}
                className={`inline-flex items-center justify-center rounded-md px-2.5 py-1.5 ${
                  museumViewMode === 'grid' ? 'bg-slate-900 text-white shadow-sm' : 'hover:bg-slate-50'
                }`}
                title="Карточками"
                aria-label="Показать карточками"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => updateUrl({ vm: 'list', page: 1 })}
                className={`inline-flex items-center justify-center rounded-md px-2.5 py-1.5 ${
                  museumViewMode === 'list' ? 'bg-slate-900 text-white shadow-sm' : 'hover:bg-slate-50'
                }`}
                title="Списком"
                aria-label="Списком с разбивкой по городам"
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-slate-500 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center justify-center rounded-md px-2.5 py-1.5 ${
                  viewMode === 'grid' ? 'bg-slate-900 text-white shadow-sm' : 'hover:bg-slate-50'
                }`}
                title="Карточками"
                aria-label="Показать карточками"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center justify-center rounded-md px-2.5 py-1.5 ${
                  viewMode === 'list' ? 'bg-slate-900 text-white shadow-sm' : 'hover:bg-slate-50'
                }`}
                title="Списком"
                aria-label="Показать списком"
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
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
              audience === 'KIDS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
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
              onClick={() => updateUrl({ qf: null, page: 1 })}
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
        <DateRibbon selected={selectedDate} onChange={(date) => updateUrl({ date: date || null, page: 1 })} />
      </div>

      {/* Time-of-day chips (left) + City / Pier / Sort (right) — single row */}
      <div className="mb-5 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: time chips */}
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

        {/* Right: city + pier + sort */}
        <div className="flex gap-2 flex-shrink-0">
          <select
            value={city}
            onChange={(e) => updateUrl({ city: e.target.value || null, page: 1 })}
            className="min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Все города</option>
            {dropdownCities.map((c: any) => (
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
              {piers.map((p: any) => (
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

      {/* Events grid / list */}
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
      ) : isMuseumCategory && catalogItems.length > 0 ? (
        museumViewMode === 'list' ? (
          <MuseumsListByCity items={catalogItems} />
        ) : (
          <div className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {catalogItems.map((item: any) => (
              <CatalogCard key={item.id} item={item} />
            ))}
          </div>
        )
      ) : events.length > 0 ? (
        viewMode === 'grid' ? (
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
                priceOriginalKopecks={event.priceOriginalKopecks}
                rating={event.rating}
                reviewCount={event.reviewCount}
                durationMinutes={event.durationMinutes}
                city={event.city}
                totalAvailableTickets={event.totalAvailableTickets}
                departingSoonMinutes={event.departingSoonMinutes}
                nextSessionAt={event.nextSessionAt}
                isOptimalChoice={event.isOptimalChoice}
                dateMode={event.dateMode}
                groupSize={event.groupSize ?? event.templateData?.groupSize}
                sessionTimes={event.sessionTimes ?? []}
                highlights={event.highlights ?? []}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {events.map((event: any) => (
              <EventCardHorizontal
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
                totalAvailableTickets={event.totalAvailableTickets}
                departingSoonMinutes={event.departingSoonMinutes}
                nextSessionAt={event.nextSessionAt}
                isOptimalChoice={event.isOptimalChoice}
                dateMode={event.dateMode}
                priceOriginalKopecks={event.priceOriginalKopecks}
                groupSize={event.groupSize ?? event.templateData?.groupSize}
                sessionTimes={event.sessionTimes ?? []}
                highlights={event.highlights ?? []}
                description={event.description ?? event.shortDescription}
              />
            ))}
          </div>
        )
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 sm:py-20 text-center">
          <p className="text-4xl">🔍</p>
          <h2 className="mt-4 text-lg font-semibold text-slate-700 sm:text-xl">Событий пока нет</h2>
          <p className="mt-2 text-sm text-slate-500">Попробуйте изменить фильтры или выбрать другую категорию</p>
        </div>
      )}

      {/* Pagination — скрыта в режиме «Списком» для музеев */}
      {total > limit && !(isMuseumCategory && museumViewMode === 'list') && (
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

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center"><LayoutGrid className="h-8 w-8 animate-pulse text-slate-400" /></div>}>
      <EventsPageContent />
    </Suspense>
  );
}
