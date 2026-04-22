/**
 * SEO Audit Service — on-the-fly (v1). Structure ready for persistence (v1.1).
 */

import { Injectable } from '@nestjs/common';
import { EventSource, OfferStatus, Prisma } from '@/prisma-client';

import { CacheService, CACHE_TTL } from '../../cache/cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  SeoAuditCityRowDto,
  SeoAuditCitiesResponseDto,
  SeoAuditEventRowDto,
  SeoAuditEventsResponseDto,
  SeoAuditSummaryDto,
  SeoAuditVenueRowDto,
  SeoAuditVenuesResponseDto,
  SeoIssueDto,
  UnifiedSeoAuditEntityIssuesResponseDto,
  UnifiedSeoAuditIssuesResponseDto,
  UnifiedSeoAuditSummaryDto,
  UnifiedSeoEntityType,
  UnifiedSeoIssueListItemDto,
  UnifiedSeoSeverity,
} from './seo-audit.types';
import type { SeoAuditContext, SeoAuditEventInput } from './seo-audit-rules';
import { runAllRules } from './seo-audit-rules';
import { countEntityIssues, runCityRules, runVenueRules } from './seo-audit-entity-rules';
import { runArticleRules, runCollectionRules, runLandingRules } from './seo-audit-content-rules';
import { SubcategoryPolicyService } from '../../subcategories/subcategory-policy.service';

export interface SeoAuditEventsParams {
  search?: string;
  cityId?: string;
  source?: string;
  isActive?: 'true' | 'false';
  hasFutureSessions?: 'true' | 'false';
  onlyIssues?: 'true' | 'false';
  page?: string;
  limit?: string;
}

@Injectable()
export class SeoAuditService {
  constructor(
    private readonly prisma: PrismaService,
    cache?: CacheService,
  ) {
    // Test-friendly: allow constructing service without DI container.
    // In prod Nest injects CacheService; in unit tests we can omit it and run uncached.
    this.cache =
      cache ??
      ({
        getOrSet: async (_k: string, _ttl: number, fn: () => Promise<unknown>) => fn(),
      } as unknown as CacheService);
  }

