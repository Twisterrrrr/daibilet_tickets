import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PackageItemStatus, PackageStatus } from '@prisma/client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly prisma: PrismaService) {}

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
