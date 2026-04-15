import type { CityCatalogHubStatus, VenuePageMode } from '@/prisma-client';

import type { PrismaService } from '../../prisma/prisma.service';

import type {
  HubReadinessIssue,
  HubReadinessSnapshot,
  HubType,
} from './hub-readiness.types';

const MIN_STOREFRONT_EVENTS_CITY = 3;
const MIN_STOREFRONT_EVENTS_VENUE_HUB = 3;
const THIN_CATALOG_MAX = 5;

function iss(
  code: string,
  severity: HubReadinessIssue['severity'],
  title: string,
  group: HubReadinessIssue['group'],
  description?: string,
): HubReadinessIssue {
  return { code, severity, title, group, description };
}

function deriveScore(issues: HubReadinessIssue[]): number {
  let s = 100;
  for (const i of issues) {
    if (i.severity === 'ERROR') s -= 28;
    else if (i.severity === 'WARNING') s -= 11;
    else s -= 3;
  }
  return Math.max(0, Math.min(100, s));
}

function statusFromEval(issues: HubReadinessIssue[]): HubReadinessSnapshot['status'] {
  const hasErr = issues.some((i) => i.severity === 'ERROR');
  if (hasErr) return 'BLOCKED';
  const score = deriveScore(issues);
  if (score >= 82) return 'READY';
  return 'NEEDS_WORK';
}

/** События витрины по площадкам (согласовано с city metrics: APPROVED, не дубль). */
export async function loadVenueStorefrontEventCounts(
  prisma: PrismaService,
  venueIds: string[],
): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  if (venueIds.length === 0) return m;
  const rows = await prisma.event.groupBy({
    by: ['venueId'],
    where: {
      venueId: { in: venueIds },
      isDeleted: false,
      isActive: true,
      moderationStatus: 'APPROVED',
      canonicalOfId: null,
    },
    _count: { _all: true },
  });
  for (const r of rows) {
    if (r.venueId) m.set(r.venueId, r._count._all);
  }
  return m;
}

export async function loadCityHubBatchAuxMetrics(
  prisma: PrismaService,
  cityIds: string[],
): Promise<{ promoByCity: Map<string, number>; articlesByCity: Map<string, number> }> {
  const empty = { promoByCity: new Map<string, number>(), articlesByCity: new Map<string, number>() };
  if (cityIds.length === 0) return empty;

  const [promoRows, articleRows] = await Promise.all([
    prisma.promoPlacementBlock.groupBy({
      by: ['cityId'],
      where: { cityId: { in: cityIds }, status: 'PUBLISHED' },
      _count: { _all: true },
    }),
    prisma.article.groupBy({
      by: ['cityId'],
      where: { cityId: { in: cityIds }, status: 'PUBLISHED' },
      _count: { _all: true },
    }),
  ]);

  const promoByCity = new Map<string, number>();
  for (const r of promoRows) {
    if (r.cityId) promoByCity.set(r.cityId, r._count._all);
  }
  const articlesByCity = new Map<string, number>();
  for (const r of articleRows) {
    if (r.cityId) articlesByCity.set(r.cityId, r._count._all);
  }
  return { promoByCity, articlesByCity };
}

export type CityHubSnapshotInput = {
  cityId: string;
  slug: string;
  name: string;
  isActive: boolean;
  isCatalogHub: boolean;
  catalogHubStatus: CityCatalogHubStatus;
  description: string | null | undefined;
  heroImage: string | null | undefined;
  metaTitle: string | null | undefined;
  metaDescription: string | null | undefined;
  storefrontActiveEvents: number;
  collectionsCount: number;
  landingsCount: number;
  publishedArticlesCount: number;
  publishedPromoBlocksCount: number;
  siteBaseUrl?: string | null;
};

