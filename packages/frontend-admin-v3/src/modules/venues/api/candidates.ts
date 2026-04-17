import { adminApi } from '@/api/client';
import type { HubReadinessSnapshot } from '@/types/hub-readiness';

export type VenueLifecycleStatus = 'DRAFT' | 'ACTIVE' | 'MERGED' | 'REJECTED';
export type VenueSourceType = 'IMPORTED' | 'MANUAL';
export type VenueImportSource = 'TICKETSCLOUD' | 'TEPLOHOD';

/** Синхронно с Prisma enum `VenueModerationReasonCode`. */
export type VenueModerationReasonCode =
  | 'BAD_SOURCE_DATA'
  | 'DUPLICATE_NOT_CONFIRMED'
  | 'WRONG_CITY'
  | 'WRONG_ADDRESS'
  | 'SPAM'
  | 'IRRELEVANT'
  | 'OTHER';

export type VenueDecisionHint =
  | 'MERGE_RECOMMENDED'
  | 'APPROVE_AS_NEW'
  | 'NEEDS_REVIEW'
  | 'REJECT_RECOMMENDED'
  | 'NO_HINT';

export type VenueAdminReadinessDto = {
  status: 'READY' | 'NEEDS_WORK' | 'NEEDS_REVIEW' | 'BLOCKED';
  score: number;
  blockers: string[];
  warnings: string[];
  moderationSignals: string[];
  keySignals: string[];
};

export type AdminVenueCandidateRow = {
  id: string;
  slug: string | null;
  title: string;
  venueType: string;
  city: { id?: string; name: string; slug: string };
  rating: number;
  isActive: boolean;
  isFeatured: boolean;
  isHiddenGem?: boolean;
  lifecycleStatus: VenueLifecycleStatus;
  isPublished: boolean;
  sourceType: VenueSourceType;
  importSource: VenueImportSource | null;
  externalVenueId: string | null;
  needsReview: boolean;
  /** GET /admin/venues (расширенный list): whitelist SEO-страницы */
  isVenuePageWhitelisted?: boolean;
  eventsCount: number;
  /** Дублирует eventsCount для явного смысла «связанные события» */
  relatedEventsCount?: number;
  activeEventsCount?: number;
  futureEventsCount?: number;
  mergedFromCount?: number;
  hasCover?: boolean;
  readinessStatus?: VenueAdminReadinessDto['status'];
  readinessScore?: number;
  readinessKeySignals?: string[];
  mergeTargetSummary?: { id: string; title: string; slug: string } | null;
  offersCount: number;
  updatedAt: string;
  rawName: string | null;
  rawAddress: string | null;
  /** Канонический адрес для списка (сервер: address → raw → normalized). */
  displayAddress: string | null;
  /** Dual-read: ref -> legacy string */
  district?: string | null;
  metro?: string | null;
  districtRef?: { id: string; name: string; slug: string } | null;
  metroStationRef?: { id: string; name: string; slug: string; lineName?: string | null; lineColor?: string | null } | null;
  normalizedName: string | null;
  normalizedAddress: string | null;
  confidenceScore: number | null;
  mergeTargetId: string | null;
  version: number;
  decisionHint?: VenueDecisionHint;
  decisionHintReasons?: string[];
};

export type PaginatedVenues = {
  items: AdminVenueCandidateRow[];
  total: number;
  nextCursor: string | null;
  hasMore: boolean;
};

