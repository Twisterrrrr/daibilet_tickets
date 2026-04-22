import {
  parseVenueCandidatesListSortFromUrl,
  venueCandidatesSortPresetToQuery,
  venueCandidatesUrlToPreset,
  type VenueCandidatesListSort,
  type VenueCandidatesSortPreset,
} from '@/modules/venues/api/candidates';

/** Распарсенное и нормализованное состояние списка кандидатов (источник правды — URL). */
export type VenueCandidatesParsedState = {
  search: string;
  citySlug: string;
  importSource: '' | 'TICKETSCLOUD' | 'TEPLOHOD';
  onlyNeedsReview: boolean;
  onlyWithDuplicates: boolean;
  sort: VenueCandidatesListSort;
  order: 'asc' | 'desc';
  page: number;
  limit: number;
  similarToVenueId: string;
  similarToVenueName: string;
};

export const VENUE_CANDIDATES_DEFAULT_LIMIT = 50;

function parseImportSource(raw: string | null): '' | 'TICKETSCLOUD' | 'TEPLOHOD' {
  const t = raw?.trim() ?? '';
  if (t === 'TICKETSCLOUD' || t === 'TEPLOHOD') return t;
  return '';
}

/** Читает query и применяет правила similarTo (подстановка search из similarToVenueName). */
export function parseVenueCandidatesSearchParams(sp: URLSearchParams): VenueCandidatesParsedState {
  const { sort, order } = parseVenueCandidatesListSortFromUrl(sp.get('sort'), sp.get('order'));

  const onlyNeedsReview = sp.get('onlyNeedsReview') === '1';
  const onlyWithDuplicates = sp.get('onlyWithDuplicates') === '1';

  const pageRaw = parseInt(sp.get('page') ?? '1', 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const limitRaw = parseInt(sp.get('limit') ?? '', 10);
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(200, Math.max(1, limitRaw)) : VENUE_CANDIDATES_DEFAULT_LIMIT;

  let search = sp.get('search')?.trim() ?? '';
  const citySlug = sp.get('citySlug')?.trim() ?? '';
  const importSource = parseImportSource(sp.get('importSource'));

  const similarToVenueId = sp.get('similarToVenueId')?.trim() ?? '';
  const similarToVenueName = sp.get('similarToVenueName')?.trim() ?? '';

  if (similarToVenueId && !search && similarToVenueName) {
    search = similarToVenueName;
  }

  return {
    search,
    citySlug,
    importSource,
    onlyNeedsReview,
    onlyWithDuplicates,
    sort,
    order,
    page,
    limit,
    similarToVenueId,
    similarToVenueName,
  };
}

export const VENUE_CANDIDATES_DEFAULT_SORT: VenueCandidatesListSort = 'confidenceScore';
export const VENUE_CANDIDATES_DEFAULT_ORDER: 'asc' | 'desc' = 'desc';

const DEFAULT_SORT = VENUE_CANDIDATES_DEFAULT_SORT;
const DEFAULT_ORDER = VENUE_CANDIDATES_DEFAULT_ORDER;

/**
 * Строит query string без пустых значений; page=1 и sort/order по умолчанию не пишутся.
 */
export function buildVenueCandidatesSearchParams(state: VenueCandidatesParsedState): URLSearchParams {
  const out = new URLSearchParams();
  if (state.search) out.set('search', state.search);
  if (state.citySlug) out.set('citySlug', state.citySlug);
  if (state.importSource) out.set('importSource', state.importSource);
  if (state.onlyNeedsReview) out.set('onlyNeedsReview', '1');
  if (state.onlyWithDuplicates) out.set('onlyWithDuplicates', '1');
  if (state.sort !== DEFAULT_SORT) out.set('sort', state.sort);
  if (state.order !== DEFAULT_ORDER) out.set('order', state.order);
  if (state.page > 1) out.set('page', String(state.page));
  if (state.limit !== VENUE_CANDIDATES_DEFAULT_LIMIT) out.set('limit', String(state.limit));
  if (state.similarToVenueId) out.set('similarToVenueId', state.similarToVenueId);
  if (state.similarToVenueName) out.set('similarToVenueName', state.similarToVenueName);
  return out;
}

/** Сброс к «чистому» списку без контекста similarTo и без фильтров. */
export function buildDefaultVenueCandidatesSearchParams(): URLSearchParams {
  return new URLSearchParams();
}

export function venueCandidatesParsedToSortPreset(state: VenueCandidatesParsedState): VenueCandidatesSortPreset {
  return venueCandidatesUrlToPreset(state.sort, state.order);
}

export function applySortPresetToState(
  state: VenueCandidatesParsedState,
  preset: VenueCandidatesSortPreset,
): VenueCandidatesParsedState {
  const { sort, order } = venueCandidatesSortPresetToQuery(preset);
  return { ...state, sort, order, page: 1 };
}

/** Нормализация числовых полей после ручных правок query. */
export function normalizeVenueCandidatesUrlState(state: VenueCandidatesParsedState): VenueCandidatesParsedState {
  const page = Number.isFinite(state.page) && state.page > 0 ? Math.floor(state.page) : 1;
  const limit =
    Number.isFinite(state.limit) && state.limit > 0
      ? Math.min(200, Math.max(1, Math.floor(state.limit)))
      : VENUE_CANDIDATES_DEFAULT_LIMIT;
  return { ...state, page, limit };
}

/** Убирает контекст «похоже на площадку»; при необходимости сбрасывает поиск, если он совпадал с именем из контекста. */
export function stripSimilarVenueContext(state: VenueCandidatesParsedState): VenueCandidatesParsedState {
  const hadName = state.similarToVenueName.trim();
  const next: VenueCandidatesParsedState = {
    ...state,
    similarToVenueId: '',
    similarToVenueName: '',
    page: 1,
  };
  if (hadName && state.search.trim() === hadName) {
    next.search = '';
  }
  return normalizeVenueCandidatesUrlState(next);
}

/** Сброс фильтров списка с сохранением limit и контекста similarTo (если был). */
export function resetVenueCandidatesFiltersKeepingSimilar(
  state: VenueCandidatesParsedState,
): VenueCandidatesParsedState {
  return normalizeVenueCandidatesUrlState({
    ...state,
    search: '',
    citySlug: '',
    importSource: '',
    onlyNeedsReview: false,
    onlyWithDuplicates: false,
    sort: VENUE_CANDIDATES_DEFAULT_SORT,
    order: VENUE_CANDIDATES_DEFAULT_ORDER,
    page: 1,
  });
}

export function buildCandidatesPrefilterFromVenue(params: {
  venueId: string;
  title: string;
  citySlug: string;
}): VenueCandidatesParsedState {
  const t = params.title.trim();
  return normalizeVenueCandidatesUrlState({
    search: '',
    citySlug: params.citySlug.trim(),
    importSource: '',
    onlyNeedsReview: false,
    onlyWithDuplicates: false,
    sort: VENUE_CANDIDATES_DEFAULT_SORT,
    order: VENUE_CANDIDATES_DEFAULT_ORDER,
    page: 1,
    limit: VENUE_CANDIDATES_DEFAULT_LIMIT,
    similarToVenueId: params.venueId,
    similarToVenueName: t,
  });
}
