import { ArticleStatus, PackageStatus } from '@/prisma-client';

import { CACHE_TTL } from '../cache/cache.service';
import type { PrismaService } from '../prisma/prisma.service';

import { loadCityAdminListMetrics } from './city-admin-metrics.util';
import type { DashboardSummaryResponse } from './dashboard-summary.types';
import { buildCityHubReadinessSnapshot, loadCityHubBatchAuxMetrics } from './hub-readiness/hub-readiness-snapshot.util';
import type { SeoAuditService } from './seo-audit/seo-audit.service';

const PAID: PackageStatus[] = [
  PackageStatus.PAID,
  PackageStatus.FULFILLING,
  PackageStatus.FULFILLED,
  PackageStatus.PARTIALLY_FULFILLED,
];

/**
 * Сборка операционного дашборда (без кэша — кэш в AdminDashboardService).
 */
export async function buildDashboardSummary(params: {
  prisma: PrismaService;
  seoAudit: SeoAuditService;
}): Promise<DashboardSummaryResponse> {
  const { prisma, seoAudit } = params;
  const now = new Date();
  const siteBase = process.env.PUBLIC_SITE_URL?.replace(/\/$/, '') ?? null;
  const d7 = new Date(now);
  d7.setDate(d7.getDate() - 7);

  const seoSummary = await seoAudit.getUnifiedSummary();

  const [
    totalEvents,
    activeEvents,
    eventsWithIssues,
    venuesTotal,
    venuesDup,
    venuesMissing,
    articlesTotal,
    articlesPublished,
    articlesNoSeo,
    landingsTotal,
    landingsPublished,
    landingsWeakSeo,
    collectionsTotal,
    collectionsPublished,
    collectionsEmpty,
    landIdxYes,
    landIdxNo,
    ticketsOpen,
    ticketsInProgress,
    ticketsHigh,
    chatOpen,
    reviewsPending,
    reviewsNegative,
    packagesStarted,
    packagesPaid7d,
    venueHubTotal,
    landingHubTotal,
    cityHubRows,
  ] = await Promise.all([
    prisma.event.count({ where: { isDeleted: false } }),
    prisma.event.count({ where: { isDeleted: false, isActive: true } }),
    prisma.event.count({
      where: {
        isDeleted: false,
        OR: [
          { moderationStatus: { in: ['PENDING_REVIEW', 'REJECTED', 'DRAFT'] } },
          { canonicalOfId: { not: null } },
          { isActive: false },
        ],
      },
    }),
    prisma.venue.count({ where: { isDeleted: false } }),
    prisma.venue.count({ where: { isDeleted: false, mergeTargetId: { not: null } } }),
    prisma.venue.count({
      where: {
        isDeleted: false,
        OR: [{ address: null }, { address: '' }, { metaTitle: null }, { metaDescription: null }],
      },
    }),
    prisma.article.count({ where: { status: { not: ArticleStatus.ARCHIVED } } }),
    prisma.article.count({ where: { status: ArticleStatus.PUBLISHED } }),
    prisma.article.count({
      where: {
        status: ArticleStatus.PUBLISHED,
        OR: [{ metaTitle: null }, { metaTitle: '' }, { metaDescription: null }, { metaDescription: '' }],
      },
    }),
    prisma.landingPage.count({ where: { isDeleted: false } }),
    prisma.landingPage.count({ where: { isDeleted: false, status: 'ACTIVE', isActive: true } }),
    prisma.landingPage.count({
      where: {
        isDeleted: false,
        status: 'ACTIVE',
        OR: [{ metaTitle: null }, { metaTitle: '' }, { metaDescription: null }, { metaDescription: '' }],
      },
    }),
    prisma.collection.count({ where: { isDeleted: false } }),
    prisma.collection.count({
      where: { isDeleted: false, status: 'ACTIVE', isActive: true },
    }),
    prisma.collection.count({
      where: {
        isDeleted: false,
        isActive: true,
        OR: [{ eventCountCached: null }, { eventCountCached: 0 }],
      },
    }),
    prisma.landingPage.count({
      where: { isDeleted: false, isActive: true, status: 'ACTIVE', isIndexable: true },
    }),
    prisma.landingPage.count({
      where: { isDeleted: false, isActive: true, status: 'ACTIVE', isIndexable: false },
    }),
    prisma.supportTicket.count({
      where: { status: { in: ['OPEN', 'WAITING_CUSTOMER'] } },
    }),
    prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.supportTicket.count({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER'] },
        priority: { in: ['HIGH', 'URGENT'] },
      },
    }),
    prisma.chatConversation.count({ where: { status: 'OPEN' } }),
    prisma.review.count({
      where: { status: { in: ['PENDING', 'PENDING_EMAIL'] } },
    }),
    prisma.review.count({
      where: { status: 'APPROVED', rating: { lte: 2 } },
    }),
    prisma.package.count({
      where: {
        createdAt: { gte: d7 },
        status: { in: [PackageStatus.PENDING_PAYMENT, PackageStatus.FAILED] },
      },
    }),
    prisma.package.count({
      where: { paidAt: { gte: d7 }, status: { in: PAID } },
    }),
    prisma.venue.count({
      where: { isDeleted: false, venuePageMode: 'HUB' },
    }),
    prisma.landingPage.count({
      where: {
        isDeleted: false,
        status: 'ACTIVE',
        landingType: 'MULTI_CITY',
      },
    }),
    prisma.city.findMany({
      where: { isCatalogHub: true, catalogHubStatus: 'ACTIVE' },
      include: {
        _count: {
          select: {
            events: { where: { isDeleted: false } },
            landingPages: { where: { isDeleted: false } },
            collections: true,
          },
        },
      },
      take: 400,
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  const cityIds = cityHubRows.map((c) => c.id);
  let hubReady = 0;
  let hubNeeds = 0;
  let hubBlocked = 0;

  if (cityIds.length > 0) {
    const [metrics, aux] = await Promise.all([
      loadCityAdminListMetrics(prisma, cityIds, now),
      loadCityHubBatchAuxMetrics(prisma, cityIds),
    ]);
    for (const c of cityHubRows) {
      const ec = c._count.events;
      const lc = c._count.landingPages;
      const cc = c._count.collections;
      const activeEv = metrics.activeEvents.get(c.id) ?? 0;
      const snap = buildCityHubReadinessSnapshot({
        cityId: c.id,
        slug: c.slug,
        name: c.name,
        isActive: c.isActive,
        isCatalogHub: c.isCatalogHub,
        catalogHubStatus: c.catalogHubStatus,
        description: c.description,
        heroImage: c.heroImage,
        metaTitle: c.metaTitle,
        metaDescription: c.metaDescription,
        storefrontActiveEvents: activeEv,
        collectionsCount: cc,
        landingsCount: lc,
        publishedArticlesCount: aux.articlesByCity.get(c.id) ?? 0,
        publishedPromoBlocksCount: aux.promoByCity.get(c.id) ?? 0,
        siteBaseUrl: siteBase,
      });
      if (snap.status === 'READY') hubReady += 1;
      else if (snap.status === 'BLOCKED') hubBlocked += 1;
      else hubNeeds += 1;
    }
  }

  const hubsCatalogTotal = cityHubRows.length;

  const [seoEvt, seoVenues, recentTickets] = await Promise.all([
    seoAudit.getUnifiedIssues({
      entityType: 'EVENT',
      onlyIssues: 'true',
      page: '1',
      limit: '12',
    }),
    seoAudit.getUnifiedIssues({
      entityType: 'VENUE',
      onlyIssues: 'true',
      page: '1',
      limit: '8',
    }),
    prisma.supportTicket.findMany({
      where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER'] } },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, shortCode: true, subject: true, priority: true, status: true },
    }),
  ]);

  const attention: DashboardSummaryResponse['attention'] = [];

  const pushSeo = (entityType: 'EVENT' | 'VENUE', items: (typeof seoEvt.items)[number][]) => {
    for (const it of items) {
      const sev: 'ERROR' | 'WARNING' = it.severity === 'ERROR' ? 'ERROR' : 'WARNING';
      const url =
        entityType === 'EVENT'
          ? `/admin-v3/events/${it.entityId}`
          : `/admin-v3/venues/${it.entityId}`;
      attention.push({
        entityType,
        entityId: it.entityId,
        title: it.entityTitle,
        issue: `${it.issueCode}: ${it.message}`,
        severity: sev,
        source: 'SEO_AUDIT',
        url,
      });
    }
  };

  pushSeo('EVENT', seoEvt.items);
  pushSeo('VENUE', seoVenues.items);

  for (const t of recentTickets) {
    attention.push({
      entityType: 'SUPPORT_TICKET',
      entityId: t.id,
      title: t.subject,
      issue: `${t.shortCode} · ${t.status} · ${t.priority}`,
      severity: t.priority === 'URGENT' || t.priority === 'HIGH' ? 'ERROR' : 'WARNING',
      source: 'SUPPORT',
      url: '/admin-v3/tickets',
    });
  }

  attention.sort((a, b) => {
    const o = (x: string) => (x === 'ERROR' ? 0 : 1);
    return o(a.severity) - o(b.severity);
  });

  const articlesWithSeo = Math.max(0, articlesPublished - articlesNoSeo);
  const indexablePages = landIdxYes + articlesWithSeo;
  const nonIndexablePages = landIdxNo + articlesNoSeo;

  return {
    health: {
      hubs: {
        total: hubsCatalogTotal + venueHubTotal + landingHubTotal,
        ready: hubReady,
        needsWork: hubNeeds,
        blocked: hubBlocked,
      },
      catalog: {
        totalEvents,
        activeEvents,
        withIssues: eventsWithIssues,
      },
      venues: {
        total: venuesTotal,
        unresolvedDuplicates: venuesDup,
        missingData: venuesMissing,
      },
      seo: {
        totalIssues: seoSummary.totals.issues,
        errors: seoSummary.totals.errors,
        warnings: seoSummary.totals.warnings,
      },
    },
    activity: {
      traffic: { visits: 0, pageViews: 0 },
      catalog: { eventViews: 0, landingViews: 0, collectionViews: 0 },
      conversions: {
        checkoutStarted: packagesStarted,
        checkoutCompleted: packagesPaid7d,
      },
    },
    content: {
      articles: {
        total: articlesTotal,
        published: articlesPublished,
        withoutSeo: articlesNoSeo,
      },
      landings: {
        total: landingsTotal,
        published: landingsPublished,
        emptyResults: landingsWeakSeo,
      },
      collections: {
        total: collectionsTotal,
        published: collectionsPublished,
        empty: collectionsEmpty,
      },
      indexability: {
        indexablePages,
        nonIndexablePages,
      },
    },
    operations: {
      tickets: {
        open: ticketsOpen,
        inProgress: ticketsInProgress,
        highPriority: ticketsHigh,
      },
      chat: { openConversations: chatOpen },
      reviews: { pending: reviewsPending, negative: reviewsNegative },
    },
    attention: attention.slice(0, 40),
    meta: {
      generatedAt: now.toISOString(),
      cacheTtlSeconds: CACHE_TTL.DASHBOARD_SUMMARY,
      servedFromCache: false,
      hubCitiesEvaluated: cityHubRows.length,
      hubVenuePageHubCount: venueHubTotal,
      hubLandingHubCount: landingHubTotal,
      activityNote:
        'Трафик и просмотры карточек: заглушка до подключения аналитики; оплаченные заказы — за 7 дней.',
    },
  };
}
