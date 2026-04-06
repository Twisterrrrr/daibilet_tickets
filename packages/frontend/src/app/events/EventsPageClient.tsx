'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, LayoutGrid, List as ListIcon, SlidersHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import { parseCatalogEventsParams } from '@/lib/catalog-events-url';
import type { CityListItem, EventListItem, CatalogItem } from '@daibilet/shared';
import type { MultiEventListItemDto } from '@/lib/api.types';
import { EventCard } from '@/components/ui/EventCard';
import { MultiEventCard } from '@/components/ui/MultiEventCard';
import { EventCardHorizontal } from '@/components/ui/EventCardHorizontal';
import { CatalogCard } from '@/components/ui/CatalogCard';
import { PromoBlock } from '@/components/ui/PromoBlock';
import { ClusterHubLinks } from '@/components/landing/ClusterHubLinks';
import { CatalogAdvancedFilters } from './_components/CatalogAdvancedFilters';
import { CatalogChip } from './_components/CatalogChip';
import { QuickDateFilters } from './_components/QuickDateFilters';
import {
  AUDIENCE_LABELS,
  CATEGORY_LABELS,
  EventAudience,
  EventCategory,
  getCityTimezone,
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

const PRICE_OPTIONS = [
  { value: '', label: 'Любая цена' },
  { value: '500', label: 'До 500 ₽' },
  { value: '1000', label: 'До 1 000 ₽' },
  { value: '1500', label: 'До 1 500 ₽' },
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

function parseCsvSlugs(value: string) {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatActiveSummary(parts: string[]): string {
  if (parts.length <= 3) return parts.join(' · ');
  return `${parts.slice(0, 3).join(' · ')} · +${parts.length - 3}`;
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
  const [structuralTagsFromUrl, setStructuralTagsFromUrl] = useState<string[]>([]);
  const [themeTagSlug, setThemeTagSlug] = useState('');
  const [audienceTagSlug, setAudienceTagSlug] = useState('');
  const [formatTagSlug, setFormatTagSlug] = useState('');
  const [popularTagSlugs, setPopularTagSlugs] = useState<string[]>([]);
  const [popularAddSlug, setPopularAddSlug] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [pier, setPier] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>('');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  type StructuralTagGroup = 'THEME' | 'AUDIENCE' | 'FORMAT';
  type TagKind = 'STRUCTURAL' | 'POPULAR';
  type CatalogTagOption = {
    id: string;
    slug: string;
    name: string;
    tagKind?: TagKind | null;
    structuralGroup?: StructuralTagGroup | null;
    sortOrder?: number | null;
  };

  const [structuralTagOptions, setStructuralTagOptions] = useState<Record<StructuralTagGroup, CatalogTagOption[]>>({
    THEME: [],
    AUDIENCE: [],
    FORMAT: [],
  });
  const [popularTagOptions, setPopularTagOptions] = useState<CatalogTagOption[]>([]);
  const [tagOptionsLoaded, setTagOptionsLoaded] = useState(false);

  useEffect(() => {
    const f = parseCatalogEventsParams(searchParams);
    setCity(f.city);
    setCategory(f.category);
    setAudience(f.audience);
    setSort(f.sort);
    setTimeOfDay(f.timeOfDay);
    setUrlTag(f.tag);
    setStructuralTagsFromUrl(parseCsvSlugs(f.structuralTags));
    setPopularTagSlugs(parseCsvSlugs(f.popularTags));
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

  // Загружаем справочник tags для UI-фильтров STRUCTURAL/POPULAR.
  useEffect(() => {
    let cancelled = false;

    async function loadTags() {
      try {
        const [theme, audience, format, popular] = await Promise.all([
          api.getCatalogTags({ kind: 'STRUCTURAL', group: 'THEME', activeOnly: true }),
          api.getCatalogTags({ kind: 'STRUCTURAL', group: 'AUDIENCE', activeOnly: true }),
          api.getCatalogTags({ kind: 'STRUCTURAL', group: 'FORMAT', activeOnly: true }),
          api.getCatalogTags({ kind: 'POPULAR', activeOnly: true }),
        ]);

        if (cancelled) return;
        setStructuralTagOptions({ THEME: theme, AUDIENCE: audience, FORMAT: format });
        setPopularTagOptions(popular);
      } catch (e) {
        console.warn('Events page tags load error:', e);
      } finally {
        if (!cancelled) setTagOptionsLoaded(true);
      }
    }

    loadTags();
    return () => {
      cancelled = true;
    };
  }, []);

  // Преобразуем structuralTags из URL в UI-селекты (по структурным группам).
  useEffect(() => {
    if (!tagOptionsLoaded) return;

    const slugToGroup = new Map<string, StructuralTagGroup>();
    for (const group of Object.keys(structuralTagOptions) as StructuralTagGroup[]) {
      for (const t of structuralTagOptions[group] ?? []) {
        slugToGroup.set(t.slug, group);
      }
    }

    let theme = '';
    let aud = '';
    let fmt = '';
    for (const slug of structuralTagsFromUrl) {
      const g = slugToGroup.get(slug);
      if (g === 'THEME') theme = slug;
      if (g === 'AUDIENCE') aud = slug;
      if (g === 'FORMAT') fmt = slug;
    }

    setThemeTagSlug(theme);
    setAudienceTagSlug(aud);
    setFormatTagSlug(fmt);
  }, [structuralTagsFromUrl, structuralTagOptions, tagOptionsLoaded]);

  const isMuseumCategory = category === 'MUSEUM';

  useEffect(() => {
    setLoading(true);
    const f = parseCatalogEventsParams(searchParams);
    const cityFromUrl = f.city;
    const sortFromUrl = f.sort === 'departing_soon' || f.timeOfDay === 'soon' ? 'departing_soon' : f.sort;
    const categoryFromUrl = f.category;
    const audienceFromUrl = f.audience;
    const urlTagFromUrl = f.tag;
    const structuralTagsFromUrlSlugs = parseCsvSlugs(f.structuralTags);
    const popularTagsFromUrlSlugs = parseCsvSlugs(f.popularTags);
    const selectedDateFromUrl = f.date;
    const timeOfDayFromUrl = f.timeOfDay === 'soon' ? '' : f.timeOfDay;
    const pageFromUrl = f.page;
    const limitFromUrl = f.limit;
    const isMuseumFromUrl = categoryFromUrl === 'MUSEUM';
    const venueIdFromUrl = f.venueId?.trim() || '';
    const subcategoryFromUrl = f.subcategory?.trim() || '';
    const useMuseumCatalogApi = isMuseumFromUrl && !venueIdFromUrl && !subcategoryFromUrl;

    if (useMuseumCatalogApi) {
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
    if (structuralTagsFromUrlSlugs.length) params.structuralTags = structuralTagsFromUrlSlugs.join(',');
    if (popularTagsFromUrlSlugs.length) params.popularTags = popularTagsFromUrlSlugs.join(',');
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
    if (venueIdFromUrl) params.venueId = venueIdFromUrl;
    if (subcategoryFromUrl) params.subcategory = subcategoryFromUrl;
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
    themeTagSlug,
    audienceTagSlug,
    formatTagSlug,
    popularTagSlugs.length ? 'popularTags' : null,
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
        structuralTags: null,
        popularTags: null,
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

  const showClusterHubs =
    !isMuseumCategory &&
    !audience &&
    !urlTag &&
    !activeQuickFilter;

  const scenarioPopularActive =
    sort === 'popular' &&
    !selectedDate &&
    !timeOfDay &&
    !priceMax &&
    !urlTag &&
    !activeQuickFilter &&
    !themeTagSlug &&
    !audienceTagSlug &&
    !formatTagSlug &&
    (popularTagSlugs?.length ?? 0) === 0;

  const activeSummaryParts = useMemo(() => {
    const out: string[] = [];
    const cityLabel = cities.find((c) => c.slug === city)?.name;
    if (cityLabel) out.push(cityLabel);
    if (selectedDate) {
      if (selectedDate === null) {
        // noop
      } else if (selectedDate.includes('..')) {
        out.push('Выходные');
      } else {
        out.push(selectedDate);
      }
    }
    if (priceMax) out.push(`до ${priceMax} ₽`);
    if (timeOfDay) {
      const label =
        timeOfDay === 'soon'
          ? 'Скоро'
          : timeOfDay === 'morning'
            ? 'Утро'
            : timeOfDay === 'day'
              ? 'День'
              : timeOfDay === 'evening'
                ? 'Вечер'
                : timeOfDay === 'night'
                  ? 'Ночь'
                  : '';
      if (label) out.push(label);
    }
    if (audience === 'KIDS') out.push('С детьми');
    if (urlTag) {
      out.push(urlTag === 'water' ? 'С воды' : urlTag);
    }
    if (themeTagSlug) {
      const name = structuralTagOptions.THEME.find((t) => t.slug === themeTagSlug)?.name ?? themeTagSlug;
      out.push(name);
    }
    if (audienceTagSlug) {
      const name = structuralTagOptions.AUDIENCE.find((t) => t.slug === audienceTagSlug)?.name ?? audienceTagSlug;
      out.push(name);
    }
    if (formatTagSlug) {
      const name = structuralTagOptions.FORMAT.find((t) => t.slug === formatTagSlug)?.name ?? formatTagSlug;
      out.push(name);
    }
    if (popularTagSlugs.length) {
      out.push(...popularTagSlugs.slice(0, 2).map((slug) => popularTagOptions.find((t) => t.slug === slug)?.name ?? slug));
      if (popularTagSlugs.length > 2) out.push(`popular +${popularTagSlugs.length - 2}`);
    }
    if (pier) out.push('Причал');
    if (activeQuickFilter) out.push('Сценарий');
    return out;
  }, [
    cities,
    city,
    selectedDate,
    priceMax,
    timeOfDay,
    audience,
    urlTag,
    themeTagSlug,
    audienceTagSlug,
    formatTagSlug,
    popularTagSlugs,
    popularTagOptions,
    pier,
    activeQuickFilter,
    structuralTagOptions,
  ]);

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
          {showClusterHubs && <ClusterHubLinks citySlug={city || undefined} variant="inline" />}
        </div>
        <div className="hidden sm:flex flex-wrap items-center gap-2 self-start">
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

      {/* Новый блок фильтров (как в лендингах): быстрые даты + сценарные чипы + "Все фильтры" */}
      <div className="mb-4 sm:mb-5 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">Дата</div>
            <div className="mt-2">
              <QuickDateFilters
                selectedDate={selectedDate}
                ianaTimeZone={getCityTimezone(city || null)}
                onChange={(date) => updateUrl({ date: date || null, page: 1 })}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 sm:w-full sm:text-right">
              Сортировка
            </div>
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
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">Быстрые фильтры</div>
            {activeFiltersCount > 0 ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-[12px] font-semibold text-slate-500 hover:text-slate-700"
              >
                Сбросить
              </button>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <select
                value={city}
                onChange={(e) => updateUrl({ city: e.target.value || null, page: 1 })}
                className="min-w-[12rem] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              >
                <option value="">Все города</option>
                {dropdownCities.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>

              {!isMuseumCategory && (
                <select
                  value={priceMax}
                  onChange={(e) => updateUrl({ priceMax: e.target.value || null, page: 1 })}
                  className="min-w-[10rem] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                >
                  {PRICE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {!isMuseumCategory ? (
              <>
                <CatalogChip
                  label="🔥 Популярное"
                  active={scenarioPopularActive}
                  onClick={() => {
                    if (scenarioPopularActive) {
                      updateUrl({ sort: 'popular', page: 1 });
                    } else {
                      updateUrl({
                        sort: 'popular',
                        date: null,
                        timeOfDay: null,
                        priceMax: null,
                        tag: null,
                        qf: null,
                        structuralTags: null,
                        popularTags: null,
                        page: 1,
                      });
                    }
                  }}
                />
                <CatalogChip
                  label="Скоро"
                  active={sort === 'departing_soon' || timeOfDay === 'soon'}
                  onClick={() =>
                    updateUrl({ sort: 'departing_soon', timeOfDay: null, page: 1 })
                  }
                />
                <CatalogChip
                  label="Вечер"
                  active={timeOfDay === 'evening'}
                  onClick={() =>
                    updateUrl({
                      timeOfDay: timeOfDay === 'evening' ? null : 'evening',
                      sort: sort === 'departing_soon' ? 'popular' : sort,
                      page: 1,
                    })
                  }
                />
                <CatalogChip
                  label="С детьми"
                  active={audience === 'KIDS'}
                  onClick={() =>
                    updateUrl({ audience: audience === 'KIDS' ? null : 'KIDS', category: null, qf: null, page: 1 })
                  }
                />
                <CatalogChip
                  label="С воды"
                  active={urlTag === 'water'}
                  onClick={() => updateUrl({ tag: urlTag === 'water' ? null : 'water', page: 1 })}
                />
              </>
            ) : null}

            <button
              type="button"
              onClick={() => setAdvancedOpen(true)}
              className="inline-flex min-h-[2.25rem] items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Все фильтры
              {activeFiltersCount > 0 ? (
                <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-bold text-primary-700">
                  {activeFiltersCount}
                </span>
              ) : null}
            </button>
          </div>

          {activeSummaryParts.length > 0 ? (
            <div className="mt-3 rounded-xl bg-slate-100/80 px-3 py-2 text-[13px] text-slate-600">
              <span className="font-semibold text-slate-700">Активно:</span> {formatActiveSummary(activeSummaryParts)}
            </div>
          ) : null}
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

      <CatalogAdvancedFilters
        open={advancedOpen}
        onClose={() => setAdvancedOpen(false)}
        activeCount={activeFiltersCount}
        cities={cities}
        city={city}
        onCity={(slug) => updateUrl({ city: slug || null, page: 1 })}
        priceMax={priceMax}
        onPriceMax={(v) => updateUrl({ priceMax: v || null, page: 1 })}
        timeOfDay={timeOfDay === 'soon' ? '' : timeOfDay}
        onTimeOfDay={(v) =>
          updateUrl({
            timeOfDay: v || null,
            sort: sort === 'departing_soon' ? 'popular' : sort,
            page: 1,
          })
        }
        pier={pier}
        onPier={(v) => updateUrl({ pier: v || null, page: 1 })}
        piers={city ? piers.map((p) => ({ id: p.id, title: p.title, shortTitle: p.shortTitle })) : []}
        themeTagSlug={themeTagSlug}
        onTheme={(next) => {
          setThemeTagSlug(next);
          const csv = [next, audienceTagSlug, formatTagSlug].filter(Boolean).join(',');
          updateUrl({ structuralTags: csv || null, page: 1 });
        }}
        audienceTagSlug={audienceTagSlug}
        onAudienceTag={(next) => {
          setAudienceTagSlug(next);
          const csv = [themeTagSlug, next, formatTagSlug].filter(Boolean).join(',');
          updateUrl({ structuralTags: csv || null, page: 1 });
        }}
        formatTagSlug={formatTagSlug}
        onFormat={(next) => {
          setFormatTagSlug(next);
          const csv = [themeTagSlug, audienceTagSlug, next].filter(Boolean).join(',');
          updateUrl({ structuralTags: csv || null, page: 1 });
        }}
        structuralTagOptions={structuralTagOptions}
        popularTagOptions={popularTagOptions}
        popularTagSlugs={popularTagSlugs}
        popularAddSlug={popularAddSlug}
        onPopularAdd={(next) => {
          if (!next) {
            setPopularAddSlug('');
            return;
          }
          const combined = Array.from(new Set([...popularTagSlugs, next]));
          setPopularTagSlugs(combined);
          setPopularAddSlug('');
          updateUrl({ popularTags: combined.length ? combined.join(',') : null, page: 1 });
        }}
        onPopularRemove={(slug) => {
          const next = popularTagSlugs.filter((x) => x !== slug);
          setPopularTagSlugs(next);
          updateUrl({ popularTags: next.length ? next.join(',') : null, page: 1 });
        }}
        sort={isSoonMode ? 'departing_soon' : sort}
        onSort={(v) => {
          if (v === 'departing_soon') updateUrl({ sort: 'departing_soon', timeOfDay: null, page: 1 });
          else updateUrl({ sort: v, timeOfDay: timeOfDay === 'soon' ? null : timeOfDay, page: 1 });
        }}
        sortOptions={sortOptions}
        clearAll={clearAllFilters}
      />

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
                      structuralTags={e.structuralTags}
                      popularTags={e.popularTags}
                      description={desc}
                    />
                  );
                })()
              ),
            )}
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 min-[361px]:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
            {displayItems.flatMap((d, idx) => {
              const items: React.ReactNode[] = [];
              if (d.type === 'event' && idx === 5) {
                const hasPopularAhead = displayItems.slice(5, 11).some(
                  (x) => x.type === 'event' && ((x.event.isOptimalChoice) || (x.event.reviewCount ?? 0) >= 100),
                );
                if (hasPopularAhead) {
                  items.push(
                    <div key={`break-${idx}`} className="col-span-full pt-2 pb-1 text-center md:hidden">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Популярное</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">Чаще всего выбирают</p>
                    </div>,
                  );
                }
              }
              items.push(
                d.type === 'group' ? (
                  <MultiEventCard key={`g-${d.item.slug}`} item={d.item} />
                ) : (
                <EventCard
                  key={d.event!.id}
                  slug={d.event.slug}
                  title={d.event.title}
                  shortDescription={(d.event as { shortDescription?: string | null }).shortDescription ?? null}
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
                  priceOriginalKopecks={d.event.priceOriginalKopecks}
                  groupSize={d.event.groupSize ?? undefined}
                  sessionTimes={d.event.sessionTimes ?? []}
                  highlights={d.event.highlights ?? []}
                  structuralTags={d.event.structuralTags}
                  popularTags={d.event.popularTags}
                />
              ));
              return items;
            })}
          </div>
        )
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 sm:py-20 text-center">
          <p className="text-4xl">🔍</p>
          <h2 className="mt-4 text-lg font-semibold text-slate-700 sm:text-xl">Ничего не нашли</h2>
          <p className="mt-2 text-sm text-slate-500">
            Попробуйте изменить фильтры или выбрать другую категорию
          </p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="btn-primary mt-6 inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold"
          >
            Сбросить фильтры
          </button>
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
