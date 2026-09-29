import { Injectable } from '@nestjs/common';
import { OfferStatus, PurchaseType } from '@/prisma-client';

import { PrismaService } from '../prisma/prisma.service';
import { SeoAuditService } from './seo-audit/seo-audit.service';

type ImportedSalesDashboardDto = {
  events: {
    total: number;
    published: number;
    missingCategory: number | null;
    missingVenue: number | null;
    missingPurchaseLink: number | null;
    readyToPublish: number | null;
  };
  landings: {
    total: number;
    published: number;
    missingSeo: number | null;
    withoutMatchedEvents: number | null;
    city: number | null;
    multiCity: number | null;
  };
  imports: {
    openIssues: number | null;
    staleSources: number | null;
  };
  externalOrders: {
    recent: number | null;
    confirmed: number | null;
    pending: number | null;
    cancelled: number | null;
  };
  seo: {
    landingIssues: number | null;
  };
};

@Injectable()
export class AdminImportedSalesDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seoAudit: SeoAuditService,
  ) {}

  async getDashboard(): Promise<ImportedSalesDashboardDto> {
    const now = new Date();
    const d1 = new Date(now);
    d1.setDate(d1.getDate() - 1);

    const [eventsTotal, eventsPublished, eventsMissingVenue] = await Promise.all([
      this.prisma.event.count({ where: { isDeleted: false } }),
      this.prisma.event.count({ where: { isDeleted: false, isActive: true } }),
      this.prisma.event.count({ where: { isDeleted: false, venueId: null } }),
    ]);

    // `Event.category` is a required enum in Prisma; "missing category" signal is not cheaply/meaningfully derivable here.
    const missingCategory: number | null = null;

    // Missing purchase link:
    // - no ACTIVE offers at all (for read-only catalog), OR
    // - has ACTIVE redirect offer with missing deeplink.
    const missingPurchaseLink = await this.prisma.event.count({
      where: {
        isDeleted: false,
        OR: [
          {
            offers: {
              none: {
                isDeleted: false,
                status: OfferStatus.ACTIVE,
              },
            },
          },
          {
            offers: {
              some: {
                isDeleted: false,
                status: OfferStatus.ACTIVE,
                purchaseType: PurchaseType.REDIRECT,
                deeplink: null,
              },
            },
          },
        ],
      },
    });

    const [landingsTotal, landingsPublished, landingsMissingSeo, landingsCity, landingsMultiCity] = await Promise.all([
      this.prisma.landingPage.count({ where: { isDeleted: false } }),
      this.prisma.landingPage.count({ where: { isDeleted: false, status: 'ACTIVE', isActive: true } }),
      this.prisma.landingPage.count({
        where: {
          isDeleted: false,
          status: 'ACTIVE',
          OR: [{ metaTitle: null }, { metaTitle: '' }, { metaDescription: null }, { metaDescription: '' }],
        },
      }),
      this.prisma.landingPage.count({ where: { isDeleted: false, landingType: 'CITY' } }),
      this.prisma.landingPage.count({ where: { isDeleted: false, landingType: 'MULTI_CITY' } }),
    ]);

    // No cheap aggregate exists for "without matched events" (would require resolving each landing selection).
    const withoutMatchedEvents: number | null = null;

    const integrations = await this.prisma.supplierIntegration.findMany({
      where: {
        OR: [
          { adapterCode: { contains: 'ticketscloud', mode: 'insensitive' } },
          { adapterCode: { contains: 'teplohod', mode: 'insensitive' } },
        ],
      },
      select: {
        lastSuccessAt: true,
        openIssuesCountCached: true,
      },
      take: 200,
    });

    const openIssues = integrations.reduce((acc, x) => acc + (x.openIssuesCountCached ?? 0), 0);
    const staleSources = integrations.filter((x) => !x.lastSuccessAt || x.lastSuccessAt.getTime() < d1.getTime()).length;

    const externalOrdersAgg = await this.prisma.externalOrderLink.groupBy({
      by: ['status'],
      where: { createdAt: { gte: d1 } },
      _count: { _all: true },
    });
    const extTotal = externalOrdersAgg.reduce((acc, r) => acc + r._count._all, 0);
    const extConfirmed = externalOrdersAgg.find((r) => r.status === 'CONFIRMED')?._count._all ?? 0;
    const extPending = externalOrdersAgg.find((r) => r.status === 'OPEN')?._count._all ?? 0;
    const extCancelled =
      (externalOrdersAgg.find((r) => r.status === 'CANCELLED')?._count._all ?? 0) +
      (externalOrdersAgg.find((r) => r.status === 'FAILED')?._count._all ?? 0);

    let landingIssues: number | null = null;
    try {
      const seo = await this.seoAudit.getUnifiedSummary();
      const landing = seo.byEntityType?.find((x) => x.entityType === 'LANDING');
      landingIssues = landing ? landing.errors + landing.warnings + landing.info : null;
    } catch {
      landingIssues = null;
    }

    return {
      events: {
        total: eventsTotal,
        published: eventsPublished,
        missingCategory,
        missingVenue: eventsMissingVenue,
        missingPurchaseLink,
        readyToPublish: null,
      },
      landings: {
        total: landingsTotal,
        published: landingsPublished,
        missingSeo: landingsMissingSeo,
        withoutMatchedEvents,
        city: landingsCity,
        multiCity: landingsMultiCity,
      },
      imports: {
        openIssues,
        staleSources,
      },
      externalOrders: {
        recent: extTotal,
        confirmed: extConfirmed,
        pending: extPending,
        cancelled: extCancelled,
      },
      seo: {
        landingIssues,
      },
    };
  }
}

