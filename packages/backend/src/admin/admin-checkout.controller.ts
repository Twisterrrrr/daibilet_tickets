import { Controller, Get, Post, Patch, Param, Query, Body, Res, UseGuards, UseInterceptors, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutStatus, Prisma } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { AuditInterceptor } from './audit.interceptor';
import {
  tryTransitionCheckout,
  tryTransitionOrderRequest,
  DEFAULT_REQUEST_SLA_MINUTES,
} from '../checkout/checkout-state-machine';
import { getCompatMetrics } from '@daibilet/shared';
import { UpdateSessionStatusDto, AdminNoteDto, ExportRequestsCsvDto, ExportSessionsCsvDto } from './dto/admin-checkout.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/checkout')
export class AdminCheckoutController {
  private readonly logger = new Logger(AdminCheckoutController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Список checkout sessions с фильтрацией.
   */
  @Get('sessions')
  async listSessions(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') pageRaw = '1',
    @Query('limit') limitRaw = '25',
  ) {
    const page = Number(pageRaw) || 1;
    const limit = Number(limitRaw) || 25;
    const where: any = {};

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { shortCode: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.checkoutSession.findMany({
        where,
        include: {
          _count: { select: { orderRequests: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.checkoutSession.count({ where }),
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  /**
   * Детали checkout session (включает orderRequests + paymentIntents).
   */
  @Get('sessions/:id')
  async getSession(@Param('id') id: string) {
    const session = await this.prisma.checkoutSession.findUnique({
      where: { id },
      include: {
        orderRequests: true,
        paymentIntents: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!session) throw new NotFoundException('Сессия не найдена');
    return session;
  }

  /**
   * Обновить статус checkout session (через state machine, actor=admin).
   */
  @Patch('sessions/:id')
  @Roles('ADMIN', 'EDITOR')
  async updateSession(@Param('id') id: string, @Body() data: UpdateSessionStatusDto) {
    const session = await this.prisma.checkoutSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Сессия не найдена');

    if (data.status) {
      const result = tryTransitionCheckout(session.status, data.status, 'admin');

      if (result.noOp) return session;

      if (!result.allowed) {
        // Security: логируем запрещённый переход
        await this.logDeniedTransition('CheckoutSession', id, session.status, data.status, result.reason);
        throw new BadRequestException(result.reason);
      }
    }

    const updateData: any = {};
    if (data.status) updateData.status = data.status as CheckoutStatus;
    // Фиксируем completedAt для корректной аналитики
    if (data.status === 'COMPLETED') updateData.completedAt = new Date();

    return this.prisma.checkoutSession.update({ where: { id }, data: updateData });
  }

  /**
   * Список order requests с фильтрацией.
   */
  @Get('requests')
  async listRequests(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') pageRaw = '1',
    @Query('limit') limitRaw = '25',
  ) {
    const page = Number(pageRaw) || 1;
    const limit = Number(limitRaw) || 25;
    const where: any = {};

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.orderRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.orderRequest.count({ where }),
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  /**
   * Подтвердить заявку (PENDING -> CONFIRMED). Actor: admin.
   */
  @Post('requests/:id/confirm')
  @Roles('ADMIN', 'EDITOR')
  async confirmRequest(@Param('id') id: string, @Body() data: AdminNoteDto) {
    const request = await this.prisma.orderRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Заявка не найдена');

    const result = tryTransitionOrderRequest(request.status, 'CONFIRMED', 'admin');
    if (result.noOp) return request;
    if (!result.allowed) {
      await this.logDeniedTransition('OrderRequest', id, request.status, 'CONFIRMED', result.reason);
      throw new BadRequestException(result.reason);
    }

    const updated = await this.prisma.orderRequest.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        adminNote: data.adminNote || request.adminNote,
      },
    });

    // Send email notification to customer (with operational info)
    if (request.customerEmail && request.checkoutSessionId) {
      const session = await this.prisma.checkoutSession.findUnique({
        where: { id: request.checkoutSessionId },
        include: {
          orderRequests: {
            include: {
              event: { select: { title: true } },
              eventOffer: {
                select: {
                  meetingPoint: true,
                  meetingInstructions: true,
                  operationalPhone: true,
                  operationalNote: true,
                },
              },
            },
          },
        },
      });
      if (session) {
        this.mailService.sendOrderConfirmed(request.customerEmail, {
          customerName: request.customerName || 'Клиент',
          shortCode: session.shortCode,
          items: session.orderRequests.map((r) => ({
            title: r.event?.title || 'Билет',
            quantity: r.quantity,
            price: Math.round(r.priceSnapshot / 100),
          })),
          totalPrice: Math.round((session.totalPrice || 0) / 100),
          operationalItems: session.orderRequests.map((r) => ({
            eventTitle: r.event?.title || 'Билет',
            meetingPoint: r.eventOffer?.meetingPoint,
            meetingInstructions: r.eventOffer?.meetingInstructions,
            operationalPhone: r.eventOffer?.operationalPhone,
            operationalNote: r.eventOffer?.operationalNote,
          })),
        }).catch((e) => this.logger.error('Confirm email failed: ' + e.message));
      }
    }

    return updated;
  }

  /**
   * Отклонить заявку (PENDING -> REJECTED). Actor: admin.
   */
  @Post('requests/:id/reject')
  @Roles('ADMIN', 'EDITOR')
  async rejectRequest(@Param('id') id: string, @Body() data: AdminNoteDto) {
    const request = await this.prisma.orderRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Заявка не найдена');

    const result = tryTransitionOrderRequest(request.status, 'REJECTED', 'admin');
    if (result.noOp) return request;
    if (!result.allowed) {
      await this.logDeniedTransition('OrderRequest', id, request.status, 'REJECTED', result.reason);
      throw new BadRequestException(result.reason);
    }

    const updated = await this.prisma.orderRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        adminNote: data.adminNote || request.adminNote,
      },
    });

    // Send email notification to customer
    if (request.customerEmail && request.checkoutSessionId) {
      const session = await this.prisma.checkoutSession.findUnique({
        where: { id: request.checkoutSessionId },
        select: { shortCode: true },
      });
      if (session) {
        this.mailService.sendOrderRejected(request.customerEmail, {
          customerName: request.customerName || 'Клиент',
          shortCode: session.shortCode,
          reason: data.adminNote || undefined,
        }).catch((e) => this.logger.error('Reject email failed: ' + e.message));
      }
    }

    return updated;
  }

  // ============================
  // Security: log denied transitions
  // ============================

  private async logDeniedTransition(
    entity: string, entityId: string,
    fromStatus: string, toStatus: string, reason?: string,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: '00000000-0000-0000-0000-000000000000', // system
          action: 'DENIED_TRANSITION',
          entity,
          entityId,
          before: { status: fromStatus } as Prisma.InputJsonValue,
          after: { attemptedStatus: toStatus, reason } as Prisma.InputJsonValue,
        },
      });
    } catch { /* не блокируем основной флоу */ }
  }

  // ============================
  // Analytics (v2)
  // ============================

  /**
   * Аналитический отчёт: распределение по типам, конверсия, drop-off, SLA.
   */
  @Get('analytics')
  async getAnalytics() {
    // 1. Распределение офферов по purchaseType
    const offersByType = await this.prisma.eventOffer.groupBy({
      by: ['purchaseType'],
      _count: { id: true },
      where: { status: 'ACTIVE' },
    });

    // 2. Распределение офферов по purchaseType + source (связка)
    const offersByTypeAndSource = await this.prisma.eventOffer.groupBy({
      by: ['purchaseType', 'source'],
      _count: { id: true },
      where: { status: 'ACTIVE' },
    });

    // 3. Checkout sessions по статусу
    const sessionsByStatus = await this.prisma.checkoutSession.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    // 4. Order requests по статусу
    const requestsByStatus = await this.prisma.orderRequest.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    // 5. Order requests по expireReason
    const requestsByExpireReason = await this.prisma.orderRequest.groupBy({
      by: ['expireReason'],
      _count: { id: true },
      where: { status: 'EXPIRED' },
    });

    // 6. Базовые счётчики
    const [totalSessions, completedSessions, totalRequests, confirmedRequests, expiredRequests, pendingRequests] =
      await Promise.all([
        this.prisma.checkoutSession.count(),
        this.prisma.checkoutSession.count({ where: { status: 'COMPLETED' } }),
        this.prisma.orderRequest.count(),
        this.prisma.orderRequest.count({ where: { status: 'CONFIRMED' } }),
        this.prisma.orderRequest.count({ where: { status: 'EXPIRED' } }),
        this.prisma.orderRequest.count({ where: { status: 'PENDING' } }),
      ]);

    // 7. Drop-off по шагам checkout
    const statusCounts: Record<string, number> = {};
    sessionsByStatus.forEach((s) => { statusCounts[s.status] = s._count.id; });

    const dropOff = {
      started: statusCounts['STARTED'] || 0,
      validated: statusCounts['VALIDATED'] || 0,
      redirected: statusCounts['REDIRECTED'] || 0,
      pendingConfirmation: statusCounts['PENDING_CONFIRMATION'] || 0,
      confirmed: statusCounts['CONFIRMED'] || 0,
      awaitingPayment: statusCounts['AWAITING_PAYMENT'] || 0,
      completed: statusCounts['COMPLETED'] || 0,
      expired: statusCounts['EXPIRED'] || 0,
      cancelled: statusCounts['CANCELLED'] || 0,
    };

    // 8. SLA метрики — p50, p90, среднее, breach rate (last 30 days for safety)
    const slaDateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const confirmedWithTime = await this.prisma.orderRequest.findMany({
      where: {
        status: 'CONFIRMED',
        confirmedAt: { not: null },
        createdAt: { gte: slaDateFrom },
      },
      select: { createdAt: true, confirmedAt: true, slaMinutes: true },
      take: 500,
      orderBy: { confirmedAt: 'desc' },
    });

    let avgConfirmMinutes: number | null = null;
    let p50ConfirmMinutes: number | null = null;
    let p90ConfirmMinutes: number | null = null;
    let slaBreachCount = 0;

    if (confirmedWithTime.length > 0) {
      const durations = confirmedWithTime
        .map((r) => ({
          minutes: (new Date(r.confirmedAt!).getTime() - new Date(r.createdAt).getTime()) / 60000,
          sla: r.slaMinutes,
        }))
        .sort((a, b) => a.minutes - b.minutes);

      const minutesOnly = durations.map((d) => d.minutes);

      // Average
      avgConfirmMinutes = Math.round(minutesOnly.reduce((s, v) => s + v, 0) / minutesOnly.length);

      // Percentiles
      p50ConfirmMinutes = Math.round(minutesOnly[Math.floor(minutesOnly.length * 0.5)]);
      p90ConfirmMinutes = Math.round(minutesOnly[Math.floor(minutesOnly.length * 0.9)]);

      // SLA breach: подтверждены ПОЗЖЕ slaMinutes
      slaBreachCount = durations.filter((d) => d.minutes > d.sla).length;
    }

    const slaBreachRate = confirmedWithTime.length > 0
      ? Math.round((slaBreachCount / confirmedWithTime.length) * 10000) / 100
      : 0;

    // 9. Payment intents по статусу
    const paymentsByStatus = await this.prisma.paymentIntent.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    const [totalPayments, paidPayments, failedPayments] = await Promise.all([
      this.prisma.paymentIntent.count(),
      this.prisma.paymentIntent.count({ where: { status: 'PAID' } }),
      this.prisma.paymentIntent.count({ where: { status: 'FAILED' } }),
    ]);

    return {
      offersByType: offersByType.map((o) => ({
        purchaseType: o.purchaseType,
        count: o._count.id,
      })),
      offersByTypeAndSource: offersByTypeAndSource.map((o) => ({
        purchaseType: o.purchaseType,
        source: o.source,
        count: o._count.id,
      })),
      sessionsByStatus: sessionsByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      requestsByStatus: requestsByStatus.map((r) => ({
        status: r.status,
        count: r._count.id,
      })),
      requestsByExpireReason: requestsByExpireReason.map((r) => ({
        reason: r.expireReason,
        count: r._count.id,
      })),
      paymentsByStatus: paymentsByStatus.map((p) => ({
        status: p.status,
        count: p._count.id,
      })),
      dropOff,
      conversion: {
        totalSessions,
        completedSessions,
        sessionConversionRate: totalSessions > 0
          ? Math.round((completedSessions / totalSessions) * 10000) / 100
          : 0,
        totalRequests,
        confirmedRequests,
        expiredRequests,
        pendingRequests,
        requestConversionRate: totalRequests > 0
          ? Math.round((confirmedRequests / totalRequests) * 10000) / 100
          : 0,
        totalPayments,
        paidPayments,
        failedPayments,
        paymentSuccessRate: totalPayments > 0
          ? Math.round((paidPayments / totalPayments) * 10000) / 100
          : 0,
      },
      sla: {
        avgConfirmMinutes,
        p50ConfirmMinutes,
        p90ConfirmMinutes,
        slaBreachCount,
        slaBreachRate,
        defaultSlaMinutes: DEFAULT_REQUEST_SLA_MINUTES,
        samplesCount: confirmedWithTime.length,
      },
    };
  }

  // ============================
  // CSV Export
  // ============================

  /**
   * Экспорт заявок в CSV (с фильтрацией по статусу и дате).
   */
  @Get('export/requests')
  @Roles('ADMIN')
  async exportRequestsCsv(
    @Res() res: Response,
    @Query() query: ExportRequestsCsvDto,
  ) {
    // Validate and set date range (default: last 30 days, max: 93 days)
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = query.dateTo ? new Date(query.dateTo) : new Date();

    const diffDays = (dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 93) {
      throw new BadRequestException('Максимальный период выгрузки: 93 дня');
    }

    const where: any = {
      createdAt: { gte: dateFrom, lte: dateTo },
    };
    if (query.status) where.status = query.status;

    const requests = await this.prisma.orderRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const header = 'id,eventId,eventOfferId,status,expireReason,slaMinutes,customerName,customerEmail,customerPhone,priceSnapshot,quantity,createdAt,confirmedAt,expiresAt\n';
    const rows = requests.map((r) =>
      [
        r.id,
        r.eventId,
        r.eventOfferId,
        r.status,
        r.expireReason || '',
        r.slaMinutes,
        `"${(r.customerName || '').replace(/"/g, '""')}"`,
        r.customerEmail || '',
        r.customerPhone || '',
        r.priceSnapshot,
        r.quantity,
        r.createdAt.toISOString(),
        r.confirmedAt?.toISOString() || '',
        r.expiresAt?.toISOString() || '',
      ].join(','),
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="order-requests-${Date.now()}.csv"`);
    res.send('\uFEFF' + header + rows); // BOM для Excel
  }

  /**
   * Экспорт checkout sessions в CSV (с фильтрацией по статусу и дате).
   */
  @Get('export/sessions')
  @Roles('ADMIN')
  async exportSessionsCsv(
    @Res() res: Response,
    @Query() query: ExportSessionsCsvDto,
  ) {
    // Validate and set date range (default: last 30 days, max: 93 days)
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = query.dateTo ? new Date(query.dateTo) : new Date();

    const diffDays = (dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 93) {
      throw new BadRequestException('Максимальный период выгрузки: 93 дня');
    }

    const where: any = {
      createdAt: { gte: dateFrom, lte: dateTo },
    };
    if (query.status) where.status = query.status;

    const sessions = await this.prisma.checkoutSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { orderRequests: true } } },
      take: 1000,
    });

    const header = 'id,shortCode,status,customerName,customerEmail,customerPhone,totalPrice,requestCount,createdAt,completedAt,expiresAt\n';
    const rows = sessions.map((s) =>
      [
        s.id,
        s.shortCode,
        s.status,
        `"${(s.customerName || '').replace(/"/g, '""')}"`,
        s.customerEmail || '',
        s.customerPhone || '',
        s.totalPrice || 0,
        s._count.orderRequests,
        s.createdAt.toISOString(),
        s.completedAt?.toISOString() || '',
        s.expiresAt?.toISOString() || '',
      ].join(','),
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="checkout-sessions-${Date.now()}.csv"`);
    res.send('\uFEFF' + header + rows);
  }

  /**
   * Метрики legacy PURCHASE_TYPE_COMPAT.
   */
  @Get('compat-metrics')
  getCompatMetrics() {
    return getCompatMetrics();
  }
}
