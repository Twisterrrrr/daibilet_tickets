import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RequestWithUser, SupplierAuthUser } from '../auth/auth.types';

import { PrismaService } from '../prisma/prisma.service';
import { SupplierJwtGuard } from './supplier.guard';

@ApiTags('supplier')
@ApiBearerAuth()
@UseGuards(SupplierJwtGuard)
@Controller('supplier/dashboard')
export class SupplierDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Dashboard поставщика' })
  async dashboard(@Req() req: RequestWithUser<SupplierAuthUser>) {
    const operatorId = req.user.operatorId;

    const [totalEvents, activeEvents, pendingEvents, totalOffers, operator] = await Promise.all([
      this.prisma.event.count({ where: { operatorId } }),
      this.prisma.event.count({ where: { operatorId, isActive: true } }),
      this.prisma.event.count({ where: { operatorId, moderationStatus: 'PENDING_REVIEW' } }),
      this.prisma.eventOffer.count({ where: { operatorId } }),
      this.prisma.operator.findUnique({
        where: { id: operatorId },
        select: {
          name: true,
          trustLevel: true,
          commissionRate: true,
          promoRate: true,
          promoUntil: true,
          successfulSales: true,
          verifiedAt: true,
        },
      }),
    ]);

    // Продажи через PaymentIntent
    const payments = await this.prisma.paymentIntent.aggregate({
      where: { supplierId: operatorId, status: 'PAID' },
      _sum: { grossAmount: true, platformFee: true, supplierAmount: true },
      _count: { id: true },
    });

    return {
      operator,
      events: { total: totalEvents, active: activeEvents, pending: pendingEvents },
      offers: { total: totalOffers },
      sales: {
        totalOrders: payments._count.id,
        grossRevenue: payments._sum.grossAmount || 0,
        platformFee: payments._sum.platformFee || 0,
        netRevenue: payments._sum.supplierAmount || 0,
      },
    };
  }
}