export type AdminVenueDetail = {
  id: string;
  slug: string | null;
  title: string;
  address: string | null;
  shortDescription?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  galleryUrls?: string[];
  metaTitle?: string | null;
  metaDescription?: string | null;
  venueType?: string;
  lat?: number | null;
  lng?: number | null;
  metro?: string | null;
  district?: string | null;
  districtId?: string | null;
  metroStationId?: string | null;
  isHiddenGem?: boolean;
  districtRef?: { id: string; name: string; slug: string } | null;
  metroStationRef?: { id: string; name: string; slug: string; lineName?: string | null; lineColor?: string | null } | null;
  venueTemplateData?: unknown;
  /** Legacy JSON с витрины / импорта — участвуют в сборке шаблона PDP */
  highlights?: unknown;
  faq?: unknown;
  openingHours?: unknown;
  isVenuePageWhitelisted?: boolean;
  /** ISO — для optimistic lock (GET /admin/venues/:id отдаёт полную модель). */
  updatedAt?: string;
  lifecycleStatus: VenueLifecycleStatus;
  version: number;
  rawName: string | null;
  rawAddress: string | null;
  normalizedName: string | null;
  normalizedAddress: string | null;
  confidenceScore: number | null;
  needsReview: boolean;
  importSource: VenueImportSource | null;
  externalVenueId: string | null;
  sourceType: VenueSourceType;
  isPublished: boolean;
  isActive?: boolean;
  mergeTargetId?: string | null;
  /** Сводка готовности (добавлено бэкендом к полной модели). */
  readiness?: VenueAdminReadinessDto;
  /** Витринный hub-слой (отдельно от модерационной готовности). */
  hubReadiness?: HubReadinessSnapshot;
  venuePageMode?: 'NONE' | 'BASIC' | 'HUB';
  /** Канонический адрес для UI (address → raw → normalized). */
  displayAddress?: string | null;
  city: { id: string; name: string; slug: string };
};

/** GET /admin/venues/:id/summary — витрина, контент, события, готовность */
export type VenueAdminSummaryResponse = {
  id: string;
  venueReadiness: VenueAdminReadinessDto;
  storefront: {
    activeEventsCount: number;
    eventsWithFutureSlotsCount: number;
    avgEventRating: number | null;
    readyRatio: number | null;
    readyDataQuality: 'FULL' | 'PARTIAL' | 'FROM_OVERRIDE_ONLY';
    isFeatured: boolean;
  };
  content: { hasVenueTemplateData: boolean; sectionKeys?: string[] };
  relatedEvents: Array<{
    id: string;
    slug: string;
    title: string;
    category: string | null;
    readinessStatus: string;
    storefrontVisibility: string;
    rating: number | null;
    reviewCount: number;
    adminUrlPath: string;
    publicUrlPath: string;
  }>;
  truncated?: boolean;
};

export type AdminVenueSubcategoriesResponse = {
  primarySubcategory: { id: string; slug: string; nameRu: string } | null;
  secondarySubcategories: Array<{ id: string; slug: string; nameRu: string }>;
  all: Array<{ id: string; slug: string; nameRu: string }>;
};

export type AdminVenueSimilarItem = {
  id: string;
  title: string;
  slug: string | null;
  lifecycleStatus: VenueLifecycleStatus;
  sourceType: VenueSourceType;
  importSource: VenueImportSource | null;
  externalVenueId: string | null;
  address: string | null;
  normalizedName: string | null;
  normalizedAddress: string | null;
  confidenceScore: number | null;
  similarityScore: number;
  similarityReasons: string[];
  activeEventsCount: number;
  hasPublicVenuePage: boolean;
};

export type AdminVenueSimilarDraftsResponse = {
  venue: {
    id: string;
    title: string;
    lifecycleStatus: VenueLifecycleStatus;
    cityId: string;
    normalizedName: string | null;
    normalizedAddress: string | null;
  };
  items: AdminVenueSimilarItem[];
};

/** GET /admin/venues/:candidateId/merge-preview — предпросмотр перед merge. */
export type VenueMergePreviewDto = {
  candidate: {
    id: string;
    displayTitle: string;
    displayAddress: string | null;
    city: { id: string; name: string; slug: string } | null;
    sourceType: VenueSourceType;
    importSource: VenueImportSource | null;
    confidenceScore: number | null;
    needsReview: boolean;
    lifecycleStatus: VenueLifecycleStatus;
    updatedAt: string;
  };
  target: {
    id: string;
    displayTitle: string;
    displayAddress: string | null;
    city: { id: string; name: string; slug: string } | null;
    sourceType: VenueSourceType;
    importSource: VenueImportSource | null;
    isPublished: boolean;
    isActive: boolean;
    lifecycleStatus: VenueLifecycleStatus;
    stats: {
      eventsCount: number;
      activeEventsCount?: number;
    };
    updatedAt: string;
  };
  comparison: {
    sameCity: boolean;
    titleSimilarityLabel: 'HIGH' | 'MEDIUM' | 'LOW';
    addressSimilarityLabel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
    warnings: string[];
  };
  decisionHint: VenueDecisionHint;
  decisionHintReasons: string[];
};