export function buildCityHubReadinessSnapshot(input: CityHubSnapshotInput): HubReadinessSnapshot {
  const publicPath = `/cities/${input.slug}`;
  const publicAbs = input.siteBaseUrl ? `${input.siteBaseUrl.replace(/\/$/, '')}${publicPath}` : null;
  const urlStr = publicAbs ?? publicPath;

  const stats = {
    activeEventsCount: input.storefrontActiveEvents,
    relatedCollectionsCount: input.collectionsCount,
    relatedArticlesCount: input.publishedArticlesCount,
    promoBlocksCount: input.publishedPromoBlocksCount,
  };

  const base = {
    hubType: 'CITY_HUB' as HubType,
    entityType: 'CITY' as const,
    entityId: input.cityId,
    stats,
    urls: { publicUrl: urlStr, canonicalUrl: urlStr },
  };

  if (!input.isCatalogHub || input.catalogHubStatus === 'DISABLED') {
    return {
      ...base,
      status: 'NOT_A_HUB',
      score: null,
      isIndexableTarget: false,
      isCommercialEntryPoint: false,
      issues: [iss('CITY_HUB_INTENT_OFF', 'INFO', 'Город не отмечен как каталожный хаб', 'STRUCTURE')],
    };
  }

  if (input.catalogHubStatus === 'DRAFT') {
    return {
      ...base,
      status: 'DRAFT',
      score: null,
      isIndexableTarget: false,
      isCommercialEntryPoint: false,
      issues: [iss('CITY_HUB_DRAFT', 'INFO', 'Каталожный хаб в подготовке (DRAFT)', 'PUBLICATION')],
    };
  }

  const issues: HubReadinessIssue[] = [];

  if (!input.isActive) {
    issues.push(iss('CITY_HUB_INACTIVE', 'ERROR', 'Город неактивен — страница недоступна', 'PUBLICATION'));
  }

  const h1 = input.name?.trim();
  const mt = input.metaTitle?.trim();
  const md = input.metaDescription?.trim();
  if (!h1) issues.push(iss('CITY_HUB_NO_H1', 'ERROR', 'Нет названия (H1)', 'SEO'));
  if (!mt) issues.push(iss('CITY_HUB_NO_SEO_TITLE', 'ERROR', 'Нет SEO title (metaTitle)', 'SEO'));
  if (!md) issues.push(iss('CITY_HUB_NO_SEO_DESCRIPTION', 'ERROR', 'Нет SEO description', 'SEO'));

  if (input.storefrontActiveEvents < MIN_STOREFRONT_EVENTS_CITY) {
    issues.push(
      iss(
        'CITY_HUB_EMPTY_CATALOG',
        'ERROR',
        `Недостаточно активных событий в витрине (нужно ≥ ${MIN_STOREFRONT_EVENTS_CITY})`,
        'CATALOG',
      ),
    );
  } else if (input.storefrontActiveEvents <= THIN_CATALOG_MAX) {
    issues.push(iss('CITY_HUB_THIN_CATALOG', 'WARNING', 'Каталог узкий по активным событиям', 'CATALOG'));
  }

  if (!input.description?.trim()) {
    issues.push(iss('CITY_HUB_WEAK_INTRO', 'WARNING', 'Нет описания города / вводного текста', 'CONTENT'));
  }
  if (!input.heroImage?.trim()) {
    issues.push(iss('CITY_HUB_NO_COVER', 'WARNING', 'Нет обложки (hero)', 'CONTENT'));
  }

  if (input.collectionsCount === 0) {
    issues.push(iss('CITY_HUB_NO_PRIMARY_COLLECTION', 'WARNING', 'Нет подборок, привязанных к городу', 'LINKING'));
  }
  if (input.landingsCount === 0) {
    issues.push(iss('CITY_HUB_NO_RELATED_LANDING', 'WARNING', 'Нет лендингов по городу', 'LINKING'));
  }
  if (input.publishedArticlesCount === 0) {
    issues.push(iss('CITY_HUB_NO_RELATED_ARTICLE', 'WARNING', 'Нет опубликованных статей по городу', 'LINKING'));
  }
  if (input.publishedPromoBlocksCount === 0) {
    issues.push(iss('CITY_HUB_NO_PROMO', 'INFO', 'Нет опубликованных promo-блоков с привязкой к городу', 'PROMO'));
  }

  const st = statusFromEval(issues);
  const score = deriveScore(issues);
  const indexable = st === 'READY' && input.isActive;

  return {
    ...base,
    status: st,
    score,
    issues,
    isIndexableTarget: indexable,
    isCommercialEntryPoint: st === 'READY' || st === 'NEEDS_WORK',
  };
}

