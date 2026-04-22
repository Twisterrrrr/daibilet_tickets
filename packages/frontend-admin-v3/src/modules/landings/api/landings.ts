import { adminApi } from '@/api/client';
import type { HubReadinessSnapshot } from '@/types/hub-readiness';

export type AdminLandingType = 'CITY' | 'MULTI_CITY';
export type AdminLandingEventSourceType = 'AUTO_QUERY' | 'PRIMARY_COLLECTION' | 'MIXED';
export type AdminLandingStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export type AdminLandingListRow = {
  id: string;
  title: string;
  slug: string;
  landingType: AdminLandingType;
  status: AdminLandingStatus;
  eventSourceType: AdminLandingEventSourceType;
  isActive: boolean;
  isIndexable: boolean;
  updatedAt: string;
  version: number;
  city: { slug: string; name: string } | null;
  parentLanding: { id: string; slug: string; title: string; landingType: AdminLandingType } | null;
};

/** Типы блоков композиции (совпадают с Prisma `LandingBlockType`) */
export const ADMIN_LANDING_BLOCK_TYPES = [
  'HERO',
  'TRUST_BADGES',
  'VALUE_PROPS',
  'QUICK_FILTERS',
  'FEATURED_VARIANTS',
  'SCHEDULE_PREVIEW',
  'CITY_GRID',
  'CATEGORY_CHIPS',
  'INFO_ICONS',
  'STORY',
  'HIGHLIGHTS',
  'ITINERARY',
  'PRICING',
  'FAQ',
  'REVIEWS',
  'GALLERY',
  'COMPARISON',
  'RELATED_LANDINGS',
  'RELATED_COLLECTIONS',
  'RELATED_ARTICLES',
  'CTA_BANNER',
  'SEO_TEXT',
  'RAW_RICH_TEXT',
] as const;

export type AdminLandingBlockType = (typeof ADMIN_LANDING_BLOCK_TYPES)[number];

export type AdminLandingContentBlock = {
  id: string;
  landingPageId: string;
  type: string;
  variant: string | null;
  title: string | null;
  subtitle: string | null;
  eyebrow: string | null;
  body: string | null;
  richTextJson: unknown;
  payload: unknown;
  assetUrl: string | null;
  mobileAssetUrl: string | null;
  isEnabled: boolean;
  sortOrder: number;
  visibilityRules: unknown;
  createdAt: string;
  updatedAt: string;
};

export type AdminLandingThemeListItem = {
  id: string;
  slug: string;
  name: string;
  title: string | null;
  subtitle: string | null;
  defaultHeroTitle: string | null;
  defaultSeoTitle: string | null;
};

export type AdminLandingDetail = AdminLandingListRow & {
  cityId: string | null;
  parentLandingId: string | null;
  childLandings: Array<{
    id: string;
    title: string;
    slug: string;
    landingType: AdminLandingType;
    status: AdminLandingStatus;
    isActive: boolean;
    isIndexable: boolean;
    city: { slug: string; name: string } | null;
  }>;

  themeId?: string | null;
  theme?: {
    id: string;
    slug: string;
    name: string;
    isActive: boolean;
  } | null;
  contentBlocks?: AdminLandingContentBlock[];

  // content
  subtitle: string | null;
  heroText: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  heroBadge?: string | null;
  heroImageUrl?: string | null;
  heroMobileImageUrl?: string | null;
  layoutVariant?: string | null;
  surfaceVariant?: string | null;
  legalText: string | null;
  templateType: 'GENERIC_CARDS' | 'COMPARISON_TABLE' | 'HYBRID' | 'SEASONAL_EVENT';

  // content blocks (legacy JSON fields)
  howToChoose: unknown[] | null;
  infoBlocks: unknown[] | null;
  faq: unknown[] | null;
  reviews: unknown[] | null;
  stats: Record<string, unknown> | null;
  relatedLinks: unknown[] | null;
  seasonalPayload: Record<string, unknown> | null;

  // selection (legacy + new)
  filterTag: string;
  filterTagId?: string | null;
  filterTagRef?: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    isDeleted?: boolean;
  } | null;
  additionalFilters: Record<string, unknown> | null;
  collectionId: string | null;
  selectionMode: 'COLLECTION' | 'CUSTOM';
  queryConfig: Record<string, unknown> | null;

  // SEO
  metaTitle: string | null;
  metaDescription: string | null;
  seoH1?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImageUrl?: string | null;
  canonicalUrl: string | null;

  relatedArticleIds: string[];
  relatedCollectionIds: string[];

  hubReadiness?: HubReadinessSnapshot;
};

