import { adminApi } from '@/api/client';

export type PromoPlacementBlockStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type PromoPlacementZone =
  | 'HOME_HERO'
  | 'HOME_FEATURED'
  | 'CITY_HERO'
  | 'CITY_BELOW_HERO'
  | 'LANDING_HERO'
  | 'LANDING_INLINE'
  | 'ARTICLE_INLINE'
  | 'COLLECTION_INLINE'
  | 'CATALOG_INLINE';

export type PromoPageScopeType = 'GLOBAL' | 'CITY' | 'LANDING' | 'COLLECTION' | 'ARTICLE';

export type PromoTargetType = 'EVENT' | 'COLLECTION' | 'LANDING' | 'ARTICLE';

export type PromoPlacementReadinessStatus = 'READY' | 'EMPTY' | 'SCHEDULED' | 'EXPIRED' | 'INACTIVE' | 'MISCONFIGURED';
export type PromoPlacementReadinessReason =
  | 'NO_SCOPE_MATCH'
  | 'WINDOW_NOT_STARTED'
  | 'WINDOW_EXPIRED'
  | 'NOT_PUBLISHED'
  | 'NO_TARGET'
  | 'UNSUPPORTED_CONTEXT'
  | 'NO_RESOLVED_CONTENT'
  | 'CONFLICT_MULTIPLE_ACTIVE'
  | 'OUTRANKED'
  | string;

export type PromoPlacementBlockListItem = {
  id: string;
  title: string;
  status: PromoPlacementBlockStatus;
  placementZone: PromoPlacementZone;
  pageScopeType: PromoPageScopeType;
  city?: { id: string; name: string; slug: string } | null;
  landing?: { id: string; title: string; slug: string } | null;
  collection?: { id: string; title: string; slug: string } | null;
  article?: { id: string; title: string; slug: string } | null;
  targetType: PromoTargetType;
  targetSummary?: { id: string; title: string; slug: string } | null;
  priority: number;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  publishedAt?: string | null;
  updatedAt: string;
  isCurrentlyActive?: boolean;
  preview?: {
    resolvedUrl: string | null;
    displayTitle: string;
    displaySubtitle: string | null;
    displayImageUrl: string | null;
  };
  readinessStatus?: PromoPlacementReadinessStatus;
  readinessReasons?: PromoPlacementReadinessReason[];
  targetHasSeoIssues?: boolean;
  seoIssueCodes?: string[];
};

export type PromoPlacementBlockListResponse = {
  page: number;
  limit: number;
  total: number;
  items: PromoPlacementBlockListItem[];
};

export async function fetchAdminPromoPlacementBlocks(params: {
  search?: string;
  status?: PromoPlacementBlockStatus;
  placementZone?: PromoPlacementZone;
  pageScopeType?: PromoPageScopeType;
  cityId?: string;
  landingId?: string;
  collectionId?: string;
  articleId?: string;
  targetType?: PromoTargetType;
  readiness?: PromoPlacementReadinessStatus;
  seoOnly?: boolean;
  page: number;
  limit: number;
  sort?: 'updatedAt' | 'publishedAt' | 'priority' | 'sortOrder' | 'title';
  order?: 'asc' | 'desc';
}) {
  const sp = new URLSearchParams();
  if (params.search) sp.set('search', params.search);
  if (params.status) sp.set('status', params.status);
  if (params.placementZone) sp.set('placementZone', params.placementZone);
  if (params.pageScopeType) sp.set('pageScopeType', params.pageScopeType);
  if (params.cityId) sp.set('cityId', params.cityId);
  if (params.landingId) sp.set('landingId', params.landingId);
  if (params.collectionId) sp.set('collectionId', params.collectionId);
  if (params.articleId) sp.set('articleId', params.articleId);
  if (params.targetType) sp.set('targetType', params.targetType);
  if (params.readiness) sp.set('readiness', params.readiness);
  if (params.seoOnly) sp.set('seoOnly', '1');
  sp.set('page', String(params.page));
  sp.set('limit', String(params.limit));
  if (params.sort) sp.set('sort', params.sort);
  if (params.order) sp.set('order', params.order);
  return adminApi.get<PromoPlacementBlockListResponse>(`/admin/promo-placement-blocks?${sp.toString()}`);
}

