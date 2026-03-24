import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PackageItemStatus, PackageStatus, PaymentStatus } from '@prisma/client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('analytics-tabs')
  async getAnalyticsTabs() {
    const now = new Date();
    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 7);
    const d30 = new Date(now);
    d30.setDate(d30.getDate() - 30);

    const paidStatuses: PackageStatus[] = [
      PackageStatus.PAID,
      PackageStatus.FULFILLING,
      PackageStatus.FULFILLED,
      PackageStatus.PARTIALLY_FULFILLED,
    ];

    const [activeEvents, qualityIssues, activeCities, categoriesAgg, recentOrdersCount, paymentIssuesCount, refundedCount] =
      await Promise.all([
        this.prisma.event.count({ where: { isActive: true, isDeleted: false } }),
        this.prisma.event.count({
          where: {
            isActive: true,
            isDeleted: false,
            OR: [
              { imageUrl: null },
              { shortDescription: null },
              { shortDescription: '' },
              { offers: { none: {} } },
              {
                sessions: {
                  none: {
                    startsAt: { gte: now },
                    canceledAt: null,
                  },
                },
              },
            ],
          },
        }),
        this.prisma.city.count({
          where: {
            events: {
              some: {
                isActive: true,
                isDeleted: false,
              },
            },
          },
        }),
        this.prisma.event.groupBy({
          by: ['category'],
          where: { isActive: true, isDeleted: false },
          _count: { category: true },
          orderBy: { _count: { category: 'desc' } },
          take: 3,
        }),
        this.prisma.package.count({ where: { createdAt: { gte: d7 } } }),
        this.prisma.paymentIntent.count({
          where: {
            createdAt: { gte: d7 },
            status: { in: [PaymentStatus.FAILED, PaymentStatus.CANCELLED] },
          },
        }),
        this.prisma.paymentIntent.count({
          where: {
            createdAt: { gte: d30 },
            status: PaymentStatus.REFUNDED,
          },
        }),
      ]);

    const paidIntents30d = await this.prisma.paymentIntent.count({
      where: { createdAt: { gte: d30 }, status: PaymentStatus.PAID },
    });
    const conversionBase30d = await this.prisma.paymentIntent.count({ where: { createdAt: { gte: d30 } } });
    const promoIntentsRow = await this.prisma.$queryRaw<{ cnt: bigint }[]>`
      SELECT COUNT(*)::bigint AS cnt
      FROM "checkout_sessions"
      WHERE "createdAt" >= ${d30}
        AND "appliedPromoCodeSnapshot" IS NOT NULL
    `;
    const promoIntents30d = Number(promoIntentsRow[0]?.cnt ?? 0n);
    const topTopics30d = await this.prisma.eventTag.groupBy({
      by: ['tagId'],
      _count: { tagId: true },
      orderBy: { _count: { tagId: 'desc' } },
      take: 3,
    });
    const topTopicIds = topTopics30d.map((x) => x.tagId);
    const topTopicNames =
      topTopicIds.length > 0
        ? await this.prisma.tag.findMany({ where: { id: { in: topTopicIds } }, select: { id: true, name: true } })
        : [];

    const readyCards = Math.max(activeEvents - qualityIssues, 0);
    const qualityPercent = activeEvents > 0 ? Math.round((readyCards / activeEvents) * 100) : 0;
    const conversionPercent = conversionBase30d > 0 ? Math.round((paidIntents30d / conversionBase30d) * 100) : 0;
    const promoPercent = paidIntents30d > 0 ? Math.round((promoIntents30d / paidIntents30d) * 100) : 0;
    const topCategoriesLabel = categoriesAgg
      .map((row) => `${row.category} (${row._count.category})`)
      .join(', ');
    const topTopicsLabel = topTopics30d
      .map((row) => {
        const tag = topTopicNames.find((t) => t.id === row.tagId);
        return `${tag?.name ?? 'Тег'} (${row._count.tagId})`;
      })
      .join(', ');

    return {
      content: {
        qualityCards: {
          value: qualityPercent,
          suffix: '%',
          hint: `${readyCards} из ${activeEvents} карточек готовы к публикации`,
        },
        citiesCoverage: {
          value: activeCities,
          suffix: '',
          hint: 'Городов с активными предложениями',
        },
        popularCategories: {
          value: categoriesAgg.length,
          suffix: '',
          hint: topCategoriesLabel || 'Недостаточно данных',
        },
      },
      operations: {
        recentOrders: {
          value: recentOrdersCount,
          suffix: '',
          hint: 'Новых заказов за 7 дней',
        },
        paymentIssues: {
          value: paymentIssuesCount,
          suffix: '',
          hint: 'Ошибки и отмены платежей за 7 дней',
        },
        refundsAndCancels: {
          value: refundedCount,
          suffix: '',
          hint: 'Возвратов за 30 дней',
        },
      },
      marketing: {
        eventsConversion: {
          value: conversionPercent,
          suffix: '%',
          hint: `${paidIntents30d} оплаченных из ${conversionBase30d} платежных попыток`,
        },
        promoEfficiency: {
          value: promoPercent,
          suffix: '%',
          hint: 'Доля оплаченных заказов с промокодом за 30 дней',
        },
        popularTopics: {
          value: topTopics30d.length,
          suffix: '',
          hint: topTopicsLabel || 'Недостаточно данных',
        },
      },
    };
  }

  @Get('attention')
  async getAttentionSummary() {
    const now = new Date();

    const activeEventsWhere = {
      isActive: true,
      isDeleted: false,
    } as const;

    const [
      noSessions,
      noPrice,
      rejectedModeration,
      pendingModeration,
      draftOrHidden,
      lowListingHealth,
    ] = await Promise.all([
      this.prisma.event.count({
        where: {
          ...activeEventsWhere,
          dateMode: 'SCHEDULED',
          sessions: {
            none: {
              startsAt: { gte: now },
              canceledAt: null,
            },
          },
        },
      }),
      this.prisma.event.count({
        where: {
          ...activeEventsWhere,
          OR: [
            { offers: { none: {} } },
            {
              offers: {
                every: {
                  OR: [{ priceFrom: null }, { priceFrom: { lte: 0 } }],
                },
              },
            },
          ],
        },
      }),
      this.prisma.event.count({ where: { moderationStatus: 'REJECTED', isDeleted: false } }),
      this.prisma.event.count({
        where: {
          moderationStatus: { in: ['PENDING_REVIEW', 'AUTO_APPROVED'] },
          isDeleted: false,
        },
      }),
      this.prisma.event.count({
        where: {
          isDeleted: false,
          OR: [{ moderationStatus: 'DRAFT' }, { isActive: false }],
        },
      }),
      this.prisma.event.count({
        where: {
          ...activeEventsWhere,
          OR: [
            { imageUrl: null },
            { shortDescription: null },
            { shortDescription: '' },
            { offers: { none: {} } },
            {
              sessions: {
                none: {
                  startsAt: { gte: now },
                  canceledAt: null,
                },
              },
            },
          ],
        },
      }),
    ]);

    return {
      noSessions,
      noPrice,
      rejectedModeration,
      pendingModeration,
      draftOrHidden,
      lowListingHealth,
    };
  }

  @Get('stats')
  async getStats() {
    const now = new Date();

    // Период: текущие 30 дней и предыдущие 30 дней
    const d30 = new Date(now);
    d30.setDate(d30.getDate() - 30);
    const d60 = new Date(now);
    d60.setDate(d60.getDate() - 60);

    const paidStatuses: PackageStatus[] = [
      PackageStatus.PAID,
      PackageStatus.FULFILLING,
      PackageStatus.FULFILLED,
      PackageStatus.PARTIALLY_FULFILLED,
    ];

    // Параллельные запросы для основных метрик
    const [
      eventsTotal,
      eventsActive,
      citiesTotal,
      tagsTotal,
      articlesTotal,
      landingsTotal,
      combosTotal,
      packagesTotal,
      packagesPaid,
      // Revenue 30d
      revenue30dAgg,
      // Revenue prev 30d
      revenuePrev30dAgg,
      // Tickets sold 30d
      ticketsSold30d,
      ticketsSoldPrev30d,
      // Events created in last 30d
      eventsCreated30d,
      eventsCreatedPrev30d,
      // Pending reviews
      pendingReviews,
      // Recent orders
      recentOrders,
      // Top events (by number of package items)
      topEventItems,
    ] = await Promise.all([
      this.prisma.event.count(),
      this.prisma.event.count({ where: { isActive: true } }),
      this.prisma.city.count(),
      this.prisma.tag.count({ where: { isDeleted: false } }),
      this.prisma.article.count({ where: { isDeleted: false } }),
      this.prisma.landingPage.count({ where: { isDeleted: false } }),
      this.prisma.comboPage.count({ where: { isDeleted: false } }),
      this.prisma.package.count(),
      this.prisma.package.count({ where: { status: { in: paidStatuses } } }),
      // Revenue current 30d
      this.prisma.package.aggregate({
        where: { status: { in: paidStatuses }, paidAt: { gte: d30 } },
        _sum: { totalPrice: true },
      }),
      // Revenue previous 30d
      this.prisma.package.aggregate({
        where: { status: { in: paidStatuses }, paidAt: { gte: d60, lt: d30 } },
        _sum: { totalPrice: true },
      }),
      // Orders (tickets) in current 30d
      this.prisma.package.count({
        where: { status: { in: paidStatuses }, paidAt: { gte: d30 } },
      }),
      // Orders (tickets) in previous 30d
      this.prisma.package.count({
        where: { status: { in: paidStatuses }, paidAt: { gte: d60, lt: d30 } },
      }),
      // New active events in 30d
      this.prisma.event.count({
        where: { isActive: true, createdAt: { gte: d30 } },
      }),
      // Events created prev 30d
      this.prisma.event.count({
        where: { isActive: true, createdAt: { gte: d60, lt: d30 } },
      }),
      // Pending reviews
      this.prisma.review.count({ where: { status: 'PENDING' } }),
      // Recent 10 orders
      this.prisma.package.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          code: true,
          customerName: true,
          email: true,
          totalPrice: true,
          status: true,
          createdAt: true,
          paidAt: true,
          city: { select: { name: true } },
        },
      }),
      // Top events by package item count (past 30d)
      this.prisma.packageItem.groupBy({
        by: ['eventId'],
        where: {
          createdAt: { gte: d30 },
          status: { in: [PackageItemStatus.BOOKED, PackageItemStatus.CONFIRMED] },
        },
        _count: { eventId: true },
        orderBy: { _count: { eventId: 'desc' } },
        take: 5,
      }),
    ]);

    // Fetch event details for top events
    const topEventIds = topEventItems.map((e) => e.eventId);
    const topEventsDetails =
      topEventIds.length > 0
        ? await this.prisma.event.findMany({
            where: { id: { in: topEventIds } },
            select: { id: true, title: true, slug: true, category: true, imageUrl: true },
          })
        : [];
    const topEvents = topEventItems.map((item) => {
      const ev = topEventsDetails.find((e) => e.id === item.eventId);
      return {
        eventId: item.eventId,
        title: ev?.title || 'Неизвестно',
        slug: ev?.slug || '',
        category: ev?.category || null,
        imageUrl: ev?.imageUrl || null,
        salesCount: item._count.eventId,
      };
    });

    // Revenue by day (past 30 days) — raw query for grouping
    const revenueByDay = await this.getRevenueByDay(d30);

    // Sales by category
    const salesByCategory = await this.getSalesByCategory();

    // Calculate trends
    const rev30d = revenue30dAgg._sum.totalPrice || 0;
    const revPrev30d = revenuePrev30dAgg._sum.totalPrice || 0;

    function calcTrend(current: number, previous: number): number {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 1000) / 10; // one decimal
    }

    return {
      events: { total: eventsTotal, active: eventsActive },
      cities: citiesTotal,
      tags: tagsTotal,
      articles: articlesTotal,
      landings: landingsTotal,
      combos: combosTotal,
      orders: {
        total: packagesTotal,
        paid: packagesPaid,
      },
      // Stat cards data
      revenue30d: rev30d,
      revenueTrend: calcTrend(rev30d, revPrev30d),
      ticketsSold30d,
      ticketsSoldTrend: calcTrend(ticketsSold30d, ticketsSoldPrev30d),
      activeEvents: eventsActive,
      activeEventsTrend: calcTrend(eventsCreated30d, eventsCreatedPrev30d),
      pendingReviews,
      // Charts
      revenueByDay,
      salesByCategory,
      // Lists
      topEvents,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        code: o.code,
        customer: o.customerName,
        email: o.email,
        amount: o.totalPrice,
        status: o.status,
        date: o.createdAt,
        paidAt: o.paidAt,
        city: o.city.name,
      })),
    };
  }

  private async getRevenueByDay(since: Date): Promise<{ date: string; revenue: number }[]> {
    try {
      const rows: { day: Date; total: bigint }[] = await this.prisma.$queryRaw`
        SELECT DATE("paidAt") as day, COALESCE(SUM("totalPrice"), 0) as total
        FROM "packages"
        WHERE "paidAt" >= ${since}
          AND "status" IN ('PAID', 'FULFILLING', 'FULFILLED', 'PARTIALLY_FULFILLED')
        GROUP BY DATE("paidAt")
        ORDER BY day ASC
      `;
      return rows.map((r) => ({
        date: new Date(r.day).toISOString().split('T')[0],
        revenue: Number(r.total),
      }));
    } catch {
      return [];
    }
  }

  private async getSalesByCategory(): Promise<{ category: string; count: number }[]> {
    try {
      const rows: { category: string; count: bigint }[] = await this.prisma.$queryRaw`
        SELECT e."category", COUNT(pi.id) as count
        FROM "package_items" pi
        JOIN "events" e ON pi."eventId" = e.id
        WHERE pi."status" IN ('BOOKED', 'CONFIRMED')
        GROUP BY e."category"
        ORDER BY count DESC
      `;
      return rows.map((r) => ({
        category: r.category,
        count: Number(r.count),
      }));
    } catch {
      return [];
    }
  }
}
