import { Injectable, Logger } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';

import { OperationLatencyTrackerService } from '../common/operation-latency-tracker.service';
import { PrismaService } from '../prisma/prisma.service';

const ANALYTICS_TABS_ENDPOINT = 'GET /admin/dashboard/analytics-tabs';

function startOfUtcDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function utcDaysInclusive(a: Date, b: Date): number {
  const sa = startOfUtcDay(a).getTime();
  const sb = startOfUtcDay(b).getTime();
  return Math.floor((sb - sa) / 86400000) + 1;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly latency: OperationLatencyTrackerService,
  ) {}

  private async timePromise<T>(queryName: string, work: Promise<T>): Promise<T> {
    const t0 = Date.now();
    try {
      return await work;
    } finally {
      const durationMs = Date.now() - t0;
      this.latency.recordAnalyticsQueryDuration(durationMs, {
        endpoint: ANALYTICS_TABS_ENDPOINT,
        query: queryName,
      });
      if (durationMs >= 100) {
        this.logger.log(
          JSON.stringify({
            msg: 'analytics.query.duration',
            endpoint: ANALYTICS_TABS_ENDPOINT,
            query: queryName,
            durationMs,
          }),
        );
      }
    }
  }

  /** Ленивая форма: без ломки вывода типов у Prisma `groupBy` при явном `T`. */
  private async timePromiseFn<T>(queryName: string, work: () => Promise<T>): Promise<T> {
    return this.timePromise(queryName, work());
  }

  preaggMarketingWindow(): { start: Date; end: Date } {
    const end = startOfUtcDay(new Date());
    end.setUTCDate(end.getUTCDate() - 1);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 29);
    return { start, end };
  }

  async isPreaggCompleteForRange(start: Date, end: Date): Promise<boolean> {
    const expected = utcDaysInclusive(start, end);
    const rows = await this.prisma.dailyEventStats.groupBy({
      by: ['statDate'],
      where: { statDate: { gte: start, lte: end } },
    });
    return rows.length >= expected;
  }

  /**
   * Пересчёт одного календарного дня UTC (для BullMQ). Идempotентно: delete + insert.
   */
  async rebuildDailyEventStatsForDate(statDateUTC: Date): Promise<{ rows: number }> {
    const start = startOfUtcDay(statDateUTC);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    await this.prisma.dailyEventStats.deleteMany({ where: { statDate: start } });

    const raw = await this.prisma.$queryRaw<Array<{ eventId: string; soldCount: bigint; revenue: bigint }>>(
      Prisma.sql`
        SELECT pi."eventId",
          COUNT(*)::bigint AS "soldCount",
          COALESCE(SUM(pi.subtotal), 0)::bigint AS revenue
        FROM package_items pi
        INNER JOIN packages p ON p.id = pi."packageId"
        WHERE p.status IN ('PAID', 'FULFILLING', 'FULFILLED', 'PARTIALLY_FULFILLED')
          AND COALESCE(p."paidAt", p."createdAt") >= ${start}
          AND COALESCE(p."paidAt", p."createdAt") < ${end}
        GROUP BY pi."eventId"
      `,
    );

    if (raw.length === 0) {
      return { rows: 0 };
    }

    await this.prisma.dailyEventStats.createMany({
      data: raw.map((r) => ({
        statDate: start,
        eventId: r.eventId,
        soldCount: Number(r.soldCount),
        revenue: Number(r.revenue),
      })),
    });

    return { rows: raw.length };
  }

  async computeAnalyticsTabs(sinceDays: number): Promise<{
    tabs: {
      content: {
        qualityCards: { value: number; suffix: string; hint: string };
        citiesCoverage: { value: number; suffix: string; hint: string };
        popularCategories: { value: number; suffix: string; hint: string };
      };
      operations: {
        recentOrders: { value: number; suffix: string; hint: string };
        paymentIssues: { value: number; suffix: string; hint: string };
        refundsAndCancels: { value: number; suffix: string; hint: string };
      };
      marketing: {
        eventsConversion: { value: number; suffix: string; hint: string };
        promoEfficiency: { value: number; suffix: string; hint: string };
        popularTopics: { value: number; suffix: string; hint: string };
      };
    };
    analyticsMeta: { popularTopicsSource: 'preagg' | 'live'; preaggWindowComplete: boolean };
  }> {
    const now = new Date();
    const dOp = new Date(now);
    dOp.setDate(dOp.getDate() - sinceDays);
    const d30 = new Date(now);
    d30.setDate(d30.getDate() - 30);

    const { start: preaggStart, end: preaggEnd } = this.preaggMarketingWindow();
    const preaggWindowComplete = await this.isPreaggCompleteForRange(preaggStart, preaggEnd);

    const [
      activeEvents,
      qualityIssues,
      activeCities,
      categoriesAgg,
      recentOrdersCount,
      paymentIssuesCount,
      refundedCount,
    ] = await Promise.all([
      this.timePromise(
        'prisma.event.count.active',
        this.prisma.event.count({ where: { isActive: true, isDeleted: false } }),
      ),
      this.timePromise(
        'prisma.event.count.qualityIssues',
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
      ),
      this.timePromise(
        'prisma.city.count.withActiveEvents',
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
      ),
      this.timePromise(
        'prisma.event.groupBy.categories',
        this.prisma.event.groupBy({
          by: ['category'],
          where: { isActive: true, isDeleted: false },
          _count: { category: true },
          orderBy: { _count: { category: 'desc' } },
          take: 3,
        }),
      ),
      this.timePromise(
        'prisma.package.count.sinceDays',
        this.prisma.package.count({ where: { createdAt: { gte: dOp } } }),
      ),
      this.timePromise(
        'prisma.paymentIntent.count.issues',
        this.prisma.paymentIntent.count({
          where: {
            createdAt: { gte: dOp },
            status: { in: [PaymentStatus.FAILED, PaymentStatus.CANCELLED] },
          },
        }),
      ),
      this.timePromise(
        'prisma.paymentIntent.count.refunded30d',
        this.prisma.paymentIntent.count({
          where: {
            createdAt: { gte: d30 },
            status: PaymentStatus.REFUNDED,
          },
        }),
      ),
    ]);

    const paidIntents30d = await this.timePromise(
      'prisma.paymentIntent.count.paid30d',
      this.prisma.paymentIntent.count({
        where: { createdAt: { gte: d30 }, status: PaymentStatus.PAID },
      }),
    );

    const conversionBase30d = await this.timePromise(
      'prisma.paymentIntent.count.all30d',
      this.prisma.paymentIntent.count({ where: { createdAt: { gte: d30 } } }),
    );

    const promoIntentsRow = await this.timePromise(
      'raw.checkout_sessions.promoSnapshot30d',
      this.prisma.$queryRaw<{ cnt: bigint }[]>`
        SELECT COUNT(*)::bigint AS cnt
        FROM "checkout_sessions"
        WHERE "createdAt" >= ${d30}
          AND "appliedPromoCodeSnapshot" IS NOT NULL
      `,
    );
    const promoIntents30d = Number(promoIntentsRow[0]?.cnt ?? 0n);

    const { topTopics30d, popularTopicsSource } = await (async () => {
      if (preaggWindowComplete) {
        const topEvents = await this.timePromise(
          'prisma.dailyEventStats.groupBy.topEvents',
          this.prisma.dailyEventStats.groupBy({
            by: ['eventId'],
            where: { statDate: { gte: preaggStart, lte: preaggEnd } },
            _sum: { soldCount: true },
            orderBy: { _sum: { soldCount: 'desc' } },
            take: 500,
          }),
        );
        const eventIds = topEvents.map((r) => r.eventId);
        if (eventIds.length === 0) {
          const rows = await this.timePromiseFn('prisma.eventTag.groupBy.fullScan', () =>
            this.prisma.eventTag.groupBy({
              by: ['tagId'] as const,
              _count: { tagId: true },
              orderBy: { _count: { tagId: 'desc' } },
              take: 3,
            }),
          );
          return { topTopics30d: rows, popularTopicsSource: 'live' as const };
        }
        const rows = await this.timePromiseFn('prisma.eventTag.groupBy.scopedPreagg', () =>
          this.prisma.eventTag.groupBy({
            by: ['tagId'] as const,
            where: { eventId: { in: eventIds } },
            _count: { tagId: true },
            orderBy: { _count: { tagId: 'desc' } },
            take: 3,
          }),
        );
        return { topTopics30d: rows, popularTopicsSource: 'preagg' as const };
      }
      const rows = await this.timePromiseFn('prisma.eventTag.groupBy.fullScan', () =>
        this.prisma.eventTag.groupBy({
          by: ['tagId'] as const,
          _count: { tagId: true },
          orderBy: { _count: { tagId: 'desc' } },
          take: 3,
        }),
      );
      return { topTopics30d: rows, popularTopicsSource: 'live' as const };
    })();

    const topTopicIds = topTopics30d.map((x) => x.tagId);
    const topTopicNames =
      topTopicIds.length > 0
        ? await this.timePromise(
            'prisma.tag.findMany.topTopics',
            this.prisma.tag.findMany({ where: { id: { in: topTopicIds } }, select: { id: true, name: true } }),
          )
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
        return `${tag?.name ?? 'Тег'} (${row._count?.tagId ?? 0})`;
      })
      .join(', ');

    const tabs = {
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
          hint: `Новых заказов за ${sinceDays} дн.`,
        },
        paymentIssues: {
          value: paymentIssuesCount,
          suffix: '',
          hint: `Ошибки и отмены платежей за ${sinceDays} дн.`,
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
          hint: `${paidIntents30d} оплаченных из ${conversionBase30d} платежных попыток (30 дн.)`,
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

    return {
      tabs,
      analyticsMeta: { popularTopicsSource, preaggWindowComplete },
    };
  }
}