/** Ответ batch approve / reject. */
export type BatchVenueActionResultDto = {
  total: number;
  successCount: number;
  failureCount: number;
  results: Array<{
    id: string;
    success: boolean;
    code?: string;
    message?: string;
  }>;
};

export type BatchVenueApprovePreviewItemDto = {
  venueId: string;
  title: string;
  proposedTitle: string;
  proposedSlug: string;
  currentUpdatedAt: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  slugStatus: string;
  warningCodes: string[];
  errorCode: string | null;
};

export type BatchVenueApprovePreviewDto = {
  items: BatchVenueApprovePreviewItemDto[];
  summary: { total: number; ok: number; warnings: number; errors: number };
};

/** Пресеты сортировки на экране кандидатов (один select). */
export type VenueCandidatesSortPreset = 'newest' | 'confidence_desc' | 'confidence_asc';

/** Поля sort, совместимые с GET /admin/venues. */
export type VenueCandidatesListSort = 'updatedAt' | 'createdAt' | 'confidenceScore';

const DEFAULT_LIST_SORT: VenueCandidatesListSort = 'confidenceScore';

export function venueCandidatesSortPresetToQuery(
  preset: VenueCandidatesSortPreset,
): { sort: VenueCandidatesListSort; order: 'asc' | 'desc' } {
  switch (preset) {
    case 'newest':
      return { sort: 'updatedAt', order: 'desc' };
    case 'confidence_asc':
      return { sort: 'confidenceScore', order: 'asc' };
    case 'confidence_desc':
    default:
      return { sort: 'confidenceScore', order: 'desc' };
  }
}

/** Сопоставление sort+order из URL с пресетом для select (только известные комбинации UI). */
export function venueCandidatesUrlToPreset(sort: string, order: string): VenueCandidatesSortPreset {
  if (sort === 'updatedAt' && order === 'desc') return 'newest';
  if (sort === 'confidenceScore' && order === 'desc') return 'confidence_desc';
  if (sort === 'confidenceScore' && order === 'asc') return 'confidence_asc';
  return 'confidence_desc';
}

export function parseVenueCandidatesListSortFromUrl(
  sort: string | null,
  order: string | null,
): { sort: VenueCandidatesListSort; order: 'asc' | 'desc' } {
  const allowed: VenueCandidatesListSort[] = ['updatedAt', 'createdAt', 'confidenceScore'];
  const s = sort && allowed.includes(sort as VenueCandidatesListSort) ? (sort as VenueCandidatesListSort) : DEFAULT_LIST_SORT;
  const o = order === 'asc' ? 'asc' : 'desc';
  return { sort: s, order: o };
}

/** Полный список площадок (без пресета кандидатов DRAFT/IMPORTED). */
export async function fetchAdminVenuesList(params: {
  page?: number;
  limit?: number;
  search?: string;
  citySlug?: string;
  venueType?: string;
  lifecycleStatus?: string;
  importSource?: VenueImportSource | '';
  sourceType?: VenueSourceType | '';
  needsReview?: boolean;
  sort?: string;
  order?: 'asc' | 'desc';
  hasMergeTarget?: boolean;
  venuePageWhitelist?: boolean;
  isHiddenGem?: boolean;
  /** GET readinessStatus — фильтр на стороне БД (см. backend venueReadinessListWhere) */
  readinessStatus?: 'READY' | 'NEEDS_WORK' | 'NEEDS_REVIEW' | 'BLOCKED';
}): Promise<PaginatedVenues> {
  const sp = new URLSearchParams();
  sp.set('limit', String(params.limit ?? 25));
  if (params.page != null) sp.set('page', String(params.page));
  if (params.search) sp.set('search', params.search);
  if (params.citySlug) sp.set('city', params.citySlug);
  if (params.venueType) sp.set('venueType', params.venueType);
  if (params.lifecycleStatus) sp.set('lifecycleStatus', params.lifecycleStatus);
  if (params.importSource) sp.set('importSource', params.importSource);
  if (params.sourceType) sp.set('sourceType', params.sourceType);
  if (params.needsReview === true) sp.set('needsReview', 'true');
  if (params.needsReview === false) sp.set('needsReview', 'false');
  if (params.sort) sp.set('sort', params.sort);
  if (params.order) sp.set('order', params.order);
  if (params.hasMergeTarget === true) sp.set('hasMergeTarget', 'true');
  if (params.hasMergeTarget === false) sp.set('hasMergeTarget', 'false');
  if (params.venuePageWhitelist === true) sp.set('venuePageWhitelist', 'true');
  if (params.venuePageWhitelist === false) sp.set('venuePageWhitelist', 'false');
  if (params.isHiddenGem === true) sp.set('isHiddenGem', 'true');
  if (params.isHiddenGem === false) sp.set('isHiddenGem', 'false');
  if (params.readinessStatus) sp.set('readinessStatus', params.readinessStatus);

  return adminApi.get<PaginatedVenues>(`/admin/venues?${sp.toString()}`);
}

