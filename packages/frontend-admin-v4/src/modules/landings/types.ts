export type Paginated<T> = { items: T[]; total: number; nextCursor?: string | null; hasMore?: boolean };

export type LandingListItemDto = {
  id: string;
  slug: string;
  title: string;
  status?: string | null;
  isActive?: boolean | null;
  landingType?: 'CITY' | 'MULTI_CITY' | string | null;
  city?: { slug: string; name: string } | null;
  isIndexable?: boolean | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  /** Полный публичный URL витрины: `canonicalUrl` или база из env на бэке + путь. */
  storefrontPublicUrl?: string | null;
  updatedAt?: string | null;
};

export type LandingCoverageChildDto = {
  id: string;
  slug: string;
  title: string;
  landingType?: string | null;
  status?: string | null;
  isActive?: boolean | null;
  isIndexable?: boolean | null;
  templateType?: string | null;
  parentLandingId?: string | null;
  city?: { id?: string; slug: string; name: string } | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  seasonalPayload?: unknown;
  filterTag?: string | null;
  filterTagId?: string | null;
  filterTagRef?: { id: string; slug: string; name: string; isActive?: boolean; isDeleted?: boolean } | null;
};

export type LandingDetailDto = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  heroText?: string | null;
  status?: string | null;
  isActive?: boolean | null;
  isIndexable?: boolean | null;
  landingType?: string | null;
  city?: { slug: string; name: string } | null;
  cityId?: string | null;
  parentLandingId?: string | null;
  templateType?: string | null;
  filterTag?: string | null;
  filterTagId?: string | null;
  filterTagRef?: { id: string; slug: string; name: string; isActive?: boolean; isDeleted?: boolean } | null;
  /** Baseline filters (validated backend-side). */
  additionalFilters?: unknown;
  seasonalPayload?: unknown;
  seoH1?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImageUrl?: string | null;
  canonicalUrl?: string | null;
  /** С бэка: абсолютный URL для «На сайте», если задан базовый origin. */
  storefrontPublicUrl?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  version?: number;
  contentBlocks?: unknown[];
  childLandings?: LandingCoverageChildDto[];
  hubReadiness?: Record<string, unknown>;
};

/** `GET /admin/landings/:id/resolved-events` — выдача событий по фильтрам лендинга (админ). */
export type LandingResolvedEventsDto = {
  total: number;
  items: Array<{
    id: string;
    slug: string | null;
    title: string;
    city: { id: string; slug: string; name: string } | null;
    isActive: boolean;
    priceFrom: string | null;
    nextSessionAt: string | null;
  }>;
};

/** `GET /admin/landings/:id/seo-audit` — расширенный ответ контроллера (issues/score + метаданные). */
export type LandingSeoAuditResponseDto = {
  issues: string[];
  warnings: string[];
  score: number;
  matchedEventsCount?: number;
  domains?: Record<string, string[]>;
};

export type LandingsModule = {};

