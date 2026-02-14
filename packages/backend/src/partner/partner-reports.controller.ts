import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ApiKeyGuard } from './partner-auth.guard';

@ApiTags('partner')
@ApiBearerAuth()
@UseGuards(ApiKeyGuard)
@Controller('partner/reports')
export class PartnerReportsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Отчёт по продажам за период.
   */
  @Get('sales')
  @ApiOperation({ summary: 'Продажи за период' })
  async salesReport(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const operatorId = req.user.operatorId;

    const where: any = {
      supplierId: operatorId,
      status: 'PAID',
    };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const payments = await this.prisma.paymentIntent.findMany({
      where,
      select: {
        id: true,
        checkoutSessionId: true,
        grossAmount: true,
        platformFee: true,
        supplierAmount: true,
        commissionRate: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totals = payments.reduce(
      (acc, p) => ({
        grossRevenue: acc.grossRevenue + (p.grossAmount || 0),
        platformFee: acc.platformFee + (p.platformFee || 0),
        netRevenue: acc.netRevenue + (p.supplierAmount || 0),
        count: acc.count + 1,
      }),
      { grossRevenue: 0, platformFee: 0, netRevenue: 0, count: 0 },
    );

    if (format === 'csv' && res) {
      const header = 'id,checkoutSessionId,grossAmount,platformFee,supplierAmount,commissionRate,status,createdAt';
      const rows = payments.map((p) =>
        `${p.id},${p.checkoutSessionId},${p.grossAmount || 0},${p.platformFee || 0},${p.supplierAmount || 0},${p.commissionRate || ''},${p.status},${p.createdAt.toISOString()}`
      );
      const csv = [header, ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="sales-${new Date().toISOString().slice(0, 10)}.csv"`);
      return csv;
    }

    return {
      period: {
        from: from || null,
        to: to || null,
      },
      totals,
      items: payments,
    };
  }
}