export type AdminGeoDistrict = {
  id: string;
  cityId: string;
  name: string;
  slug: string;
  description: string | null;
};

export type AdminGeoMetroStation = {
  id: string;
  cityId: string;
  name: string;
  slug: string;
  lineName: string | null;
  lineColor: string | null;
};

export async function fetchAdminGeoDistricts(params: { cityId?: string; q?: string }) {
  const sp = new URLSearchParams();
  if (params.cityId) sp.set('cityId', params.cityId);
  if (params.q) sp.set('q', params.q);
  return adminApi.get<{ items: AdminGeoDistrict[] }>(`/admin/geo/districts?${sp.toString()}`);
}

export async function fetchAdminGeoMetroStations(params: { cityId?: string; q?: string }) {
  const sp = new URLSearchParams();
  if (params.cityId) sp.set('cityId', params.cityId);
  if (params.q) sp.set('q', params.q);
  return adminApi.get<{ items: AdminGeoMetroStation[] }>(`/admin/geo/metro-stations?${sp.toString()}`);
}

export async function patchAdminVenue(
  id: string,
  body: {
    version: number;
    districtId?: string | null;
    metroStationId?: string | null;
    isHiddenGem?: boolean;
  },
) {
  return adminApi.patch<AdminVenueDetail>(`/admin/venues/${id}`, body);
}

export async function fetchVenueCandidates(params: {
  page?: number;
  limit?: number;
  search?: string;
  citySlug?: string;
  importSource?: VenueImportSource;
  needsReview?: boolean;
  sort?: VenueCandidatesListSort;
  order?: 'asc' | 'desc';
  sortPreset?: VenueCandidatesSortPreset;
  /** GET includeDecisionHints=true — подсказки rule-engine для DRAFT IMPORTED. */
  includeDecisionHints?: boolean;
}): Promise<PaginatedVenues> {
  const sp = new URLSearchParams();
  sp.set('lifecycleStatus', 'DRAFT');
  sp.set('sourceType', 'IMPORTED');
  sp.set('limit', String(params.limit ?? 50));
  if (params.page != null) sp.set('page', String(params.page));
  if (params.search) sp.set('search', params.search);
  if (params.citySlug) sp.set('city', params.citySlug);
  if (params.importSource) sp.set('importSource', params.importSource);
  if (params.needsReview === true) sp.set('needsReview', 'true');
  if (params.needsReview === false) sp.set('needsReview', 'false');
  if (params.includeDecisionHints) sp.set('includeDecisionHints', 'true');

  const explicit = params.sort != null && params.order != null;
  const { sort, order } = explicit
    ? { sort: params.sort!, order: params.order! }
    : venueCandidatesSortPresetToQuery(params.sortPreset ?? 'confidence_desc');
  sp.set('sort', sort);
  sp.set('order', order);

  return adminApi.get<PaginatedVenues>(`/admin/venues?${sp.toString()}`);
}

