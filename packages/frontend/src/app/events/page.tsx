'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, LayoutGrid, List as ListIcon } from 'lucide-react';
import { api } from '@/lib/api';
import type { CityListItem, EventListItem, CatalogItem } from '@daibilet/shared';
import { EventCard } from '@/components/ui/EventCard';
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

/** Собрать объект фильтров из URL */
const PRICE_OPTIONS = [
  { value: '', label: 'Любая цена' },
  { value: '500', label: 'До 500 ₽' },
  { value: '1000', label: 'До 1 000 ₽' },
  { value: '2000', label: 'До 2 000 ₽' },
  { value: '5000', label: 'До 5 000 ₽' },
];

const LIMIT_OPTIONS = [20, 50, 100] as const;

function pluralizeCity(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'город';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'города';
  return 'городов';
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
  };
}

export default function EventsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [events, setEvents] = useState<EventListItem[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState<CityListItem[]>([]);
  const [piers, setPiers] = useState<{ id: string; slug?: string; title: string; shortTitle?: string | null }[]>([]);
  const [viewMode, setViewModeState] = useState<'grid' | 'list'>('grid');
  const [multiSlugByGroupingKey, setMultiSlugByGroupingKey] = useState<Record<string, string>>({});

  // T15: persist view mode to localStorage
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

  // Предзагружаем карту groupSlug по groupingKey для мульти-событий (нужна только в общей выдаче "Мероприятия").
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

  // Предзагружаем карту groupSlug по groupingKey для мульти-событий (нужна только без выбранного города).
  useEffect(() => {
    if (city) {
      setMultiSlugByGroupingKey({});
      return;
    }

    let cancelled = false;

    api
      .getMultiEvents({ sort: 'popular', limit: 200 })
      .then((groups) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const g of groups) {
          if (g.groupingKey && g.slug) {
            map[g.groupingKey] = g.slug;
          }
        }
        setMultiSlugByGroupingKey(map);
      })
      .catch((e) => {
        console.warn('Events page: getMultiEvents error', e);
      });

    return () => {
      cancelled = true;
    };
  }, [city]);

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

  // Практический подход: для вкладки "Мероприятия" скрывать быстрые фильтры,
  // под которыми в текущей выборке вообще нет событий (по подкатегории/тегу/аудитории).
  const visibleQuickFilters = useMemo<QuickFilter[]>(() => {
    if (!quickFilters.length) return quickFilters;
    if (vitrineKey !== EventCategory.EVENT) return quickFilters;

    return quickFilters.filter((qf) => {
      const params = qf.params || {};
      // Если фильтр не завязан на содержимое event'а — оставляем как есть.
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

  // Параметры от активного quick filter
  const quickFilterParams = useMemo(() => {
    if (!activeQuickFilter) return {};
    const qf = quickFilters.find((f) => f.id === activeQuickFilter);
    return qf ? qf.params : {};
  }, [activeQuickFilter, quickFilters]);

  // «Скоро» = departing_soon sort
  const isSoonMode = timeOfDay === 'soon';

  useEffect(() => {
    api
      .getCities()
      .then(setCities)
      .catch((e) => {
        console.warn('Events page error:', e);
      });
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
    const isMuseumFromUrl = categoryFromUrl === 'MUSEUM';

    if (isMuseumFromUrl) {
      // Музеи → единый каталог (Venue)
      const params: Record<string, string | number> = { category: 'MUSEUM', page: pageFromUrl, sort: sortFromUrl, limit: limitFromUrl };
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
    const slugsWithSoon = new Set(events.filter((e) => e.city).map((e) => e.city.slug));
    return cities.filter((c) => slugsWithSoon.has(c.slug));
  }, [isSoonMode, cities, events]);

  // Группировка мульти-событий в общей выдаче: одинаковое название + разные города → 1 карточка.
  // Работает только без выбранного города (общая витрина); группируем только события категории EVENT.
  type DisplayEvent = {
    event: EventListItem;
    cityLabelOverride?: string;
    hrefOverride?: string;
    groupingKey?: string | null;
  };

  type EventWithGroupingKey = EventListItem & { groupingKey?: string | null };

  // Небольшое выравнивание: не ставить рядом карточки с одинаковой картинкой
  // (используется только в общей выдаче без фильтра города).
  function separateSameImageNeighbors(items: DisplayEvent[]): DisplayEvent[] {
    const result = [...items];
    for (let i = 1; i < result.length; i++) {
      const prev = result[i - 1]?.event;
      const curr = result[i]?.event;
      const prevImg = (prev?.imageUrl || '').trim();
      const currImg = (curr?.imageUrl || '').trim();
      if (!prevImg || !currImg || prevImg !== currImg) continue;

      // Ищем дальше по списку первую карточку с другим изображением и меняем местами
      for (let j = i + 1; j < result.length; j++) {
        const img = (result[j]?.event.imageUrl || '').trim();
        if (!img || img !== prevImg) {
          const tmp = result[i];
          result[i] = result[j];
          result[j] = tmp;
          break;
        }
      }
    }
    return result;
  }

  const displayEvents: DisplayEvent[] = useMemo(() => {
    if (!events.length) return [];

    // С выбранным городом — ничего не группируем, возвращаем как есть.
    if (city) {
      return events.map((e) => ({ event: e }));
    }

    type Group = {
      events: EventListItem[];
      hasMultipleCities: boolean;
      cityNames: string[];
      groupingKey?: string | null;
    };

    const groups = new Map<string, Group>();

    // Собираем события по ключу группы:
    // 1) если есть groupingKey — по нему;
    // 2) иначе по нормализованному заголовку;
    // 3) если нет ни заголовка, ни groupingKey — не группируем (уникальный ключ по id).
    const getGroupKey = (e: EventWithGroupingKey): string | null => {
      const rawTitle = (e.title || '').trim();
      const groupingKey = e.groupingKey;
      const normalizedGroupingKey = groupingKey?.trim() || null;

      if (!rawTitle && !normalizedGroupingKey) return null;
      if (normalizedGroupingKey) return `g:${normalizedGroupingKey}`;
      return rawTitle.toLowerCase();
    };

    for (const eBase of events) {
      const e = eBase as EventWithGroupingKey;
      // Группируем только события категории EVENT; остальные не попадают в группы.
      if (e.category !== EventCategory.EVENT) {
        continue;
      }

      const key = getGroupKey(e);
      if (!key) {
        // Без ключа группы — кладём под собственный id, не группируем с другими
        const fallbackKey = `__id__${e.id}`;
        const group = groups.get(fallbackKey) ?? {
          events: [],
          hasMultipleCities: false,
          cityNames: [],
          groupingKey: null,
        };
        group.events.push(e);
        groups.set(fallbackKey, group);
        continue;
      }

      const groupingKey = e.groupingKey;
      const group = groups.get(key) ?? {
        events: [],
        hasMultipleCities: false,
        cityNames: [],
        groupingKey: groupingKey ?? null,
      };
      group.events.push(e);
      groups.set(key, group);
    }

    // Определяем, какие группы действительно мульти (есть разные города) и считаем города
    for (const [key, group] of groups) {
      const cityMap = new Map<string, string>();
      for (const e of group.events) {
        if (e.city) {
          cityMap.set(e.city.slug, e.city.name);
        }
      }
      const cityNames = Array.from(cityMap.values());
      group.cityNames = cityNames;
      group.hasMultipleCities = cityNames.length > 1;
      groups.set(key, group);
    }

    const seen = new Set<string>();
    const result: DisplayEvent[] = [];

    // Идём в исходном порядке событий, чтобы не ломать сортировку;
    // для мульти-группы добавляем только первого представителя + собираем человекочитаемый список городов.
    for (const e of events) {
      // Не EVENT — не участвует в группировке, просто добавляем.
      if (e.category !== EventCategory.EVENT) {
        result.push({ event: e });
        continue;
      }

      const key = getGroupKey(e);
      if (!key) {
        result.push({ event: e });
        continue;
      }

      const group = groups.get(key);
      if (!group || !group.hasMultipleCities) {
        result.push({ event: e });
        continue;
      }

      if (seen.has(key)) continue;
      seen.add(key);

      const representative = group.events[0] ?? e;
      const totalCities = group.cityNames.length;
      const previewCities = group.cityNames.slice(0, 2);
      const remaining = totalCities - previewCities.length;

      let cityLabelOverride: string | undefined;
      if (totalCities > 0) {
        if (remaining > 0) {
          const head = previewCities.join(' • ');
          cityLabelOverride = `${head} • +${remaining} ${pluralizeCity(remaining)}`;
        } else {
          cityLabelOverride = previewCities.join(' • ');
        }
      }

      let hrefOverride: string | undefined;
      if (group.groupingKey && group.hasMultipleCities) {
        const slug = multiSlugByGroupingKey[group.groupingKey] ?? group.groupingKey;
        hrefOverride = `/events/m/${slug}`;
      }

      result.push({
        event: representative,
        cityLabelOverride,
        hrefOverride,
        groupingKey: group.groupingKey ?? null,
      });
    }

    // В общей выдаче без города слегка "расслаиваем" одинаковые картинки,
    // чтобы они не стояли вплотную.
    return city ? result : separateSameImageNeighbors(result);
  }, [events, category, city, multiSlugByGroupingKey]);

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
          {!isMuseumCategory && (
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-slate-500 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center justify-center rounded-md px-2.5 py-1.5 sm:px-2.5 ${
                viewMode === 'grid'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'hover:bg-slate-50'
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
                viewMode === 'list'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'hover:bg-slate-50'
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

      {/* Events grid / list */}
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
        viewMode === 'grid' ? (
          <div className="grid gap-3 grid-cols-1 min-[361px]:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
            {displayEvents.map(({ event, cityLabelOverride, hrefOverride }) => (
              <EventCard
                key={event.id}
                slug={event.slug}
                title={event.title}
                category={event.category}
                subcategories={event.subcategories}
                audience={event.audience}
                tagSlugs={event.tagSlugs}
                imageUrl={event.imageUrl}
                priceFrom={event.priceFrom ?? null}
                rating={event.rating}
                reviewCount={event.reviewCount}
                durationMinutes={event.durationMinutes ?? null}
                city={event.city}
                address={event.address as string | null | undefined}
                totalAvailableTickets={event.totalAvailableTickets}
                departingSoonMinutes={event.departingSoonMinutes}
                nextSessionAt={event.nextSessionAt}
                isOptimalChoice={event.isOptimalChoice}
                dateMode={event.dateMode ?? undefined}
                cityLabelOverride={cityLabelOverride}
                hrefOverride={hrefOverride}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
          {displayEvents.map(({ event, cityLabelOverride, hrefOverride }) => {
            const evWithDescription = event as typeof event & {
              description?: string | null;
              shortDescription?: string | null;
            };
            const description = evWithDescription.description ?? evWithDescription.shortDescription ?? null;

            return (
              <EventCardHorizontal
                key={event.id}
                slug={event.slug}
                title={event.title}
                category={event.category}
                imageUrl={event.imageUrl ?? null}
                priceFrom={event.priceFrom ?? null}
                rating={event.rating}
                reviewCount={event.reviewCount}
                durationMinutes={event.durationMinutes ?? null}
                city={event.city}
                totalAvailableTickets={event.totalAvailableTickets ?? undefined}
                departingSoonMinutes={event.departingSoonMinutes ?? undefined}
                nextSessionAt={event.nextSessionAt ?? undefined}
                isOptimalChoice={event.isOptimalChoice}
                dateMode={event.dateMode ?? undefined}
                priceOriginalKopecks={event.priceOriginalKopecks}
                groupSize={event.groupSize ?? undefined}
                sessionTimes={event.sessionTimes ?? []}
                highlights={event.highlights ?? []}
                cityLabelOverride={cityLabelOverride}
                hrefOverride={hrefOverride}
                description={description}
              />
            );
          })}
          </div>
        )
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 sm:py-20 text-center">
          <p className="text-4xl">🔍</p>
          <h2 className="mt-4 text-lg font-semibold text-slate-700 sm:text-xl">Событий пока нет</h2>
          <p className="mt-2 text-sm text-slate-500">Попробуйте изменить фильтры или выбрать другую категорию</p>
        </div>
      )}

      {/* Pagination */}
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
