/**
 * Каноническая сборка query-string для публичного каталога `/events`.
 * Параметры совпадают с `EventsPageClient` / `GET /events` (см. Roadmap спринт 1a).
 */

export const CATALOG_EVENTS_LIMIT_OPTIONS = [20, 50, 100] as const;

/** Параметры для сборки ссылки (только заданные попадают в URL). */
export type CatalogEventsUrlParams = {
  city?: string | null;
  category?: string | null;
  audience?: string | null;
  subcategory?: string | null;
  venueId?: string | null;
  tag?: string | null;
  structuralTags?: string | null;
  popularTags?: string | null;
  date?: string | null;
  pier?: string | null;
  priceMax?: string | null;
  timeOfDay?: string | null;
  sort?: string | null;
  qf?: string | null;
  q?: string | null;
  page?: number | null;
  limit?: number | null;
};

/** Распарсенное состояние из URL (как на странице каталога). */
export type ParsedCatalogEventsParams = {
  city: string;
  category: string;
  audience: string;
  sort: string;
  timeOfDay: string;
  tag: string;
  structuralTags: string;
  popularTags: string;
  date: string | null;
  pier: string;
  priceMax: string;
  page: number;
  limit: number;
  qf: string;
  q: string;
  venueId: string;
  subcategory: string;
};

const PARAM_ORDER: (keyof CatalogEventsUrlParams)[] = [
  'city',
  'category',
  'audience',
  'subcategory',
  'venueId',
  'tag',
  'structuralTags',
  'popularTags',
  'date',
  'pier',
  'priceMax',
  'timeOfDay',
  'sort',
  'qf',
  'q',
  'page',
  'limit',
];

function appendIfNonEmpty(sp: URLSearchParams, key: string, value: string | number | null | undefined): void {
  if (value === null || value === undefined) return;
  const s = typeof value === 'number' ? String(value) : String(value).trim();
  if (!s) return;
  sp.set(key, s);
}

/**
 * Собрать `URLSearchParams` для каталога (стабильный порядок ключей).
 */
export function buildCatalogEventsSearchParams(params: CatalogEventsUrlParams): URLSearchParams {
  const sp = new URLSearchParams();
  for (const key of PARAM_ORDER) {
    const v = params[key];
    if (v === null || v === undefined) continue;
    if (key === 'page') {
      const p = typeof v === 'number' ? v : parseInt(String(v), 10);
      if (Number.isFinite(p) && p > 1) sp.set('page', String(p));
      continue;
    }
    if (key === 'limit') {
      const lim = typeof v === 'number' ? v : parseInt(String(v), 10);
      if (CATALOG_EVENTS_LIMIT_OPTIONS.includes(lim as (typeof CATALOG_EVENTS_LIMIT_OPTIONS)[number])) {
        sp.set('limit', String(lim));
      }
      continue;
    }
    appendIfNonEmpty(sp, key, v as string | number);
  }
  return sp;
}

/** Путь `/events` или `/events?...` */
export function catalogEventsHref(params: CatalogEventsUrlParams): string {
  const sp = buildCatalogEventsSearchParams(params);
  const q = sp.toString();
  return q ? `/events?${q}` : '/events';
}

/**
 * Разбор query каталога (зеркало логики `EventsPageClient`).
 */
/** Сортировка с лендингового FilterBar → query каталога `/events`. */
export function landingFilterSortToCatalogSort(landingSort: string): string {
  if (landingSort === 'price') return 'price_asc';
  if (landingSort === 'popular') return 'popular';
  return 'departing_soon';
}

/**
 * Чипы времени лендинга → `timeOfDay` каталога (грубое соответствие; ночные слоты мостов → `night`).
 */
export function landingTimeSlotToCatalogTimeOfDay(
  timeSlotMode: 'night' | 'evening' | 'dinner' | 'hidden',
  timeSlot: string,
): string | null {
  if (!timeSlot || timeSlotMode === 'hidden') return null;
  if (timeSlotMode === 'dinner') {
    if (timeSlot === 'sunset') return 'evening';
    if (timeSlot === 'night') return 'night';
    return null;
  }
  if (timeSlotMode === 'evening') return 'evening';
  return 'night';
}

/**
 * Контекст лендинга (как в `buildLandingEventsWhere`) → базовые параметры ссылки на каталог.
 * В URL передаём AND-набор: тег + category + первая подкатегория из `additionalFilters`.
 */
export function catalogParamsFromLandingContext(
  filterTag: string | null | undefined,
  additionalFilters: unknown,
): CatalogEventsUrlParams {
  const params: CatalogEventsUrlParams = {};
  const ft = typeof filterTag === 'string' ? filterTag.trim() : '';
  if (ft) params.tag = ft;

  if (additionalFilters && typeof additionalFilters === 'object') {
    const af = additionalFilters as Record<string, unknown>;
    if (typeof af.category === 'string' && af.category.trim()) {
      params.category = af.category.trim();
    }
    const subs = af.subcategories;
    if (Array.isArray(subs)) {
      const first = subs.find((s): s is string => typeof s === 'string' && s.trim().length > 0);
      if (first) params.subcategory = first.trim();
    }
  }
  return params;
}

export function parseCatalogEventsParams(sp: URLSearchParams): ParsedCatalogEventsParams {
  const sort = sp.get('sort') || 'popular';
  const isSoon = sort === 'departing_soon';
  const rawLimit = parseInt(sp.get('limit') || '20', 10);
  const limit = CATALOG_EVENTS_LIMIT_OPTIONS.includes(rawLimit as 20 | 50 | 100) ? rawLimit : 20;
  return {
    city: sp.get('city') || '',
    category: sp.get('category') || '',
    audience: sp.get('audience') || '',
    sort,
    timeOfDay: isSoon ? 'soon' : sp.get('timeOfDay') || '',
    tag: sp.get('tag') || '',
    structuralTags: sp.get('structuralTags') || '',
    popularTags: sp.get('popularTags') || '',
    date: sp.get('date') || null,
    pier: sp.get('pier') || '',
    priceMax: sp.get('priceMax') || '',
    page: Math.max(1, parseInt(sp.get('page') || '1', 10)),
    limit,
    qf: sp.get('qf') || '',
    q: sp.get('q') || '',
    venueId: sp.get('venueId') || '',
    subcategory: sp.get('subcategory') || '',
  };
}
