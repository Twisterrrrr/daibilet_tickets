import { BadRequestException, Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RequestWithUser, SupplierAuthUser } from '../auth/auth.types';
import type { Response } from 'express';

import { streamCsv } from '../common/csv-stream.util';
import { PrismaService } from '../prisma/prisma.service';
import { SupplierJwtGuard } from './supplier.guard';

@ApiTags('supplier')
@ApiBearerAuth()
@UseGuards(SupplierJwtGuard)
@Controller('supplier/reports')
export class SupplierReportsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Отчёт о продажах за период.
   */
  @Get('sales')
  @ApiOperation({ summary: 'Отчёт о продажах' })
  async salesReport(
    @Req() req: RequestWithUser<SupplierAuthUser>,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') pageRaw = '1',
    @Query('limit') limitRaw = '50',
  ) {
    const operatorId = req.user.operatorId;
    const page = Number(pageRaw) || 1;
    const limit = Math.min(Number(limitRaw) || 50, 200);

    const where: any = { supplierId: operatorId, status: 'PAID' };
    if (from || to) {
      where.paidAt = {};
      if (from) where.paidAt.gte = new Date(from);
      if (to) where.paidAt.lte = new Date(to);
    }

    const [items, total, aggregate] = await Promise.all([
      this.prisma.paymentIntent.findMany({
        where,
        include: {
          checkoutSession: {
            select: {
              shortCode: true,
              customerName: true,
              customerEmail: true,
              offersSnapshot: true,
            },
          },
        },
        orderBy: { paidAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.paymentIntent.count({ where }),
      this.prisma.paymentIntent.aggregate({
        where,
        _sum: { grossAmount: true, platformFee: true, supplierAmount: true },
        _count: { id: true },
      }),
    ]);

    return {
      items: items.map((i) => ({
        id: i.id,
        date: i.paidAt,
        shortCode: i.checkoutSession.shortCode,
        customerName: i.checkoutSession.customerName,
        grossAmount: i.grossAmount,
        platformFee: i.platformFee,
        supplierAmount: i.supplierAmount,
        commissionRate: i.commissionRate,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
      summary: {
        totalOrders: aggregate._count.id,
        grossRevenue: aggregate._sum.grossAmount || 0,
        platformFee: aggregate._sum.platformFee || 0,
        netRevenue: aggregate._sum.supplierAmount || 0,
      },
    };
  }

  /**
   * CSV экспорт продаж (с обязательной фильтрацией по дате, максимум 93 дня).
   */
  @Get('sales/export')
  @ApiOperation({ summary: 'Экспорт продаж в CSV' })
  async exportCsv(@Req() req: RequestWithUser<SupplierAuthUser>, @Res() res: Response, @Query('from') from?: string, @Query('to') to?: string) {
    const operatorId = req.user.operatorId;

    // Validate and set date range (default: last 30 days, max: 93 days)
    const dateFrom = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = to ? new Date(to) : new Date();

    const diffDays = (dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 93) {
      throw new BadRequestException('Максимальный период выгрузки: 93 дня');
    }

    const where: Record<string, unknown> = {
      supplierId: operatorId,
      status: 'PAID',
      paidAt: { gte: dateFrom, lte: dateTo },
    };

    await streamCsv({
      res,
      filename: 'sales',
      fields: [
        { header: 'Дата', accessor: (i) => i.paidAt?.toISOString().split('T')[0] },
        { header: 'Заказ', accessor: (i) => (i as any).checkoutSession?.shortCode },
        { header: 'Клиент', accessor: (i) => (i as any).checkoutSession?.customerName },
        { header: 'Сумма (руб)', accessor: (i) => ((i.grossAmount || 0) / 100).toFixed(2) },
        { header: 'Комиссия (руб)', accessor: (i) => ((i.platformFee || 0) / 100).toFixed(2) },
        { header: 'Ваш доход (руб)', accessor: (i) => ((i.supplierAmount || 0) / 100).toFixed(2) },
        { header: 'Ставка', accessor: (i) => (i.commissionRate ? `${Number(i.commissionRate) * 100}%` : '') },
      ],
      fetchBatch: (cursor, take) =>
        this.prisma.paymentIntent.findMany({
          where: where as any,
          include: { checkoutSession: { select: { shortCode: true, customerName: true } } },
          orderBy: { paidAt: 'desc' },
          take,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        }),
    });
  }
}