  private readonly cache: CacheService;
private buildCacheKey(prefix: string, parts: Record<string, string | number | boolean | null | undefined>): string {
    const entries = Object.entries(parts)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .sort(([a], [b]) => a.localeCompare(b));
    const qs = entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
    return qs ? `seo:audit:${prefix}:${qs}` : `seo:audit:${prefix}`;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Unified (soft) endpoints — MVP for Admin V3 SEO Audit UI
  // ────────────────────────────────────────────────────────────────────────────

  async getUnifiedSummary(): Promise<UnifiedSeoAuditSummaryDto> {
    const cacheKey = this.buildCacheKey('summary', {});
    return this.cache.getOrSet(cacheKey, CACHE_TTL.SEO_AUDIT, async () => {
      const now = new Date();
      const maxSub = SubcategoryPolicyService.MAX_EVENT_SUBCATEGORIES;

      // Events: counts by coarse operational issues (fast, DB-level).
      const [
        totalEvents,
        noPhoto,
        noPrice,
        noFutureSessions,
        noSubcategory,
        tooManyLinks,
      ] = await Promise.all([
        this.prisma.event.count({ where: { isDeleted: false } }),
        this.prisma.event.count({
          where: {
            isDeleted: false,
            imageUrl: null,
            OR: [{ override: null }, { override: { imageUrl: null } }],
          },
        }),
        this.prisma.event.count({
          where: {
            isDeleted: false,
            NOT: {
              offers: {
                some: {
                  isDeleted: false,
                  status: OfferStatus.ACTIVE,
                  priceFrom: { gt: 0 },
                },
              },
            },
          },
        }),
        this.prisma.event.count({
          where: {
            isDeleted: false,
            isActive: true,
            NOT: {
              sessions: {
                some: {
                  isActive: true,
                  canceledAt: null,
                  startsAt: { gt: now },
                },
              },
            },
          },
        }),
        this.prisma.event.count({
          where: {
            isDeleted: false,
            AND: [
              { subcategoryLinks: { none: {} } },
              { subcategories: { equals: [] } },
            ],
          },
        }),
        this.prisma.eventSubcategoryLink
          .groupBy({
            by: ['eventId'],
            where: { event: { isDeleted: false } },
            _count: { _all: true },
          })
          .then((rows) => rows.filter((r) => r._count._all > maxSub).length),
      ]);

      // Cities / Venues: lightweight (gate-3 style).
      const [citiesAudit, venuesAudit] = await Promise.all([
        this.getCitiesAudit({ onlyIssues: 'true', page: '1', limit: '1000' }),
        this.getVenuesAudit({ onlyIssues: 'true', page: '1', limit: '1000' }),
      ]);

      // Content entities: minimal cheap counts (DB-level), keep stable semantics for existing EVENT/VENUE/CITY.
      const [articlesTotal, articlesMetaTitleMissing, articlesMetaDescMissing, articlesPublishedWithoutSeo] = await Promise.all([
        this.prisma.article.count({ where: { status: { not: 'ARCHIVED' as any } } }),
        this.prisma.article.count({ where: { status: { not: 'ARCHIVED' as any }, OR: [{ metaTitle: null }, { metaTitle: { equals: '' } }] } }),
        this.prisma.article.count({ where: { status: { not: 'ARCHIVED' as any }, OR: [{ metaDescription: null }, { metaDescription: { equals: '' } }] } }),
        this.prisma.article.count({
          where: {
            status: 'PUBLISHED' as any,
            OR: [
              { metaTitle: null },
              { metaTitle: { equals: '' } },
              { metaDescription: null },
              { metaDescription: { equals: '' } },
            ],
          },
        }),
      ]);

      const [landingsTotal, landingsMetaTitleMissing, landingsMetaDescMissing, landingsFilterTagMissing, landingsPublishedWithoutSeo] = await Promise.all([
        this.prisma.landingPage.count({ where: { isDeleted: false } }),
        this.prisma.landingPage.count({ where: { isDeleted: false, OR: [{ metaTitle: null }, { metaTitle: { equals: '' } }] } }),
        this.prisma.landingPage.count({ where: { isDeleted: false, OR: [{ metaDescription: null }, { metaDescription: { equals: '' } }] } }),
        this.prisma.landingPage.count({ where: { isDeleted: false, filterTagId: null } }),
        this.prisma.landingPage.count({
          where: {
            isDeleted: false,
            status: 'ACTIVE' as any,
            OR: [
              { metaTitle: null },
              { metaTitle: { equals: '' } },
              { metaDescription: null },
              { metaDescription: { equals: '' } },
            ],
          },
        }),
      ]);

      const [collectionsTotal, collectionsMetaTitleMissing, collectionsMetaDescMissing, collectionsPublishedWithoutSeo] = await Promise.all([
        this.prisma.collection.count({ where: { isDeleted: false } }),
        this.prisma.collection.count({ where: { isDeleted: false, OR: [{ metaTitle: null }, { metaTitle: { equals: '' } }] } }),
        this.prisma.collection.count({ where: { isDeleted: false, OR: [{ metaDescription: null }, { metaDescription: { equals: '' } }] } }),
        this.prisma.collection.count({
          where: {
            isDeleted: false,
            status: 'ACTIVE' as any,
            OR: [
              { metaTitle: null },
              { metaTitle: { equals: '' } },
              { metaDescription: null },
              { metaDescription: { equals: '' } },
            ],
          },
        }),
      ]);
      const [collectionsNoTagFilters, collectionsNoLegacyTagSlugs] = await Promise.all([
        this.prisma.collection.count({ where: { isDeleted: false, tagFilters: { none: {} } } }),
        this.prisma.collection.count({ where: { isDeleted: false, filterTags: { equals: [] } } }),
      ]);
      const collectionsTagFiltersMissing = Math.min(collectionsNoTagFilters, collectionsNoLegacyTagSlugs);

      const issueBuckets: Array<{ issueCode: string; severity: UnifiedSeoSeverity; total: number; entityType: UnifiedSeoEntityType }> = [
        { issueCode: 'NO_PHOTO', severity: 'WARN', total: noPhoto, entityType: 'EVENT' },
        { issueCode: 'NO_PRICE', severity: 'ERROR', total: noPrice, entityType: 'EVENT' },
        { issueCode: 'NO_FUTURE_SESSIONS', severity: 'ERROR', total: noFutureSessions, entityType: 'EVENT' },
        { issueCode: 'NO_SUBCATEGORY', severity: 'WARN', total: noSubcategory, entityType: 'EVENT' },
        { issueCode: 'TOO_MANY_SUBCATEGORIES', severity: 'WARN', total: tooManyLinks, entityType: 'EVENT' },

        { issueCode: 'META_TITLE_MISSING', severity: 'WARN', total: articlesMetaTitleMissing, entityType: 'ARTICLE' },
        { issueCode: 'META_DESC_MISSING', severity: 'WARN', total: articlesMetaDescMissing, entityType: 'ARTICLE' },
        { issueCode: 'PUBLISHED_WITHOUT_SEO', severity: 'ERROR', total: articlesPublishedWithoutSeo, entityType: 'ARTICLE' },

        { issueCode: 'META_TITLE_MISSING', severity: 'WARN', total: landingsMetaTitleMissing, entityType: 'LANDING' },
        { issueCode: 'META_DESC_MISSING', severity: 'WARN', total: landingsMetaDescMissing, entityType: 'LANDING' },
        { issueCode: 'FILTER_TAG_MISSING', severity: 'WARN', total: landingsFilterTagMissing, entityType: 'LANDING' },
        { issueCode: 'PUBLISHED_WITHOUT_SEO', severity: 'ERROR', total: landingsPublishedWithoutSeo, entityType: 'LANDING' },

        { issueCode: 'META_TITLE_MISSING', severity: 'WARN', total: collectionsMetaTitleMissing, entityType: 'COLLECTION' },
        { issueCode: 'META_DESC_MISSING', severity: 'WARN', total: collectionsMetaDescMissing, entityType: 'COLLECTION' },
        { issueCode: 'TAG_FILTERS_MISSING', severity: 'WARN', total: collectionsTagFiltersMissing, entityType: 'COLLECTION' },
        { issueCode: 'PUBLISHED_WITHOUT_SEO', severity: 'ERROR', total: collectionsPublishedWithoutSeo, entityType: 'COLLECTION' },
      ];

      const byIssueCode = issueBuckets
        .filter((x) => x.total > 0)
        .map((x) => ({ issueCode: x.issueCode, total: x.total }))
        .sort((a, b) => b.total - a.total);

      const eventErrors = issueBuckets.filter((x) => x.entityType === 'EVENT' && x.severity === 'ERROR').reduce((s, x) => s + x.total, 0);
      const eventWarnings = issueBuckets.filter((x) => x.entityType === 'EVENT' && x.severity === 'WARN').reduce((s, x) => s + x.total, 0);
      const eventInfo = 0;

      const cityErrors = citiesAudit.summary.issuesBySeverity.ERROR;
      const cityWarnings = citiesAudit.summary.issuesBySeverity.WARN;
      const cityInfo = citiesAudit.summary.issuesBySeverity.INFO;

      const venueErrors = venuesAudit.summary.issuesBySeverity.ERROR;
      const venueWarnings = venuesAudit.summary.issuesBySeverity.WARN;
      const venueInfo = venuesAudit.summary.issuesBySeverity.INFO;

      const articleErrors = articlesPublishedWithoutSeo;
      const articleWarnings = articlesMetaTitleMissing + articlesMetaDescMissing;
      const articleInfo = 0;

      const landingErrors = landingsPublishedWithoutSeo;
      const landingWarnings = landingsMetaTitleMissing + landingsMetaDescMissing + landingsFilterTagMissing;
      const landingInfo = 0;

      const collectionErrors = collectionsPublishedWithoutSeo;
      const collectionWarnings = collectionsMetaTitleMissing + collectionsMetaDescMissing + collectionsTagFiltersMissing;
      const collectionInfo = 0;

      const totals = {
        errors: eventErrors + cityErrors + venueErrors + articleErrors + landingErrors + collectionErrors,
        warnings: eventWarnings + cityWarnings + venueWarnings + articleWarnings + landingWarnings + collectionWarnings,
        info: eventInfo + cityInfo + venueInfo + articleInfo + landingInfo + collectionInfo,
        issues:
          eventErrors +
          eventWarnings +
          eventInfo +
          cityErrors +
          cityWarnings +
          cityInfo +
          venueErrors +
          venueWarnings +
          venueInfo +
          articleErrors +
          articleWarnings +
          articleInfo +
          landingErrors +
          landingWarnings +
          landingInfo +
          collectionErrors +
          collectionWarnings +
          collectionInfo,
      };

      return {
        totals,
        byEntityType: [
          { entityType: 'EVENT', total: eventErrors + eventWarnings + eventInfo, errors: eventErrors, warnings: eventWarnings, info: eventInfo },
          { entityType: 'CITY', total: cityErrors + cityWarnings + cityInfo, errors: cityErrors, warnings: cityWarnings, info: cityInfo },
          { entityType: 'VENUE', total: venueErrors + venueWarnings + venueInfo, errors: venueErrors, warnings: venueWarnings, info: venueInfo },
          { entityType: 'ARTICLE', total: articleErrors + articleWarnings + articleInfo, errors: articleErrors, warnings: articleWarnings, info: articleInfo },
          { entityType: 'LANDING', total: landingErrors + landingWarnings + landingInfo, errors: landingErrors, warnings: landingWarnings, info: landingInfo },
          { entityType: 'COLLECTION', total: collectionErrors + collectionWarnings + collectionInfo, errors: collectionErrors, warnings: collectionWarnings, info: collectionInfo },
        ],
        byIssueCode,
      };
    });
  }

  async getUnifiedIssues(params: {
    entityType?: string;
    severity?: string;
    issueCode?: string;
    search?: string;
    cityId?: string;
    onlyIssues?: 'true' | 'false';
    page?: string;
    limit?: string;
  }): Promise<UnifiedSeoAuditIssuesResponseDto> {
    const cacheKey = this.buildCacheKey('issues', params);
    return this.cache.getOrSet(cacheKey, CACHE_TTL.SEO_AUDIT, () => this.getUnifiedIssuesUncached(params));
  }

  private async getUnifiedIssuesUncached(params: {
    entityType?: string;
    severity?: string;
    issueCode?: string;
    search?: string;
    cityId?: string;
    onlyIssues?: 'true' | 'false';
    page?: string;
    limit?: string;
  }): Promise<UnifiedSeoAuditIssuesResponseDto> {
    const entityType = (params.entityType ?? 'EVENT').toUpperCase();
    if (entityType === 'CITY') {
      const res = await this.getCitiesAudit({ onlyIssues: params.onlyIssues, page: params.page, limit: params.limit });
      const items: UnifiedSeoIssueListItemDto[] = [];
      for (const c of res.items) {
        for (const i of c.issues) {
          items.push({
            entityType: 'CITY',
            entityId: c.id,
            entityTitle: c.name,
            entitySlug: c.slug,
            issueCode: i.code,
            severity: i.severity as UnifiedSeoSeverity,
            message: i.message,
            updatedAt: c.updatedAt,
          });
        }
      }
      return { items, total: items.length, page: res.page, pages: res.pages };
    }

    if (entityType === 'VENUE') {
      const res = await this.getVenuesAudit({ cityId: params.cityId, onlyIssues: params.onlyIssues, page: params.page, limit: params.limit });
      const items: UnifiedSeoIssueListItemDto[] = [];
      for (const v of res.items) {
        for (const i of v.issues) {
          items.push({
            entityType: 'VENUE',
            entityId: v.id,
            entityTitle: v.title,
            entitySlug: v.slug,
            cityName: v.cityName,
            issueCode: i.code,
            severity: i.severity as UnifiedSeoSeverity,
            message: i.message,
            updatedAt: v.updatedAt,
          });
        }
      }
      return { items, total: items.length, page: res.page, pages: res.pages };
    }

    if (entityType === 'ARTICLE') {
      const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(params.limit || '50', 10) || 50));
      const onlyIssues = params.onlyIssues !== 'false';

      const where: Prisma.ArticleWhereInput = { status: { not: 'ARCHIVED' as any } };
      if (params.search?.trim()) {
        const q = params.search.trim();
        where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }];
      }

      const [total, rows] = await Promise.all([
        this.prisma.article.count({ where }),
        this.prisma.article.findMany({
          where,
          select: { id: true, title: true, slug: true, metaTitle: true, metaDescription: true, status: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      const items: UnifiedSeoIssueListItemDto[] = [];
      for (const a of rows) {
        const issuesForEntity = runArticleRules({
          status: a.status as any,
          metaTitle: a.metaTitle,
          metaDescription: a.metaDescription,
        });

        const filtered = issuesForEntity.filter((i) => {
          if (params.issueCode && i.code !== params.issueCode) return false;
          if (params.severity && i.severity !== params.severity) return false;
          return true;
        });

        if (onlyIssues && filtered.length === 0) continue;

        for (const i of filtered) {
          items.push({
            entityType: 'ARTICLE',
            entityId: a.id,
            entityTitle: a.title,
            entitySlug: a.slug,
            issueCode: i.code,
            severity: i.severity,
            message: i.message,
            updatedAt: a.updatedAt,
          });
        }
      }

      return {
        items,
        total: onlyIssues ? items.length : total,
        page,
        pages: onlyIssues ? 1 : Math.ceil(total / limit),
      };
    }

    if (entityType === 'LANDING') {
      const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(params.limit || '50', 10) || 50));
      const onlyIssues = params.onlyIssues !== 'false';

      const where: Prisma.LandingPageWhereInput = { isDeleted: false };
      if (params.search?.trim()) {
        const q = params.search.trim();
        where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }];
      }
      if (params.cityId) where.cityId = params.cityId;

      const [total, rows] = await Promise.all([
        this.prisma.landingPage.count({ where }),
        this.prisma.landingPage.findMany({
          where,
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            metaTitle: true,
            metaDescription: true,
            filterTagId: true,
            updatedAt: true,
            city: { select: { name: true } },
          },
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      const items: UnifiedSeoIssueListItemDto[] = [];
      for (const l of rows) {
        const issuesForEntity = runLandingRules({
          status: l.status as any,
          metaTitle: l.metaTitle,
          metaDescription: l.metaDescription,
          filterTagId: l.filterTagId,
        });

        const filtered = issuesForEntity.filter((i) => {
          if (params.issueCode && i.code !== params.issueCode) return false;
          if (params.severity && i.severity !== params.severity) return false;
          return true;
        });

        if (onlyIssues && filtered.length === 0) continue;

        for (const i of filtered) {
          items.push({
            entityType: 'LANDING',
            entityId: l.id,
            entityTitle: l.title,
            entitySlug: l.slug,
            cityName: l.city?.name ?? null,
            issueCode: i.code,
            severity: i.severity,
            message: i.message,
            updatedAt: l.updatedAt,
          });
        }
      }

      return {
        items,
        total: onlyIssues ? items.length : total,
        page,
        pages: onlyIssues ? 1 : Math.ceil(total / limit),
      };
    }

    if (entityType === 'COLLECTION') {
      const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(params.limit || '50', 10) || 50));
      const onlyIssues = params.onlyIssues !== 'false';

      const where: Prisma.CollectionWhereInput = { isDeleted: false };
      if (params.search?.trim()) {
        const q = params.search.trim();
        where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }];
      }
      if (params.cityId) where.cityId = params.cityId;

      const [total, rows] = await Promise.all([
        this.prisma.collection.count({ where }),
        this.prisma.collection.findMany({
          where,
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            metaTitle: true,
            metaDescription: true,
            filterTags: true,
            updatedAt: true,
            city: { select: { name: true } },
            _count: { select: { tagFilters: true } },
          },
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      const items: UnifiedSeoIssueListItemDto[] = [];
      for (const c of rows) {
        const issuesForEntity = runCollectionRules({
          status: String(c.status ?? ''),
          metaTitle: c.metaTitle,
          metaDescription: c.metaDescription,
          tagFiltersCount: c._count.tagFilters,
          legacyFilterTagsCount: Array.isArray(c.filterTags) ? c.filterTags.length : 0,
        });

        const filtered = issuesForEntity.filter((i) => {
          if (params.issueCode && i.code !== params.issueCode) return false;
          if (params.severity && i.severity !== params.severity) return false;
          return true;
        });

        if (onlyIssues && filtered.length === 0) continue;

        for (const i of filtered) {
          items.push({
            entityType: 'COLLECTION',
            entityId: c.id,
            entityTitle: c.title,
            entitySlug: c.slug,
            cityName: c.city?.name ?? null,
            issueCode: i.code,
            severity: i.severity,
            message: i.message,
            updatedAt: c.updatedAt,
          });
        }
      }

      return {
        items,
        total: onlyIssues ? items.length : total,
        page,
        pages: onlyIssues ? 1 : Math.ceil(total / limit),
      };
    }

    // EVENT (soft operational issues + taxonomy issues, links-first with legacy fallback)
    const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || '50', 10) || 50));
    const onlyIssues = params.onlyIssues !== 'false';
    const now = new Date();
    const maxSub = SubcategoryPolicyService.MAX_EVENT_SUBCATEGORIES;

    const where: Prisma.EventWhereInput = { isDeleted: false };
    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (params.cityId) where.cityId = params.cityId;

    const [total, rows] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          imageUrl: true,
          subcategories: true,
          isActive: true,
          updatedAt: true,
          city: { select: { name: true } },
          override: { select: { imageUrl: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const ids = rows.map((r) => r.id);
    const [futureSessions, pricedOffers, linkCounts] = await Promise.all([
      this.prisma.eventSession.groupBy({
        by: ['eventId'],
        where: {
          eventId: { in: ids },
          isActive: true,
          canceledAt: null,
          startsAt: { gt: now },
        },
        _count: { id: true },
      }),
      this.prisma.eventOffer.groupBy({
        by: ['eventId'],
        where: {
          eventId: { in: ids },
          isDeleted: false,
          status: OfferStatus.ACTIVE,
          priceFrom: { gt: 0 },
        },
        _count: { id: true },
      }),
      this.prisma.eventSubcategoryLink.groupBy({
        by: ['eventId'],
        where: { eventId: { in: ids } },
        _count: { _all: true },
      }),
    ]);

    const futureById = new Map(futureSessions.map((r) => [r.eventId, r._count.id]));
    const pricedById = new Map(pricedOffers.map((r) => [r.eventId, r._count.id]));
    const linksById = new Map(linkCounts.map((r) => [r.eventId, r._count._all]));

    const items: UnifiedSeoIssueListItemDto[] = [];
    for (const e of rows) {
      const effImage = e.override?.imageUrl ?? e.imageUrl;
      const hasImage = Boolean(effImage);
      const hasFuture = (futureById.get(e.id) ?? 0) > 0;
      const hasPrice = (pricedById.get(e.id) ?? 0) > 0;
      const linksCount = linksById.get(e.id) ?? 0;
      const legacyCount = Array.isArray(e.subcategories) ? e.subcategories.length : 0;
      const hasSub = linksCount > 0 || legacyCount > 0;

      const issuesForEntity: Array<{ code: string; severity: UnifiedSeoSeverity; message: string }> = [];

      if (!hasImage) issuesForEntity.push({ code: 'NO_PHOTO', severity: 'WARN', message: 'Нет фото' });
      if (!hasPrice) issuesForEntity.push({ code: 'NO_PRICE', severity: 'ERROR', message: 'Нет цены (нет активного оффера с priceFrom>0)' });
      if (e.isActive && !hasFuture) issuesForEntity.push({ code: 'NO_FUTURE_SESSIONS', severity: 'ERROR', message: 'Нет будущих активных сеансов' });
      if (!hasSub) issuesForEntity.push({ code: 'NO_SUBCATEGORY', severity: 'WARN', message: 'Нет подкатегории (links-first, fallback на legacy)' });
      if (linksCount > maxSub || (linksCount === 0 && legacyCount > maxSub)) {
        issuesForEntity.push({ code: 'TOO_MANY_SUBCATEGORIES', severity: 'WARN', message: `Слишком много подкатегорий (макс. ${maxSub})` });
      }

      // Apply filters at issue-level
      const filtered = issuesForEntity.filter((i) => {
        if (params.issueCode && i.code !== params.issueCode) return false;
        if (params.severity && i.severity !== params.severity) return false;
        return true;
      });

      if (onlyIssues && filtered.length === 0) continue;

      for (const i of filtered) {
        items.push({
          entityType: 'EVENT',
          entityId: e.id,
          entityTitle: e.title,
          entitySlug: e.slug,
          cityName: e.city?.name ?? null,
          issueCode: i.code,
          severity: i.severity,
          message: i.message,
          updatedAt: e.updatedAt,
        });
      }
    }

    return {
      items,
      total: onlyIssues ? items.length : total,
      page,
      pages: onlyIssues ? 1 : Math.ceil(total / limit),
    };
  }

  async getUnifiedEntityIssues(params: {
    entityType: string;
    entityId: string;
  }): Promise<UnifiedSeoAuditEntityIssuesResponseDto> {
    const cacheKey = this.buildCacheKey('entity', { entityType: params.entityType, entityId: params.entityId });
    return this.cache.getOrSet(cacheKey, CACHE_TTL.SEO_AUDIT, () => this.getUnifiedEntityIssuesUncached(params));
  }

  private async getUnifiedEntityIssuesUncached(params: {
    entityType: string;
    entityId: string;
  }): Promise<UnifiedSeoAuditEntityIssuesResponseDto> {
    const entityType = params.entityType.toUpperCase();
    if (entityType === 'CITY') {
      const c = await this.prisma.city.findUnique({
        where: { id: params.entityId },
        select: { id: true, slug: true, name: true, description: true, metaTitle: true, metaDescription: true, updatedAt: true, isActive: true },
      });
      if (!c) return { entityType: 'CITY', entityId: params.entityId, issues: [] };
      const issues = runCityRules({ description: c.description, metaTitle: c.metaTitle, metaDescription: c.metaDescription }).map((i) => ({
        entityType: 'CITY' as const,
        entityId: c.id,
        entityTitle: c.name,
        entitySlug: c.slug,
        issueCode: i.code,
        severity: i.severity as UnifiedSeoSeverity,
        message: i.message,
        updatedAt: c.updatedAt,
      }));
      return { entityType: 'CITY', entityId: c.id, issues };
    }

    if (entityType === 'VENUE') {
      const v = await this.prisma.venue.findUnique({
        where: { id: params.entityId },
        select: { id: true, slug: true, title: true, description: true, metaTitle: true, metaDescription: true, updatedAt: true, city: { select: { name: true } } },
      });
      if (!v) return { entityType: 'VENUE', entityId: params.entityId, issues: [] };
      const issues = runVenueRules({ description: v.description, metaTitle: v.metaTitle, metaDescription: v.metaDescription }).map((i) => ({
        entityType: 'VENUE' as const,
        entityId: v.id,
        entityTitle: v.title,
        entitySlug: v.slug,
        cityName: v.city?.name ?? null,
        issueCode: i.code,
        severity: i.severity as UnifiedSeoSeverity,
        message: i.message,
        updatedAt: v.updatedAt,
      }));
      return { entityType: 'VENUE', entityId: v.id, issues };
    }

    if (entityType === 'ARTICLE') {
      const a = await this.prisma.article.findUnique({
        where: { id: params.entityId },
        select: { id: true, slug: true, title: true, metaTitle: true, metaDescription: true, status: true, updatedAt: true },
      });
      if (!a) return { entityType: 'ARTICLE', entityId: params.entityId, issues: [] };
      const issues = runArticleRules({ status: a.status as any, metaTitle: a.metaTitle, metaDescription: a.metaDescription }).map((i) => ({
        entityType: 'ARTICLE' as const,
        entityId: a.id,
        entityTitle: a.title,
        entitySlug: a.slug,
        issueCode: i.code,
        severity: i.severity,
        message: i.message,
        updatedAt: a.updatedAt,
      }));
      return { entityType: 'ARTICLE', entityId: a.id, issues };
    }

    if (entityType === 'LANDING') {
      const l = await this.prisma.landingPage.findUnique({
        where: { id: params.entityId },
        select: { id: true, slug: true, title: true, status: true, metaTitle: true, metaDescription: true, filterTagId: true, updatedAt: true, city: { select: { name: true } } },
      });
      if (!l) return { entityType: 'LANDING', entityId: params.entityId, issues: [] };
      const issues = runLandingRules({ status: l.status as any, metaTitle: l.metaTitle, metaDescription: l.metaDescription, filterTagId: l.filterTagId }).map((i) => ({
        entityType: 'LANDING' as const,
        entityId: l.id,
        entityTitle: l.title,
        entitySlug: l.slug,
        cityName: l.city?.name ?? null,
        issueCode: i.code,
        severity: i.severity,
        message: i.message,
        updatedAt: l.updatedAt,
      }));
      return { entityType: 'LANDING', entityId: l.id, issues };
    }

    if (entityType === 'COLLECTION') {
      const c = await this.prisma.collection.findUnique({
        where: { id: params.entityId },
        select: { id: true, slug: true, title: true, status: true, metaTitle: true, metaDescription: true, filterTags: true, updatedAt: true, city: { select: { name: true } }, _count: { select: { tagFilters: true } } },
      });
      if (!c) return { entityType: 'COLLECTION', entityId: params.entityId, issues: [] };
      const issues = runCollectionRules({
        status: String(c.status ?? ''),
        metaTitle: c.metaTitle,
        metaDescription: c.metaDescription,
        tagFiltersCount: c._count.tagFilters,
        legacyFilterTagsCount: Array.isArray(c.filterTags) ? c.filterTags.length : 0,
      }).map((i) => ({
        entityType: 'COLLECTION' as const,
        entityId: c.id,
        entityTitle: c.title,
        entitySlug: c.slug,
        cityName: c.city?.name ?? null,
        issueCode: i.code,
        severity: i.severity,
        message: i.message,
        updatedAt: c.updatedAt,
      }));
      return { entityType: 'COLLECTION', entityId: c.id, issues };
    }

    // EVENT
    const e = await this.prisma.event.findUnique({
      where: { id: params.entityId },
      select: { id: true, title: true, slug: true, imageUrl: true, subcategories: true, isActive: true, updatedAt: true, city: { select: { name: true } }, override: { select: { imageUrl: true } } },
    });
    if (!e) return { entityType: 'EVENT', entityId: params.entityId, issues: [] };

    const now = new Date();
    const maxSub = SubcategoryPolicyService.MAX_EVENT_SUBCATEGORIES;
    const [futureCount, pricedOffersCount, linksCount] = await Promise.all([
      this.prisma.eventSession.count({ where: { eventId: e.id, isActive: true, canceledAt: null, startsAt: { gt: now } } }),
      this.prisma.eventOffer.count({ where: { eventId: e.id, isDeleted: false, status: OfferStatus.ACTIVE, priceFrom: { gt: 0 } } }),
      this.prisma.eventSubcategoryLink.count({ where: { eventId: e.id } }),
    ]);

    const legacyCount = Array.isArray(e.subcategories) ? e.subcategories.length : 0;
    const effImage = e.override?.imageUrl ?? e.imageUrl;
    const hasImage = Boolean(effImage);
    const hasPrice = pricedOffersCount > 0;
    const hasFuture = futureCount > 0;
    const hasSub = linksCount > 0 || legacyCount > 0;

    const issues: UnifiedSeoIssueListItemDto[] = [];
    if (!hasImage) issues.push({ entityType: 'EVENT', entityId: e.id, entityTitle: e.title, entitySlug: e.slug, cityName: e.city?.name ?? null, issueCode: 'NO_PHOTO', severity: 'WARN', message: 'Нет фото', updatedAt: e.updatedAt });
    if (!hasPrice) issues.push({ entityType: 'EVENT', entityId: e.id, entityTitle: e.title, entitySlug: e.slug, cityName: e.city?.name ?? null, issueCode: 'NO_PRICE', severity: 'ERROR', message: 'Нет цены (нет активного оффера с priceFrom>0)', updatedAt: e.updatedAt });
    if (e.isActive && !hasFuture) issues.push({ entityType: 'EVENT', entityId: e.id, entityTitle: e.title, entitySlug: e.slug, cityName: e.city?.name ?? null, issueCode: 'NO_FUTURE_SESSIONS', severity: 'ERROR', message: 'Нет будущих активных сеансов', updatedAt: e.updatedAt });
    if (!hasSub) issues.push({ entityType: 'EVENT', entityId: e.id, entityTitle: e.title, entitySlug: e.slug, cityName: e.city?.name ?? null, issueCode: 'NO_SUBCATEGORY', severity: 'WARN', message: 'Нет подкатегории (links-first, fallback на legacy)', updatedAt: e.updatedAt });
    if (linksCount > maxSub || (linksCount === 0 && legacyCount > maxSub)) issues.push({ entityType: 'EVENT', entityId: e.id, entityTitle: e.title, entitySlug: e.slug, cityName: e.city?.name ?? null, issueCode: 'TOO_MANY_SUBCATEGORIES', severity: 'WARN', message: `Слишком много подкатегорий (макс. ${maxSub})`, updatedAt: e.updatedAt });

    return { entityType: 'EVENT', entityId: e.id, issues };
  }

  async getEventsAudit(params: SeoAuditEventsParams): Promise<SeoAuditEventsResponseDto> {
    const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || '20', 10) || 20));
    const onlyIssues = params.onlyIssues !== 'false';
    const now = new Date();

    const where: Prisma.EventWhereInput = {
      isDeleted: false,
    };

    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (params.cityId) where.cityId = params.cityId;
    if (params.source) where.source = params.source as EventSource;
    if (params.isActive === 'true') where.isActive = true;
    if (params.isActive === 'false') where.isActive = false;

    if (params.hasFutureSessions === 'true') {
      where.sessions = {
        some: {
          isActive: true,
          canceledAt: null,
          startsAt: { gt: now },
        },
      };
    } else if (params.hasFutureSessions === 'false') {
      where.NOT = {
        sessions: {
          some: {
            isActive: true,
            canceledAt: null,
            startsAt: { gt: now },
          },
        },
      };
    }

    const [total, events] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          shortDescription: true,
          imageUrl: true,
          priceFrom: true,
          rating: true,
          durationMinutes: true,
          minAge: true,
          groupingKey: true,
          canonicalOfId: true,
          cityId: true,
          source: true,
          isActive: true,
          updatedAt: true,
          city: { select: { name: true } },
        },
        orderBy: { updatedAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    if (events.length === 0) {
      return {
        items: [],
        total: 0,
        page,
        pages: 0,
        summary: {
          totalEvents: await this.prisma.event.count({ where: { isDeleted: false } }),
          eventsWithIssues: 0,
          issuesTotal: 0,
          issuesBySeverity: { ERROR: 0, WARN: 0, INFO: 0 },
        },
      };
    }

    const ids = events.map((e) => e.id);
    const slugs = events.map((e) => e.slug);
    const groupingKeys = [...new Set(events.map((e) => e.groupingKey).filter(Boolean) as string[])];

    const [sessionsCounts, slugCounts, canonicalMap, groupingCountMap] = await Promise.all([
      this.getSessionsFutureCount(ids, now),
      this.getSlugCounts(slugs),
      groupingKeys.length > 0 ? this.getCanonicalByGroupingKey(groupingKeys) : Promise.resolve(new Map<string, string>()),
      groupingKeys.length > 0 ? this.getGroupingCounts(groupingKeys) : Promise.resolve(new Map<string, number>()),
    ]);

    const rows: SeoAuditEventRowDto[] = [];
    let eventsWithIssues = 0;
    const severityCounts = { ERROR: 0, WARN: 0, INFO: 0 };

    for (const e of events) {
      const input: SeoAuditEventInput = {
        id: e.id,
        title: e.title,
        slug: e.slug,
        description: e.description,
        shortDescription: e.shortDescription,
        metaTitle: null,
        metaDescription: null,
        imageUrl: e.imageUrl,
        priceFrom: e.priceFrom,
        rating: e.rating != null ? Number(e.rating) : null,
        durationMinutes: e.durationMinutes,
        minAge: e.minAge,
        groupingKey: e.groupingKey,
        canonicalOfId: e.canonicalOfId,
        cityId: e.cityId,
        cityName: e.city?.name ?? null,
        source: e.source,
        isActive: e.isActive,
        updatedAt: e.updatedAt,
      };

      const ctx: SeoAuditContext = {
        sessionsFutureCount: sessionsCounts.get(e.id) ?? 0,
        dupSlugCount: slugCounts.get(e.slug) ?? 1,
        canonicalEventId: e.groupingKey ? canonicalMap.get(e.groupingKey) ?? null : null,
        groupingCount: e.groupingKey ? groupingCountMap.get(e.groupingKey) ?? 1 : 0,
      };

      const issues = runAllRules(input, ctx);

      if (onlyIssues && issues.length === 0) continue;

      const issueCounts = countIssues(issues);
      rows.push({
        id: e.id,
        title: e.title,
        slug: e.slug,
        cityName: e.city?.name ?? '',
        source: e.source,
        isActive: e.isActive,
        updatedAt: e.updatedAt,
        priceFrom: e.priceFrom,
        imageUrl: e.imageUrl,
        rating: e.rating != null ? Number(e.rating) : null,
        sessionsFutureCount: ctx.sessionsFutureCount,
        canonicalGroup:
          e.groupingKey
            ? {
                groupingKey: e.groupingKey,
                canonicalEventId: ctx.canonicalEventId,
                isCanonical: ctx.canonicalEventId === e.id,
              }
            : undefined,
        issues,
        issueCounts,
      });

      if (issues.length > 0) {
        eventsWithIssues++;
        for (const i of issues) {
          if (i.severity === 'ERROR') severityCounts.ERROR++;
          else if (i.severity === 'WARN') severityCounts.WARN++;
          else severityCounts.INFO++;
        }
      }
    }

    rows.sort((a, b) => {
      if (a.issueCounts.ERROR !== b.issueCounts.ERROR) return b.issueCounts.ERROR - a.issueCounts.ERROR;
      if (a.issueCounts.WARN !== b.issueCounts.WARN) return b.issueCounts.WARN - a.issueCounts.WARN;
      return a.updatedAt.getTime() - b.updatedAt.getTime();
    });

    const totalEvents = await this.prisma.event.count({ where: { isDeleted: false } });
    const summary: SeoAuditSummaryDto = {
      totalEvents,
      eventsWithIssues,
      issuesTotal: severityCounts.ERROR + severityCounts.WARN + severityCounts.INFO,
      issuesBySeverity: severityCounts,
    };

    return {
      items: rows,
      total: onlyIssues ? rows.length : total,
      page,
      pages: onlyIssues ? 1 : Math.ceil(total / limit),
      summary,
    };
  }

  private async getSessionsFutureCount(
    eventIds: string[],
    now: Date,
  ): Promise<Map<string, number>> {
    const result = await this.prisma.eventSession.groupBy({
      by: ['eventId'],
      where: {
        eventId: { in: eventIds },
        isActive: true,
        canceledAt: null,
        startsAt: { gt: now },
      },
      _count: { id: true },
    });
    const map = new Map<string, number>();
    for (const r of result) map.set(r.eventId, r._count.id);
    return map;
  }

  private async getSlugCounts(slugs: string[]): Promise<Map<string, number>> {
    if (slugs.length === 0) return new Map();
    const result = await this.prisma.event.groupBy({
      by: ['slug'],
      where: {
        slug: { in: slugs },
        isDeleted: false,
      },
      _count: { id: true },
    });
    const map = new Map<string, number>();
    for (const r of result) map.set(r.slug, r._count.id);
    return map;
  }

  private async getCanonicalByGroupingKey(keys: string[]): Promise<Map<string, string>> {
    const events = await this.prisma.event.findMany({
      where: { groupingKey: { in: keys }, isDeleted: false },
      select: { id: true, groupingKey: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const map = new Map<string, string>();
    for (const e of events) {
      if (e.groupingKey && !map.has(e.groupingKey)) map.set(e.groupingKey, e.id);
    }
    return map;
  }

  private async getGroupingCounts(keys: string[]): Promise<Map<string, number>> {
    const result = await this.prisma.event.groupBy({
      by: ['groupingKey'],
      where: { groupingKey: { in: keys }, isDeleted: false },
      _count: { id: true },
    });
    const map = new Map<string, number>();
    for (const r of result)
      if (r.groupingKey) map.set(r.groupingKey, r._count.id);
    return map;
  }

  async getCitiesAudit(params: {
    onlyIssues?: 'true' | 'false';
    page?: string;
    limit?: string;
  }): Promise<SeoAuditCitiesResponseDto> {
    const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || '50', 10) || 50));
    const onlyIssues = params.onlyIssues !== 'false';

    const [total, cities] = await Promise.all([
      this.prisma.city.count({ where: { isActive: true } }),
      this.prisma.city.findMany({
        where: { isActive: true },
        select: { id: true, slug: true, name: true, description: true, metaTitle: true, metaDescription: true, updatedAt: true },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const rows: SeoAuditCityRowDto[] = [];
    let withIssues = 0;
    const severityCounts = { ERROR: 0, WARN: 0, INFO: 0 };

    for (const c of cities) {
      const issues = runCityRules({
        description: c.description,
        metaTitle: c.metaTitle,
        metaDescription: c.metaDescription,
      });
      if (onlyIssues && issues.length === 0) continue;

      const issueCounts = countEntityIssues(issues);
      rows.push({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        metaTitle: c.metaTitle,
        metaDescription: c.metaDescription,
        updatedAt: c.updatedAt,
        issues,
        issueCounts,
      });
      if (issues.length > 0) {
        withIssues++;
        for (const i of issues) {
          if (i.severity === 'ERROR') severityCounts.ERROR++;
          else if (i.severity === 'WARN') severityCounts.WARN++;
          else severityCounts.INFO++;
        }
      }
    }

    rows.sort((a, b) => {
      if (a.issueCounts.ERROR !== b.issueCounts.ERROR) return b.issueCounts.ERROR - a.issueCounts.ERROR;
      if (a.issueCounts.WARN !== b.issueCounts.WARN) return b.issueCounts.WARN - a.issueCounts.WARN;
      return a.name.localeCompare(b.name);
    });

    const totalCities = await this.prisma.city.count({ where: { isActive: true } });
    return {
      items: rows,
      total: onlyIssues ? rows.length : total,
      page,
      pages: onlyIssues ? 1 : Math.ceil(total / limit),
      summary: {
        total: totalCities,
        withIssues,
        issuesTotal: severityCounts.ERROR + severityCounts.WARN + severityCounts.INFO,
        issuesBySeverity: severityCounts,
      },
    };
  }

  async getVenuesAudit(params: {
    cityId?: string;
    onlyIssues?: 'true' | 'false';
    page?: string;
    limit?: string;
  }): Promise<SeoAuditVenuesResponseDto> {
    const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || '50', 10) || 50));
    const onlyIssues = params.onlyIssues !== 'false';

    const where = { isActive: true, isDeleted: false };
    if (params.cityId) Object.assign(where, { cityId: params.cityId });

    const [total, venues] = await Promise.all([
      this.prisma.venue.count({ where }),
      this.prisma.venue.findMany({
        where,
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          metaTitle: true,
          metaDescription: true,
          updatedAt: true,
          city: { select: { name: true } },
        },
        orderBy: { title: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const rows: SeoAuditVenueRowDto[] = [];
    let withIssues = 0;
    const severityCounts = { ERROR: 0, WARN: 0, INFO: 0 };

    for (const v of venues) {
      const issues = runVenueRules({
        description: v.description,
        metaTitle: v.metaTitle,
        metaDescription: v.metaDescription,
      });
      if (onlyIssues && issues.length === 0) continue;

      const issueCounts = countEntityIssues(issues);
      rows.push({
        id: v.id,
        slug: v.slug,
        title: v.title,
        cityName: v.city?.name ?? '',
        description: v.description,
        metaTitle: v.metaTitle,
        metaDescription: v.metaDescription,
        updatedAt: v.updatedAt,
        issues,
        issueCounts,
      });
      if (issues.length > 0) {
        withIssues++;
        for (const i of issues) {
          if (i.severity === 'ERROR') severityCounts.ERROR++;
          else if (i.severity === 'WARN') severityCounts.WARN++;
          else severityCounts.INFO++;
        }
      }
    }

    rows.sort((a, b) => {
      if (a.issueCounts.ERROR !== b.issueCounts.ERROR) return b.issueCounts.ERROR - a.issueCounts.ERROR;
      if (a.issueCounts.WARN !== b.issueCounts.WARN) return b.issueCounts.WARN - a.issueCounts.WARN;
      return a.title.localeCompare(b.title);
    });

    const totalVenues = await this.prisma.venue.count({ where });
    return {
      items: rows,
      total: onlyIssues ? rows.length : total,
      page,
      pages: onlyIssues ? 1 : Math.ceil(total / limit),
      summary: {
        total: totalVenues,
        withIssues,
        issuesTotal: severityCounts.ERROR + severityCounts.WARN + severityCounts.INFO,
        issuesBySeverity: severityCounts,
      },
    };
  }
}

function countIssues(issues: SeoIssueDto[]): {
  ERROR: number;
  WARN: number;
  INFO: number;
  total: number;
} {
  let ERROR = 0,
    WARN = 0,
    INFO = 0;
  for (const i of issues) {
    if (i.severity === 'ERROR') ERROR++;
    else if (i.severity === 'WARN') WARN++;
    else INFO++;
  }
  return { ERROR, WARN, INFO, total: issues.length };
}