export type VenueHubSnapshotInput = {
  venueId: string;
  slug: string;
  title: string;
  cityId: string | null;
  citySlug?: string | null;
  venuePageMode: VenuePageMode;
  isActive: boolean;
  isPublished: boolean;
  lifecycleStatus: string;
  mergeTargetId: string | null;
  address: string | null | undefined;
  displayAddress: string | null | undefined;
  metaTitle: string | null | undefined;
  metaDescription: string | null | undefined;
  description: string | null | undefined;
  imageUrl: string | null | undefined;
  storefrontActiveEvents: number;
  siteBaseUrl?: string | null;
};

export function buildVenueHubReadinessSnapshot(input: VenueHubSnapshotInput): HubReadinessSnapshot {
  const publicPath = `/venues/${input.slug}`;
  const publicAbs = input.siteBaseUrl ? `${input.siteBaseUrl.replace(/\/$/, '')}${publicPath}` : null;
  const urlStr = publicAbs ?? publicPath;

  const stats = {
    activeEventsCount: input.storefrontActiveEvents,
  };

  const base = {
    hubType: 'VENUE_HUB' as HubType,
    entityType: 'VENUE' as const,
    entityId: input.venueId,
    stats,
    urls: { publicUrl: urlStr, canonicalUrl: urlStr },
  };

  if (input.venuePageMode === 'NONE') {
    return {
      ...base,
      status: 'NOT_A_HUB',
      score: null,
      isIndexableTarget: false,
      isCommercialEntryPoint: false,
      issues: [
        iss('VENUE_HUB_INTENT_NONE', 'INFO', 'Отдельная витринная страница площадки не настроена (NONE)', 'STRUCTURE'),
      ],
    };
  }

  const strictSeo = input.venuePageMode === 'HUB';
  const issues: HubReadinessIssue[] = [];

  if (input.venuePageMode === 'BASIC') {
    issues.push(
      iss('VENUE_HUB_BASIC_MODE', 'INFO', 'Режим BASIC: сниженные требования к hub-слою', 'STRUCTURE'),
    );
  }

  if (!input.cityId) {
    issues.push(iss('VENUE_HUB_NO_CITY', 'ERROR', 'Не указан город', 'STRUCTURE'));
  }
  const addr = (input.displayAddress ?? input.address)?.trim();
  if (!addr) {
    issues.push(iss('VENUE_HUB_NO_ADDRESS', 'ERROR', 'Нет адреса площадки', 'STRUCTURE'));
  }
  if (input.mergeTargetId) {
    issues.push(
      iss('VENUE_HUB_UNRESOLVED_DUPLICATES', 'ERROR', 'Площадка в статусе дубля (merge target)', 'STRUCTURE'),
    );
  }
  if (!input.isPublished || input.lifecycleStatus !== 'ACTIVE') {
    issues.push(
      iss('VENUE_HUB_NO_PUBLIC_URL', 'ERROR', 'Страница площадки не опубликована / не ACTIVE', 'PUBLICATION'),
    );
  }
  if (!input.isActive) {
    issues.push(iss('VENUE_HUB_INACTIVE', 'ERROR', 'Площадка выключена', 'PUBLICATION'));
  }

  const mt = input.metaTitle?.trim();
  const md = input.metaDescription?.trim();
  if (!input.title?.trim()) {
    issues.push(iss('VENUE_HUB_NO_H1', strictSeo ? 'ERROR' : 'WARNING', 'Нет названия (H1)', 'SEO'));
  }
  if (!mt) {
    issues.push(
      iss('VENUE_HUB_NO_SEO_TITLE', strictSeo ? 'ERROR' : 'WARNING', 'Нет SEO title', 'SEO'),
    );
  }
  if (!md) {
    issues.push(
      iss('VENUE_HUB_NO_SEO_DESCRIPTION', strictSeo ? 'ERROR' : 'WARNING', 'Нет SEO description', 'SEO'),
    );
  }

  const minEv = input.venuePageMode === 'HUB' ? MIN_STOREFRONT_EVENTS_VENUE_HUB : 1;
  if (input.storefrontActiveEvents < minEv) {
    issues.push(
      iss(
        'VENUE_HUB_EMPTY_CATALOG',
        strictSeo ? 'ERROR' : 'WARNING',
        `Мало активных событий на площадке для режима (нужно ≥ ${minEv})`,
        'CATALOG',
      ),
    );
  } else if (input.venuePageMode === 'HUB' && input.storefrontActiveEvents <= THIN_CATALOG_MAX) {
    issues.push(iss('VENUE_HUB_THIN_CATALOG', 'WARNING', 'Каталог событий узкий для режима HUB', 'CATALOG'));
  }

  if (!input.description?.trim() && !input.imageUrl?.trim()) {
    issues.push(iss('VENUE_HUB_WEAK_CONTENT', 'WARNING', 'Слабый контент: нет описания и обложки', 'CONTENT'));
  } else if (!input.imageUrl?.trim()) {
    issues.push(iss('VENUE_HUB_NO_COVER', 'WARNING', 'Нет обложки', 'CONTENT'));
  }

  if (input.venuePageMode === 'HUB') {
    issues.push(
      iss(
        'VENUE_HUB_NO_PRIMARY_COLLECTION',
        'INFO',
        'Проверьте связку с подборками и промо вручную',
        'LINKING',
      ),
    );
  }

  const st = statusFromEval(issues);
  const score = deriveScore(issues);

  return {
    ...base,
    status: st,
    score,
    issues,
    isIndexableTarget: st === 'READY' && input.isActive && input.isPublished,
    isCommercialEntryPoint: st === 'READY' || st === 'NEEDS_WORK',
  };
}