export type PromoPlacementBlockDetail = {
  id: string;
  title: string;
  status: PromoPlacementBlockStatus;
  placementZone: PromoPlacementZone;
  pageScopeType: PromoPageScopeType;
  city?: { id: string; name: string; slug: string } | null;
  landing?: { id: string; title: string; slug: string } | null;
  collection?: { id: string; title: string; slug: string } | null;
  article?: { id: string; title: string; slug: string } | null;
  targetType: PromoTargetType;
  target?: { id: string; title: string; slug: string; kind: PromoTargetType } | null;
  customTitle: string | null;
  customSubtitle: string | null;
  customImageUrl: string | null;
  ctaLabel: string | null;
  priority: number;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  isCurrentlyActive: boolean;
  preview: {
    resolvedUrl: string | null;
    displayTitle: string;
    displaySubtitle: string | null;
    displayImageUrl: string | null;
  };
  readinessStatus?: PromoPlacementReadinessStatus;
  readinessReasons?: PromoPlacementReadinessReason[];
  targetHasSeoIssues?: boolean;
  seoIssueCodes?: string[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function fetchAdminPromoPlacementBlock(id: string) {
  return adminApi.get<PromoPlacementBlockDetail>(`/admin/promo-placement-blocks/${encodeURIComponent(id)}`);
}

export type PromoPlacementResolvedPreviewResponse = {
  id: string;
  placementZone: PromoPlacementZone;
  context: {
    pageScopeType: PromoPageScopeType;
    cityId: string | null;
    landingId: string | null;
    collectionId: string | null;
    articleId: string | null;
  };
  baseReadiness: {
    readinessStatus: PromoPlacementReadinessStatus;
    readinessReasons: PromoPlacementReadinessReason[];
  };
  diagnostics: {
    readinessStatus: PromoPlacementReadinessStatus;
    readinessReasons: PromoPlacementReadinessReason[];
    scopeMatch: boolean;
    selected: boolean;
    rank: number | null;
    activeCount: number;
    activeTotal?: number;
    activeTruncated?: boolean;
    winnerId?: string | null;
    comparisonToWinner?: {
      outcome: 'WINNER' | 'OUTRANKED' | 'INACTIVE' | 'NOT_ELIGIBLE';
      reasons: Array<
        | 'LOWER_PRIORITY'
        | 'HIGHER_SORT_ORDER'
        | 'OLDER_UPDATED_AT_TIEBREAKER'
        | 'NOT_PUBLISHED'
        | 'WINDOW_NOT_STARTED'
        | 'WINDOW_EXPIRED'
        | 'SCOPE_MISMATCH'
      >;
    } | null;
  };
  resolvedTop: Array<{
    id: string;
    title: string;
    targetType: PromoTargetType;
    targetSummary: { id: string; title: string; slug: string } | null;
    priority: number;
    sortOrder: number;
    preview: {
      resolvedUrl: string | null;
      displayTitle: string;
      displaySubtitle: string | null;
      displayImageUrl: string | null;
    };
    targetHasSeoIssues?: boolean;
    seoIssueCodes?: string[];
    rankExplanation?: { primaryOrderingFactor: 'PRIORITY' | 'SORT_ORDER' | 'UPDATED_AT' };
    updatedAt: string;
  }>;
  resolvedAll?: Array<{
    id: string;
    title: string;
    targetType: PromoTargetType;
    targetSummary: { id: string; title: string; slug: string } | null;
    priority: number;
    sortOrder: number;
    preview: {
      resolvedUrl: string | null;
      displayTitle: string;
      displaySubtitle: string | null;
      displayImageUrl: string | null;
    };
    targetHasSeoIssues?: boolean;
    seoIssueCodes?: string[];
    rankExplanation?: { primaryOrderingFactor: 'PRIORITY' | 'SORT_ORDER' | 'UPDATED_AT' };
    updatedAt: string;
  }>;
};

export async function fetchAdminPromoPlacementResolvedPreview(args: {
  id: string;
  pageScopeType: PromoPageScopeType;
  cityId?: string;
  landingId?: string;
  collectionId?: string;
  articleId?: string;
  limit?: number;
}) {
  const sp = new URLSearchParams();
  sp.set('pageScopeType', args.pageScopeType);
  if (args.cityId) sp.set('cityId', args.cityId);
  if (args.landingId) sp.set('landingId', args.landingId);
  if (args.collectionId) sp.set('collectionId', args.collectionId);
  if (args.articleId) sp.set('articleId', args.articleId);
  if (args.limit) sp.set('limit', String(args.limit));
  return adminApi.get<PromoPlacementResolvedPreviewResponse>(
    `/admin/promo-placement-blocks/${encodeURIComponent(args.id)}/resolved-preview?${sp.toString()}`,
  );
}

export type CreatePromoPlacementBlockInput = {
  title: string;
  placementZone: PromoPlacementZone;
  pageScopeType: PromoPageScopeType;
  cityId?: string | null;
  landingId?: string | null;
  collectionId?: string | null;
  articleId?: string | null;
  targetType: PromoTargetType;
  targetEventId?: string | null;
  targetCollectionId?: string | null;
  targetLandingId?: string | null;
  targetArticleId?: string | null;
  customTitle?: string;
  customSubtitle?: string;
  customImageUrl?: string;
  ctaLabel?: string;
  priority?: number;
  sortOrder?: number;
  startsAt?: string | null;
  endsAt?: string | null;
};

export async function createAdminPromoPlacementBlock(data: CreatePromoPlacementBlockInput) {
  return adminApi.post(`/admin/promo-placement-blocks`, data);
}

export type UpdatePromoPlacementBlockInput = Partial<CreatePromoPlacementBlockInput> & {
  status?: PromoPlacementBlockStatus;
};

export async function patchAdminPromoPlacementBlock(id: string, data: UpdatePromoPlacementBlockInput) {
  return adminApi.patch(`/admin/promo-placement-blocks/${encodeURIComponent(id)}`, data);
}