export type AdminLandingResolvedEventsResponse = {
  items: Array<{
    id: string;
    slug: string | null;
    title: string;
    city: { id: string; slug: string; name: string } | null;
    isActive: boolean;
    priceFrom: string | null;
    nextSessionAt: string | null;
  }>;
  total: number;
};

export async function fetchAdminLandingsList(params: {
  search?: string;
  city?: string;
  landingType?: AdminLandingType;
  status?: AdminLandingStatus;
  eventSourceType?: AdminLandingEventSourceType;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.city) qs.set('city', params.city);
  if (params.landingType) qs.set('landingType', params.landingType);
  if (params.status) qs.set('status', params.status);
  if (params.eventSourceType) qs.set('eventSourceType', params.eventSourceType);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return adminApi.get<{ items: AdminLandingListRow[]; total: number }>(`/admin/landings${query}`);
}

export async function fetchAdminLandingDetail(id: string) {
  return adminApi.get<AdminLandingDetail>(`/admin/landings/${encodeURIComponent(id)}`);
}

export async function patchAdminLanding(id: string, body: Partial<AdminLandingDetail> & { version: number }) {
  return adminApi.patch<AdminLandingDetail>(`/admin/landings/${encodeURIComponent(id)}`, body);
}

export async function createAdminLanding(body: Partial<AdminLandingDetail>) {
  return adminApi.post<AdminLandingDetail>('/admin/landings', body);
}

export async function deleteAdminLanding(id: string) {
  return adminApi.delete<{ success: true }>(`/admin/landings/${encodeURIComponent(id)}`);
}

export async function fetchAdminLandingResolvedEvents(id: string) {
  return adminApi.get<AdminLandingResolvedEventsResponse>(`/admin/landings/${encodeURIComponent(id)}/resolved-events`);
}

/** Ответ `GET /admin/landings/:id/seo-audit` (read-model + matchedEventsCount) */
export type AdminLandingSeoAuditResponse = {
  issues: string[];
  warnings: string[];
  score: number;
  matchedEventsCount: number;
  domains: {
    metadata: string[];
    canonicalIndexability: string[];
    sourceCompleteness: string[];
    contentCompleteness: string[];
    intentCollision: string[];
    relatedLinks: string[];
  };
};export async function fetchAdminLandingSeoAudit(landingId: string) {
  return adminApi.get<AdminLandingSeoAuditResponse>(
    `/admin/landings/${encodeURIComponent(landingId)}/seo-audit`,
  );
}

export async function fetchAdminLandingThemes() {
  return adminApi.get<AdminLandingThemeListItem[]>('/admin/landing-themes');
}

export async function postAdminLandingBlockReorder(landingId: string, orderedIds: string[]) {
  return adminApi.post<{ success: boolean }>(
    `/admin/landings/${encodeURIComponent(landingId)}/blocks/reorder`,
    { orderedIds },
  );
}

export async function postAdminLandingBlock(
  landingId: string,
  body: {
    type: AdminLandingBlockType;
    title?: string | null;
    subtitle?: string | null;
    body?: string | null;
    variant?: string | null;
    isEnabled?: boolean;
  },
) {
  return adminApi.post<AdminLandingContentBlock>(`/admin/landings/${encodeURIComponent(landingId)}/blocks`, body);
}export async function patchAdminLandingBlock(
  landingId: string,
  blockId: string,
  body: Partial<Pick<AdminLandingContentBlock, 'type' | 'title' | 'subtitle' | 'body' | 'variant' | 'isEnabled' | 'sortOrder'>>,
) {
  return adminApi.patch<AdminLandingContentBlock>(
    `/admin/landings/${encodeURIComponent(landingId)}/blocks/${encodeURIComponent(blockId)}`,
    body,
  );
}export async function deleteAdminLandingBlock(landingId: string, blockId: string) {
  return adminApi.delete<{ success: boolean }>(
    `/admin/landings/${encodeURIComponent(landingId)}/blocks/${encodeURIComponent(blockId)}`,
  );
}