export type LandingHubSnapshotInput = {
  landingId: string;
  slug: string;
  title: string;
  landingType: 'HUB' | 'CITY' | 'MULTI_CITY';
  status: string;
  isDeleted: boolean;
  isActive: boolean;
  isIndexable: boolean;
  cityId: string | null;
  parentLandingId: string | null;
  metaTitle: string | null | undefined;
  metaDescription: string | null | undefined;
  heroText: string | null | undefined;
  subtitle: string | null | undefined;
  collectionId: string | null;
  relatedArticleIds: string[];
  relatedCollectionIds: string[];
  resolvedEventsTotal: number;
  childLandingsCount: number;
  citySlug?: string | null;
  canonicalUrl?: string | null;
  siteBaseUrl?: string | null;
};

export function buildLandingHubReadinessSnapshot(input: LandingHubSnapshotInput): HubReadinessSnapshot {
  const path =
    input.landingType === 'CITY' && input.citySlug
      ? `/cities/${input.citySlug}/l/${input.slug}`
      : `/l/${input.slug}`;
  const publicAbs = input.siteBaseUrl ? `${input.siteBaseUrl.replace(/\/$/, '')}${path}` : null;
  const urlStr = input.canonicalUrl ?? publicAbs ?? path;

  const stats = {
    resolvedEventsCount: input.resolvedEventsTotal,
    relatedArticlesCount: input.relatedArticleIds.length,
    relatedCollectionsCount: input.relatedCollectionIds.length,
    childLandingsCount: input.childLandingsCount,
  };

  const base = {
    hubType: 'LANDING_HUB' as HubType,
    entityType: 'LANDING' as const,
    entityId: input.landingId,
    stats,
    urls: { publicUrl: publicAbs ?? path, canonicalUrl: urlStr },
  };

  if (input.isDeleted || input.status === 'ARCHIVED') {
    return {
      ...base,
      status: 'NOT_A_HUB',
      score: null,
      isIndexableTarget: false,
      isCommercialEntryPoint: false,
      issues: [iss('LANDING_HUB_ARCHIVED', 'INFO', 'Лендинг архивирован или удалён', 'PUBLICATION')],
    };
  }

  if (input.status === 'DRAFT') {
    return {
      ...base,
      status: 'DRAFT',
      score: null,
      isIndexableTarget: false,
      isCommercialEntryPoint: false,
      issues: [iss('LANDING_HUB_DRAFT', 'INFO', 'Черновик лендинга', 'PUBLICATION')],
    };
  }

  const issues: HubReadinessIssue[] = [];

  if (!input.isActive) {
    issues.push(iss('LANDING_HUB_INACTIVE', 'ERROR', 'Лендинг выключен', 'PUBLICATION'));
  }
  if (!input.title?.trim()) {
    issues.push(iss('LANDING_HUB_NO_H1', 'ERROR', 'Нет заголовка (H1)', 'SEO'));
  }
  if (!input.metaTitle?.trim()) {
    issues.push(iss('LANDING_HUB_NO_SEO_TITLE', 'ERROR', 'Нет SEO title', 'SEO'));
  }
  if (!input.metaDescription?.trim()) {
    issues.push(iss('LANDING_HUB_NO_SEO_DESCRIPTION', 'ERROR', 'Нет SEO description', 'SEO'));
  }

  if (input.landingType === 'CITY' && !input.cityId) {
    issues.push(iss('LANDING_HUB_CITY_REQUIRED', 'ERROR', 'Для CITY-лендинга нужен город', 'STRUCTURE'));
  }

  if (input.landingType === 'MULTI_CITY' && input.childLandingsCount === 0) {
    issues.push(
      iss(
        'LANDING_HUB_MULTI_CITY_WITHOUT_CHILDREN',
        'ERROR',
        'MULTI_CITY без дочерних городских лендингов',
        'STRUCTURE',
      ),
    );
  }

  if (input.parentLandingId && input.landingType === 'CITY' && !input.cityId) {
    issues.push(iss('LANDING_HUB_INVALID_PARENT', 'WARNING', 'Проверьте иерархию parent/child', 'STRUCTURE'));
  }

  if (input.resolvedEventsTotal === 0) {
    issues.push(iss('LANDING_HUB_EMPTY_RESULTS', 'ERROR', 'Нет событий по резолверу лендинга', 'CATALOG'));
  }

  if (!input.heroText?.trim() && !input.subtitle?.trim()) {
    issues.push(iss('LANDING_HUB_WEAK_HERO', 'WARNING', 'Слабый hero: нет подзаголовка/hero-текста', 'CONTENT'));
  }

  if (!input.collectionId && input.relatedCollectionIds.length === 0) {
    issues.push(
      iss('LANDING_HUB_NO_PRIMARY_COLLECTION', 'WARNING', 'Нет основной подборки / связанных подборок', 'LINKING'),
    );
  }
  if (input.relatedArticleIds.length === 0) {
    issues.push(iss('LANDING_HUB_NO_RELATED_ARTICLE', 'INFO', 'Нет связанных статей', 'LINKING'));
  }

  if (!input.isIndexable) {
    issues.push(iss('LANDING_HUB_NOT_INDEXABLE', 'WARNING', 'Лендинг помечен как неиндексируемый', 'SEO'));
  }

  const st = statusFromEval(issues);
  const score = deriveScore(issues);

  return {
    ...base,
    status: st,
    score,
    issues,
    isIndexableTarget: st === 'READY' && input.isIndexable,
    isCommercialEntryPoint: st === 'READY' || st === 'NEEDS_WORK',
  };
}