export async function fetchAdminVenueDetail(id: string): Promise<AdminVenueDetail> {
  return adminApi.get<AdminVenueDetail>(`/admin/venues/${id}`);
}

export async function fetchVenueAdminSummary(id: string): Promise<VenueAdminSummaryResponse> {
  return adminApi.get<VenueAdminSummaryResponse>(`/admin/venues/${id}/summary`);
}

export async function fetchVenueSubcategoriesAdmin(id: string): Promise<AdminVenueSubcategoriesResponse> {
  return adminApi.get<AdminVenueSubcategoriesResponse>(`/admin/venues/${id}/subcategories`);
}

export async function fetchMergePreview(candidateId: string, targetId: string): Promise<VenueMergePreviewDto> {
  const sp = new URLSearchParams();
  sp.set('targetId', targetId);
  return adminApi.get<VenueMergePreviewDto>(`/admin/venues/${candidateId}/merge-preview?${sp.toString()}`);
}

export async function fetchSimilarDrafts(
  venueId: string,
  opts?: { includeActive?: boolean; limit?: number },
): Promise<AdminVenueSimilarDraftsResponse> {
  const sp = new URLSearchParams();
  if (opts?.includeActive === false) sp.set('includeActive', 'false');
  if (opts?.limit != null) sp.set('limit', String(opts.limit));
  const q = sp.toString();
  return adminApi.get<AdminVenueSimilarDraftsResponse>(
    `/admin/venues/${venueId}/similar-drafts${q ? `?${q}` : ''}`,
  );
}

/** Пакет похожих площадок: один HTTP вместо N вызовов similar-drafts. */
export async function fetchSimilarDraftsBatch(
  venueIds: string[],
  opts?: { includeActive?: boolean; limit?: number },
): Promise<Record<string, AdminVenueSimilarItem[]>> {
  if (venueIds.length === 0) return {};
  const sp = new URLSearchParams();
  sp.set('ids', venueIds.join(','));
  if (opts?.includeActive === false) sp.set('includeActive', 'false');
  if (opts?.limit != null) sp.set('limit', String(opts.limit));
  return adminApi.get<Record<string, AdminVenueSimilarItem[]>>(`/admin/venues/batch/similar-drafts?${sp.toString()}`);
}

export async function fetchBatchApprovePreview(ids: string[]): Promise<BatchVenueApprovePreviewDto> {
  return adminApi.post<BatchVenueApprovePreviewDto>('/admin/venues/batch/approve-preview', { ids });
}

/** Batch approve: legacy `{ ids }` или `{ items: [{ id, expectedUpdatedAt? }] }`. */
export async function approveVenuesBatch(payload: { ids?: string[]; items?: Array<{ id: string; expectedUpdatedAt?: string }> }): Promise<BatchVenueActionResultDto> {
  return adminApi.post<BatchVenueActionResultDto>('/admin/venues/batch/approve', payload);
}

export async function rejectVenuesBatch(payload: {
  ids?: string[];
  items?: Array<{ id: string; expectedUpdatedAt?: string }>;
  reason?: string | null;
  reasonCode?: VenueModerationReasonCode | null;
  reasonText?: string | null;
}): Promise<BatchVenueActionResultDto> {
  return adminApi.post<BatchVenueActionResultDto>('/admin/venues/batch/reject', payload);
}

export async function approveVenueDraft(
  venueId: string,
  body: { title: string; address?: string; slug?: string; isPublished?: boolean; expectedUpdatedAt?: string },
): Promise<unknown> {
  return adminApi.post(`/admin/venues/${venueId}/approve-draft`, body);
}

export async function mergeVenueInto(
  venueId: string,
  body: { targetVenueId: string; expectedSourceUpdatedAt?: string; expectedTargetUpdatedAt?: string },
): Promise<{ success: true }> {
  return adminApi.post(`/admin/venues/${venueId}/merge-into`, body);
}

export async function rejectVenue(
  venueId: string,
  body?: { reasonCode?: VenueModerationReasonCode | null; reasonText?: string | null; expectedUpdatedAt?: string },
): Promise<unknown> {
  return adminApi.post(`/admin/venues/${venueId}/reject`, body ?? {});
}
