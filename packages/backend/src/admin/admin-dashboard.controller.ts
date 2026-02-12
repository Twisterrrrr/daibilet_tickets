import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
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
    ] = await Promise.all([
      this.prisma.event.count(),
      this.prisma.event.count({ where: { isActive: true } }),
      this.prisma.city.count(),
      this.prisma.tag.count({ where: { isDeleted: false } }),
      this.prisma.article.count({ where: { isDeleted: false } }),
      this.prisma.landingPage.count({ where: { isDeleted: false } }),
      this.prisma.comboPage.count({ where: { isDeleted: false } }),
      this.prisma.package.count(),
      this.prisma.package.count({ where: { status: 'PAID' } }),
    ]);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentOrders = await this.prisma.package.count({
      where: { createdAt: { gte: weekAgo } },
    });

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const revenueResult = await this.prisma.package.aggregate({
      where: { status: { in: ['PAID', 'FULFILLED', 'FULFILLING'] }, paidAt: { gte: monthAgo } },
      _sum: { totalPrice: true },
    });

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
        recentWeek: recentOrders,
      },
      revenue: {
        last30days: revenueResult._sum.totalPrice || 0,
      },
    };
  }
}
