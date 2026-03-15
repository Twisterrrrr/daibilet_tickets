import { ensurePayloadVersion, validateWidgetPayload } from '@daibilet/shared';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ModerationStatus, OfferSource, Prisma, SupplierRole } from '@prisma/client';
import { Request, Response } from 'express';

import { CurrentSupplierUser } from '../common/decorators/current-supplier-user.decorator';
import type { SupplierAuthUser } from '../common/decorators/current-supplier-user.decorator';
import { OperatorScope } from '../common/guards/operator-scope.guard';
import { OperatorScopeGuard } from '../common/guards/operator-scope.guard';
import { buildPaginatedResult, paginationArgs, parsePagination } from '../common/pagination';
import { streamCsv } from '../common/csv-stream.util';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from '../reports/reports.service';
import { SupplierTrustService } from './supplier-trust.service';
import { SupplierLoginDto, SupplierRegisterDto } from './dto/supplier-auth.dto';
import {
  CreateSupplierEventDto,
  CreateSupplierOfferDto,
  UpdateSupplierEventDto,
  UpdateSupplierOfferDto,
  UpdateSupplierSettingsDto,
} from './dto/supplier.dto';
import { CreateDisputeDto, CreateSupplierResponseDto } from './dto/supplier-reviews.dto';
import { SupplierRbacService } from './supplier-rbac.service';
import { SupplierJwtGuard, SupplierRoles, SupplierRolesGuard } from './supplier.guard';
import { SupplierAuthService } from './supplier-auth.service';
import { SupplierReviewsService } from './supplier-reviews.service';
import { SupplierLedgerService } from '../ledger/supplier-ledger.service';
import { CreateSupplierPayoutRequestDto, SupplierBalanceDto } from './dto/supplier-payout.dto';
import {
  AcceptSupplierInvitationDto,
  CreateSupplierInvitationDto,
} from './dto/supplier-invitation.dto';
import { SupplierIntegrationsService } from './supplier-integrations.service';
import { SupplierInvitationService } from './supplier-invitation.service';
import { SupplierNotificationsService } from './supplier-notifications.service';
import { ListingHealthService } from '../catalog/listing-health.service';
import { tryTransitionCheckout, tryTransitionOrderRequest } from '../checkout/checkout-state-machine';

@ApiTags('supplier')
@Controller('supplier')
export class SupplierController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: SupplierAuthService,
    private readonly rbac: SupplierRbacService,
    private readonly reviewsService: SupplierReviewsService,
    private readonly reportsService: ReportsService,
    private readonly trustService: SupplierTrustService,
    private readonly supplierLedger: SupplierLedgerService,
    private readonly notificationsService: SupplierNotificationsService,
    private readonly listingHealth: ListingHealthService,
    private readonly invitationService: SupplierInvitationService,
    private readonly integrationsService: SupplierIntegrationsService,
  ) {}

  // ─── Auth (public / refresh / guarded) ─────────────────────────────────────

  @Post('auth/register')
  @ApiOperation({ summary: 'Регистрация поставщика' })
  async register(@Body() body: SupplierRegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register({
      ...body,
      companyName: body.companyName || body.name,
    });
    res.cookie('supplier_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { accessToken: result.accessToken, operatorId: result.operatorId };
  }

  @Post('auth/login')
  @ApiOperation({ summary: 'Вход поставщика' })
  async login(@Body() body: SupplierLoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(body.email, body.password);
    res.cookie('supplier_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { accessToken: result.accessToken, operatorId: result.operatorId };
  }

  @Post('auth/refresh')
  @ApiOperation({ summary: 'Обновить токены поставщика' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.supplier_refresh_token;
    if (!refreshToken) return { error: 'No refresh token' };
    const result = await this.authService.refresh(refreshToken);
    res.cookie('supplier_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { accessToken: result.accessToken };
  }

  @Post('auth/logout')
  @UseGuards(SupplierJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Выход поставщика' })
  async logout(@Req() req: { user: { id: string } }, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user.id);
    res.clearCookie('supplier_refresh_token');
    return { message: 'Logged out' };
  }

  @Get('auth/me')
  @UseGuards(SupplierJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Профиль поставщика' })
  async me(@Req() req: { user: { id: string } }) {
    return this.authService.getProfile(req.user.id);
  }

  @Get('notifications')
  @UseGuards(SupplierJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Центр уведомлений поставщика' })
  async notifications(
    @Req() req: { user: { operatorId: string } },
    @Query('limit') limitRaw?: string,
  ) {
    const limit = limitRaw ? Number(limitRaw) : 50;
    return this.notificationsService.list(req.user.operatorId, limit);
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────

  @Get('dashboard')
  @UseGuards(SupplierJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dashboard поставщика' })
  async dashboard(@Req() req: { user: { operatorId: string } }) {
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
    const payments = await this.prisma.paymentIntent.aggregate({
      where: { supplierId: operatorId, status: 'PAID' },
      _sum: { grossAmount: true, platformFee: true, supplierAmount: true },
      _count: { id: true },
    });
    const trustBreakdown = await this.trustService.recalculateSupplierTrust(operatorId);
    const activeEventsLimit = this.trustService.getActiveEventsLimitByTrustLevel(trustBreakdown.level);
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
      trust: {
        score: trustBreakdown.score,
        level: trustBreakdown.level,
        profile: trustBreakdown.profile,
        catalog: trustBreakdown.catalog,
        operations: trustBreakdown.operations,
        reputation: trustBreakdown.reputation,
        stability: trustBreakdown.stability,
        penalties: trustBreakdown.penalties,
        activeEventsLimit,
        activeEventsCount: activeEvents,
        nextLevelRequirements: await this.trustService.getNextLevelRequirements(operatorId),
      },
    };
  }

  // ─── Balance & Payouts ──────────────────────────────────────────────────────

  @Get('balance')
  @UseGuards(SupplierJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Баланс поставщика и доступная сумма к выводу (по книге)' })
  async balance(@Req() req: { user: { operatorId: string } }): Promise<SupplierBalanceDto> {
    const operatorId = req.user.operatorId;

    const currentBalance = await this.supplierLedger.getBalance(operatorId);

    const pending = await this.prisma.supplierPayoutRequest.aggregate({
      where: { operatorId, status: { in: ['NEW', 'APPROVED'] } },
      _sum: { amount: true },
    });
    const pendingPayoutAmount = Number(pending._sum.amount || 0);

    const availableToRequest = Math.max(currentBalance - pendingPayoutAmount, 0);

    return {
      currentBalance,
      pendingPayoutAmount,
      availableToRequest,
    };
  }

  @Get('payout-requests')
  @UseGuards(SupplierJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Мои заявки на вывод средств' })
  async listPayoutRequests(@Req() req: { user: { operatorId: string } }) {
    const operatorId = req.user.operatorId;
    return this.prisma.supplierPayoutRequest.findMany({
      where: { operatorId },
      orderBy: { requestedAt: 'desc' },
    });
  }

  @Post('payout-requests')
  @UseGuards(SupplierJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать заявку на вывод средств' })
  async createPayoutRequest(
    @Req() req: { user: { operatorId: string } },
    @Body() dto: CreateSupplierPayoutRequestDto,
  ) {
    const operatorId = req.user.operatorId;

    const operator = await this.prisma.operator.findUnique({
      where: { id: operatorId },
      select: { settlementMode: true },
    });
    if (!operator) throw new NotFoundException('Оператор не найден');
    const settlementMode = operator.settlementMode ?? 'DIRECT';
    if (settlementMode !== 'DIRECT') {
      throw new BadRequestException('Вывод средств недоступен: расчёты ведутся у внешнего провайдера');
    }

    const balance = await this.balance(req);
    if (dto.amount > balance.availableToRequest) {
      throw new BadRequestException('Недостаточно средств для вывода');
    }

    return this.prisma.supplierPayoutRequest.create({
      data: {
        operatorId,
        amount: dto.amount,
        comment: dto.comment ?? null,
        status: 'NEW',
      },
    });
  }

  // ─── Reports ──────────────────────────────────────────────────────────────

  @Get('reports/sales')
  @UseGuards(SupplierJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отчёт о продажах' })
  async salesReport(
    @Req() req: { user: { operatorId: string } },
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') pageRaw = '1',
    @Query('limit') limitRaw = '50',
  ) {
    const operatorId = req.user.operatorId;
    const page = Number(pageRaw) || 1;
    const limit = Math.min(Number(limitRaw) || 50, 200);
    const where: { supplierId: string; status: 'PAID'; paidAt?: { gte?: Date; lte?: Date } } = { supplierId: operatorId, status: 'PAID' };
    if (from || to) {
      where.paidAt = {};
      if (from) where.paidAt.gte = new Date(from);
      if (to) where.paidAt.lte = new Date(to);
    }
    const [items, total, aggregate] = await Promise.all([
      this.prisma.paymentIntent.findMany({
        where,
        include: { checkoutSession: { select: { shortCode: true, customerName: true, customerEmail: true, offersSnapshot: true } } },
        orderBy: { paidAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.paymentIntent.count({ where }),
      this.prisma.paymentIntent.aggregate({ where, _sum: { grossAmount: true, platformFee: true, supplierAmount: true }, _count: { id: true } }),
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

  @Get('reports/sales/export')
  @UseGuards(SupplierJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Экспорт продаж в CSV' })
  async exportCsv(@Req() req: { user: { operatorId: string } }, @Res() res: Response, @Query('from') from?: string, @Query('to') to?: string) {
    const operatorId = req.user.operatorId;
    const dateFrom = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = to ? new Date(to) : new Date();
    const diffDays = (dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 93) throw new BadRequestException('Максимальный период выгрузки: 93 дня');
    const where = { supplierId: operatorId, status: 'PAID' as const, paidAt: { gte: dateFrom, lte: dateTo } };
    await streamCsv({
      res,
      filename: 'sales',
      fields: [
        { header: 'Дата', accessor: (i) => i.paidAt?.toISOString().split('T')[0] },
        { header: 'Заказ', accessor: (i) => (i as { checkoutSession?: { shortCode?: string } }).checkoutSession?.shortCode },
        { header: 'Клиент', accessor: (i) => (i as { checkoutSession?: { customerName?: string } }).checkoutSession?.customerName },
        { header: 'Сумма (руб)', accessor: (i) => ((i.grossAmount || 0) / 100).toFixed(2) },
        { header: 'Комиссия (руб)', accessor: (i) => ((i.platformFee || 0) / 100).toFixed(2) },
        { header: 'Ваш доход (руб)', accessor: (i) => ((i.supplierAmount || 0) / 100).toFixed(2) },
        { header: 'Ставка', accessor: (i) => (i.commissionRate ? `${Number(i.commissionRate) * 100}%` : '') },
      ],
      fetchBatch: (cursor, take) =>
        this.prisma.paymentIntent.findMany({
          where,
          include: { checkoutSession: { select: { shortCode: true, customerName: true } } },
          orderBy: { paidAt: 'desc' },
          take,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        }),
    });
  }

  @Get('reports/sales.csv')
  @UseGuards(SupplierJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Экспорт продаж в CSV (краткий алиас)' })
  async exportCsvAlias(
    @Req() req: { user: { operatorId: string } },
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.exportCsv(req, res, from, to);
  }

  @Get('reports/sessions')
  @UseGuards(SupplierJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Заполняемость сеансов поставщика' })
  async supplierSessions(
    @Req() req: { user: { operatorId: string } },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.getSessionOccupancy({
      operatorId: req.user.operatorId,
      from,
      to,
    });
  }

  @Get('reports/dashboard')
  @UseGuards(SupplierJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Сводная аналитика по продажам и сессиям' })
  async supplierDashboard(@Req() req: { user: { operatorId: string } }) {
    return this.reportsService.getSupplierDashboard(req.user.operatorId);
  }

  // ─── Listing health ────────────────────────────────────────────────────────

  @Get('listing-health')
  @UseGuards(SupplierJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Здоровье листингов поставщика (качество событий)' })
  async listingHealthSummary(@Req() req: { user: { operatorId: string } }) {
    return this.listingHealth.computeForOperator(req.user.operatorId);
  }

  // ─── Orders / Booking Operations ───────────────────────────────────────────

  @Get('orders')
  @UseGuards(SupplierJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Список заявок на бронирование для поставщика' })
  async listOrders(
    @Req() req: { user: { operatorId: string } },
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') pageRaw = '1',
    @Query('limit') limitRaw = '25',
  ) {
    const operatorId = req.user.operatorId;
    const page = Math.max(Number(pageRaw) || 1, 1);
    const limit = Math.min(Number(limitRaw) || 25, 100);

    const where: Prisma.OrderRequestWhereInput = {
      event: { operatorId },
    };

    if (status) {
      where.status = status.toUpperCase();
    }
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [items, total] = await Promise.all([
      this.prisma.orderRequest.findMany({
        where,
        include: {
          event: { select: { id: true, title: true, slug: true } },
          checkoutSession: {
            select: {
              id: true,
              shortCode: true,
              status: true,
              totalPrice: true,
              customerName: true,
              customerEmail: true,
              customerPhone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.orderRequest.count({ where }),
    ]);

    return {
      items: items.map((or) => ({
        id: or.id,
        status: or.status,
        shortCode: or.checkoutSession?.shortCode || null,
        eventId: or.eventId,
        eventTitle: or.event?.title || null,
        eventSlug: or.event?.slug || null,
        quantity: or.quantity,
        priceSnapshot: or.priceSnapshot,
        customerName: or.checkoutSession?.customerName ?? null,
        customerEmail: or.checkoutSession?.customerEmail ?? null,
        customerPhone: or.checkoutSession?.customerPhone ?? null,
        slaMinutes: or.slaMinutes,
        expiresAt: or.expiresAt,
        expireReason: or.expireReason,
        createdAt: or.createdAt,
        confirmedAt: or.confirmedAt,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  @Get('orders/:id')
  @UseGuards(SupplierJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Детали заявки на бронирование' })
  async getOrder(@Req() req: { user: { operatorId: string } }, @Param('id') id: string) {
    const operatorId = req.user.operatorId;
    const order = await this.prisma.orderRequest.findUnique({
      where: { id },
      include: {
        event: { select: { id: true, title: true, slug: true, operatorId: true } },
        eventOffer: { select: { id: true, operatorId: true } },
        checkoutSession: {
          select: {
            id: true,
            shortCode: true,
            status: true,
            totalPrice: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            offersSnapshot: true,
            createdAt: true,
          },
        },
      },
    });
    if (!order || (order.event.operatorId !== operatorId && order.eventOffer.operatorId !== operatorId)) {
      throw new NotFoundException('Заявка не найдена');
    }
    return {
      id: order.id,
      status: order.status,
      shortCode: order.checkoutSession?.shortCode || null,
      eventId: order.eventId,
      eventTitle: order.event?.title || null,
      eventSlug: order.event?.slug || null,
      quantity: order.quantity,
      priceSnapshot: order.priceSnapshot,
      customerName: order.checkoutSession?.customerName ?? null,
      customerEmail: order.checkoutSession?.customerEmail ?? null,
      customerPhone: order.checkoutSession?.customerPhone ?? null,
      totalPrice: order.checkoutSession?.totalPrice ?? null,
      slaMinutes: order.slaMinutes,
      expiresAt: order.expiresAt,
      expireReason: order.expireReason,
      adminNote: order.adminNote,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      confirmedAt: order.confirmedAt,
      checkoutSessionStatus: order.checkoutSession?.status ?? null,
      checkoutSessionId: order.checkoutSessionId,
      offersSnapshot: order.checkoutSession?.offersSnapshot ?? null,
    };
  }

  @Post('orders/:id/confirm')
  @UseGuards(SupplierJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Подтвердить заявку на бронирование' })
  async confirmOrder(
    @Req() req: { user: { operatorId: string } },
    @Param('id') id: string,
    @Body() body: { notes?: string },
  ) {
    const operatorId = req.user.operatorId;
    const order = await this.prisma.orderRequest.findUnique({
      where: { id },
      include: {
        event: { select: { operatorId: true } },
        eventOffer: { select: { operatorId: true } },
        checkoutSession: { select: { id: true, status: true } },
      },
    });
    if (!order || (order.event.operatorId !== operatorId && order.eventOffer.operatorId !== operatorId)) {
      throw new NotFoundException('Заявка не найдена');
    }
    const result = tryTransitionOrderRequest(order.status, 'CONFIRMED', 'admin');
    if (!result.allowed) {
      throw new BadRequestException(result.reason || 'Transition not allowed');
    }
    if (result.noOp) {
      return { message: 'Уже подтверждена', id: order.id, status: order.status };
    }
    const updated = await this.prisma.orderRequest.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        adminNote: body?.notes ?? null,
        confirmedAt: new Date(),
      },
    });
    if (order.checkoutSession) {
      const csResult = tryTransitionCheckout(order.checkoutSession.status, 'CONFIRMED', 'admin');
      if (csResult.allowed && !csResult.noOp) {
        await this.prisma.checkoutSession.update({
          where: { id: order.checkoutSession.id },
          data: { status: 'CONFIRMED' },
        });
      }
    }
    return { message: 'Заявка подтверждена', id: updated.id, status: updated.status };
  }

  @Post('orders/:id/reject')
  @UseGuards(SupplierJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отклонить заявку на бронирование' })
  async rejectOrder(
    @Req() req: { user: { operatorId: string } },
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    const operatorId = req.user.operatorId;
    const order = await this.prisma.orderRequest.findUnique({
      where: { id },
      include: {
        event: { select: { operatorId: true } },
        eventOffer: { select: { operatorId: true } },
        checkoutSession: { select: { id: true, status: true } },
      },
    });
    if (!order || (order.event.operatorId !== operatorId && order.eventOffer.operatorId !== operatorId)) {
      throw new NotFoundException('Заявка не найдена');
    }
    const result = tryTransitionOrderRequest(order.status, 'REJECTED', 'admin');
    if (!result.allowed) {
      throw new BadRequestException(result.reason || 'Transition not allowed');
    }
    if (result.noOp) {
      return { message: 'Уже отклонена', id: order.id, status: order.status };
    }
    const updated = await this.prisma.orderRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        adminNote: body?.reason ?? null,
      },
    });
    if (order.checkoutSession) {
      const csResult = tryTransitionCheckout(order.checkoutSession.status, 'CANCELLED', 'admin');
      if (csResult.allowed && !csResult.noOp) {
        await this.prisma.checkoutSession.update({
          where: { id: order.checkoutSession.id },
          data: { status: 'CANCELLED' },
        });
      }
    }
    return { message: 'Заявка отклонена', id: updated.id, status: updated.status };
  }

  // ─── Settings ─────────────────────────────────────────────────────────────

  @Get('settings')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Настройки поставщика' })
  async getSettings(@CurrentSupplierUser() user: SupplierAuthUser) {
    return this.prisma.operator.findUnique({
      where: { id: user.operatorId },
      select: { id: true, name: true, slug: true, logo: true, website: true, companyName: true, inn: true, contactEmail: true, contactPhone: true, commissionRate: true, promoRate: true, promoUntil: true, trustLevel: true, verifiedAt: true, yookassaAccountId: true },
    });
  }

  @Put('settings')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard)
  @SupplierRoles('OWNER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить настройки' })
  async updateSettings(@CurrentSupplierUser() user: SupplierAuthUser, @Body() data: UpdateSupplierSettingsDto) {
    // Дополнительная проверка RBAC на уровне membership (OWNER-only).
    await this.rbac.requireSupplierRole(user.id, user.operatorId, [SupplierRole.OWNER]);
    return this.prisma.operator.update({
      where: { id: user.operatorId },
      data: { name: data.name, logo: data.logo, website: data.website, companyName: data.companyName, inn: data.inn, contactEmail: data.contactEmail, contactPhone: data.contactPhone },
    });
  }

  // ─── Integrations (Phase 8) ─────────────────────────────────────────────────

  @Get('integrations')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard, OperatorScopeGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Статус интеграций поставщика' })
  async getIntegrations(@CurrentSupplierUser() user: SupplierAuthUser) {
    return this.integrationsService.getStatus(user.operatorId);
  }

  // ─── Invitations (Phase 9) ─────────────────────────────────────────────────

  @Get('invitations')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard)
  @SupplierRoles('OWNER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Список приглашений и пользователей команды' })
  async listInvitations(@CurrentSupplierUser() user: SupplierAuthUser) {
    await this.rbac.requireSupplierRole(user.id, user.operatorId, [SupplierRole.OWNER]);
    return this.invitationService.list(user.operatorId);
  }

  @Post('invitations')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard)
  @SupplierRoles('OWNER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать приглашение' })
  async createInvitation(
    @CurrentSupplierUser() user: SupplierAuthUser,
    @Body() data: CreateSupplierInvitationDto,
    @Res({ passthrough: true }) _res: Response,
  ) {
    await this.rbac.requireSupplierRole(user.id, user.operatorId, [SupplierRole.OWNER]);
    const result = await this.invitationService.create(
      user.operatorId,
      user.id,
      data.email,
      data.role,
    );
    return result;
  }

  @Delete('invitations/:id')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard)
  @SupplierRoles('OWNER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отменить приглашение' })
  async deleteInvitation(@CurrentSupplierUser() user: SupplierAuthUser, @Param('id') id: string) {
    await this.rbac.requireSupplierRole(user.id, user.operatorId, [SupplierRole.OWNER]);
    return this.invitationService.delete(user.operatorId, id);
  }

  @Post('invitations/:token/accept')
  @ApiOperation({ summary: 'Принять приглашение (публичный)' })
  async acceptInvitation(
    @Param('token') token: string,
    @Body() body: AcceptSupplierInvitationDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.invitationService.accept(token, body.name, body.password);
    res.cookie('supplier_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { accessToken: result.accessToken, operatorId: result.operatorId };
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  @Get('events')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard, OperatorScopeGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Мои события' })
  async listEvents(
    @CurrentSupplierUser() user: SupplierAuthUser,
    @Query('status') status?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pg = parsePagination({ cursor, page, limit: limit || '25' });
    const where: Prisma.EventWhereInput = { operatorId: user.operatorId, isDeleted: false };
    if (status) where.moderationStatus = status as Prisma.EnumModerationStatusFilter;
    const [rawItems, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        include: { city: { select: { id: true, name: true } }, _count: { select: { offers: true, reviews: true } } },
        orderBy: { createdAt: 'desc' },
        ...paginationArgs(pg),
      }),
      this.prisma.event.count({ where }),
    ]);
    return buildPaginatedResult(rawItems, total, pg.limit);
  }

  @Get('events/:id')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard, OperatorScopeGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Детали события' })
  async getEvent(@Req() req: { user: SupplierAuthUser }, @Param('id') id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, operatorId: req.user.operatorId },
      include: { city: { select: { id: true, name: true, slug: true } }, offers: true, tags: { include: { tag: true } } },
    });
    if (!event) throw new NotFoundException('Событие не найдено');
    return event;
  }

  @Post('events')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard, OperatorScopeGuard)
  @SupplierRoles('OWNER', 'MANAGER', 'CONTENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать событие (черновик)' })
  async createEvent(@Req() req: { user: SupplierAuthUser }, @Body() data: CreateSupplierEventDto) {
    await this.rbac.requireSupplierRole(req.user.id, req.user.operatorId, [
      SupplierRole.OWNER,
      SupplierRole.MANAGER,
      SupplierRole.CONTENT,
    ]);
    const slug =
      (data.title || 'event')
        .toLowerCase()
        .replace(/[^a-zа-яё0-9]/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Date.now().toString(36);
    return this.prisma.event.create({
      data: {
        source: OfferSource.MANUAL,
        tcEventId: `supplier-${Date.now()}`,
        cityId: data.cityId,
        title: data.title,
        slug,
        description: data.description || null,
        shortDescription: data.shortDescription || null,
        category: data.category || 'EXCURSION',
        audience: data.audience || 'ALL',
        durationMinutes: data.durationMinutes || null,
        address: data.address || null,
        imageUrl: data.imageUrl || null,
        galleryUrls: data.galleryUrls || [],
        priceFrom: data.priceFrom || null,
        isActive: false,
        operatorId: req.user.operatorId,
        supplierId: req.user.operatorId,
        moderationStatus: ModerationStatus.DRAFT,
        createdByType: 'SUPPLIER',
        createdById: req.user.id,
      },
    });
  }

  @Put('events/:id')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard, OperatorScopeGuard)
  @OperatorScope('Event', 'id')
  @SupplierRoles('OWNER', 'MANAGER', 'CONTENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить событие' })
  async updateEvent(@Req() req: { user: SupplierAuthUser }, @Param('id') id: string, @Body() data: UpdateSupplierEventDto) {
    await this.rbac.requireSupplierRole(req.user.id, req.user.operatorId, [
      SupplierRole.OWNER,
      SupplierRole.MANAGER,
      SupplierRole.CONTENT,
    ]);
    const event = await this.prisma.event.findFirst({ where: { id, operatorId: req.user.operatorId } });
    if (!event) throw new NotFoundException('Событие не найдено');
    return this.prisma.event.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        shortDescription: data.shortDescription,
        category: data.category,
        audience: data.audience,
        durationMinutes: data.durationMinutes,
        address: data.address,
        imageUrl: data.imageUrl,
        galleryUrls: data.galleryUrls,
        priceFrom: data.priceFrom,
        updatedById: req.user.id,
      },
    });
  }

  @Post('events/:id/submit')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard, OperatorScopeGuard)
  @SupplierRoles('OWNER', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отправить на модерацию' })
  async submitEvent(@Req() req: { user: SupplierAuthUser }, @Param('id') id: string) {
    await this.rbac.requireSupplierRole(req.user.id, req.user.operatorId, [
      SupplierRole.OWNER,
      SupplierRole.MANAGER,
    ]);
    const event = await this.prisma.event.findFirst({ where: { id, operatorId: req.user.operatorId } });
    if (!event) throw new NotFoundException('Событие не найдено');
    if (!['DRAFT', 'REJECTED'].includes(event.moderationStatus)) {
      throw new BadRequestException('Событие уже отправлено или одобрено');
    }
    return this.prisma.event.update({ where: { id }, data: { moderationStatus: 'PENDING_REVIEW' } });
  }

  @Delete('events/:id')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard, OperatorScopeGuard)
  @SupplierRoles('OWNER', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить событие (soft-delete для черновиков и отклонённых)' })
  async deleteEvent(@Req() req: { user: SupplierAuthUser }, @Param('id') id: string) {
    await this.rbac.requireSupplierRole(req.user.id, req.user.operatorId, [
      SupplierRole.OWNER,
      SupplierRole.MANAGER,
    ]);
    const event = await this.prisma.event.findFirst({
      where: { id, operatorId: req.user.operatorId },
    });
    if (!event) throw new NotFoundException('Событие не найдено');
    if (!['DRAFT', 'REJECTED'].includes(event.moderationStatus)) {
      throw new BadRequestException('Удалять можно только черновики и отклонённые события. Для опубликованных событий используйте скрытие через админку.');
    }
    await this.prisma.event.update({
      where: { id },
      data: {
        isDeleted: true,
        isActive: false,
        deletedAt: new Date(),
        updatedById: req.user.id,
      },
    });
    return { message: 'Событие помечено как удалённое' };
  }

  // ─── Schedule (Event sessions) ─────────────────────────────────────────────

  @Get('events/:eventId/sessions')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard, OperatorScopeGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Будущие активные сессии события (для расписания)' })
  async listSessions(@Req() req: { user: SupplierAuthUser }, @Param('eventId') eventId: string) {
    const operatorId = req.user.operatorId;
    const event = await this.prisma.event.findFirst({ where: { id: eventId, operatorId } });
    if (!event) throw new NotFoundException('Событие не найдено');

    const now = new Date();
    const sessions = await this.prisma.eventSession.findMany({
      where: {
        eventId,
        startsAt: { gte: now },
        canceledAt: null,
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        capacityTotal: true,
      },
      orderBy: { startsAt: 'asc' },
    });

    if (sessions.length === 0) {
      return [];
    }

    const sessionIds = sessions.map((s) => s.id);
    const sold = await this.prisma.packageItem.groupBy({
      by: ['sessionId'],
      where: {
        sessionId: { in: sessionIds },
        status: { in: ['BOOKED', 'CONFIRMED'] },
      },
      _sum: {
        adultTickets: true,
        childTickets: true,
      },
    });

    const soldById: Record<string, number> = {};
    for (const row of sold) {
      const total = (row._sum.adultTickets ?? 0) + (row._sum.childTickets ?? 0);
      soldById[row.sessionId] = total;
    }

    return sessions.map((s) => ({
      id: s.id,
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt ? s.endsAt.toISOString() : null,
      capacity: s.capacityTotal ?? null,
      soldTickets: soldById[s.id] ?? 0,
    }));
  }

  @Put('events/:eventId/sessions')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard, OperatorScopeGuard)
  @SupplierRoles('OWNER', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Синхронизировать расписание сессий события (diff: create/update/soft-delete) с защитой проданных билетов',
  })
  async syncSessions(
    @Req() req: { user: SupplierAuthUser },
    @Param('eventId') eventId: string,
    @Body() payload: Array<{ id?: string; startsAt: string; endsAt?: string | null; capacity?: number | null }>,
  ) {
    const operatorId = req.user.operatorId;
    const now = new Date();

    // Простая защита от front-ошибок: не допускаем дубликатов startsAt внутри одного запроса.
    const seenStarts = new Set<string>();
    for (const s of payload || []) {
      if (!s.startsAt) continue;
      const key = new Date(s.startsAt).toISOString();
      if (seenStarts.has(key)) {
        throw new BadRequestException('Нельзя создать две сессии с одинаковым временем начала.');
      }
      seenStarts.add(key);
    }

    return this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findFirst({
        where: { id: eventId, operatorId },
        select: { id: true, source: true, defaultCapacityTotal: true },
      });
      if (!event) {
        throw new NotFoundException('Событие не найдено');
      }
      if (event.source !== 'MANUAL') {
        throw new BadRequestException('Расписание доступно только для ручных событий поставщика.');
      }

      const existing = await tx.eventSession.findMany({
        where: {
          eventId,
          startsAt: { gte: now },
          canceledAt: null,
        },
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          capacityTotal: true,
        },
        orderBy: { startsAt: 'asc' },
      });

      const existingIds = existing.map((s) => s.id);
      const sold = existingIds.length
        ? await tx.packageItem.groupBy({
            by: ['sessionId'],
            where: {
              sessionId: { in: existingIds },
              status: { in: ['BOOKED', 'CONFIRMED'] },
            },
            _sum: {
              adultTickets: true,
              childTickets: true,
            },
          })
        : [];

      const soldById: Record<string, number> = {};
      for (const row of sold) {
        const total = (row._sum.adultTickets ?? 0) + (row._sum.childTickets ?? 0);
        soldById[row.sessionId] = total;
      }

      const existingById = new Map(
        existing.map((s) => [
          s.id,
          {
            ...s,
            soldTickets: soldById[s.id] ?? 0,
          },
        ]),
      );

      const seenExistingIds = new Set<string>();

      // Upsert: create / update
      for (const dto of payload || []) {
        const startsAtRaw = dto.startsAt;
        if (!startsAtRaw) {
          throw new BadRequestException('Поле startsAt обязательно для каждой сессии.');
        }
        const startsAt = new Date(startsAtRaw);
        if (Number.isNaN(startsAt.getTime())) {
          throw new BadRequestException(`Некорректное значение startsAt: ${startsAtRaw}`);
        }
        const endsAt =
          dto.endsAt === undefined || dto.endsAt === null ? null : new Date(dto.endsAt as string | Date);
        if (dto.endsAt && endsAt && Number.isNaN(endsAt.getTime())) {
          throw new BadRequestException(`Некорректное значение endsAt: ${dto.endsAt}`);
        }

        if (dto.id) {
          const current = existingById.get(dto.id);
          if (!current) {
            throw new BadRequestException('Сессия не найдена или недоступна для редактирования.');
          }
          seenExistingIds.add(dto.id);

          const soldTickets = current.soldTickets ?? 0;
          const isTimeChanged =
            current.startsAt.getTime() !== startsAt.getTime() ||
            (current.endsAt?.getTime() ?? 0) !== (endsAt?.getTime() ?? 0);

          // Жёсткая защита: если есть продажи, запрещаем менять время.
          if (soldTickets > 0 && isTimeChanged) {
            throw new BadRequestException(
              'Нельзя изменить время сеанса, по которому уже есть проданные билеты. Измените только вместимость.',
            );
          }

          const nextCapacity: number | null | undefined = dto.capacity ?? current.capacityTotal ?? null;
          if (nextCapacity !== null && nextCapacity !== undefined && nextCapacity < soldTickets) {
            throw new BadRequestException(
              `Нельзя уменьшить вместимость ниже проданных билетов (${soldTickets}).`,
            );
          }

          const updateData: Prisma.EventSessionUpdateInput = {};
          if (isTimeChanged) {
            updateData.startsAt = startsAt;
            updateData.endsAt = endsAt;
          }
          if (dto.capacity !== undefined) {
            updateData.capacityTotal = nextCapacity;
          }

          if (Object.keys(updateData).length > 0) {
            await tx.eventSession.update({
              where: { id: dto.id },
              data: updateData,
            });
          }
        } else {
          // Создать новую сессию
          const capacity = dto.capacity ?? event.defaultCapacityTotal ?? null;
          if (startsAt < now) {
            throw new BadRequestException('Нельзя создавать сессии в прошлом.');
          }
          await tx.eventSession.create({
            data: {
              eventId,
              startsAt,
              endsAt,
              capacityTotal: capacity,
              isActive: true,
              canceledAt: null,
              cancelReason: null,
              tcSessionId: `supplier-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              prices: [],
            },
          });
        }
      }

      // Soft-delete: то, чего нет в payload.
      for (const s of existing) {
        if (seenExistingIds.has(s.id)) continue;
        const soldTickets = soldById[s.id] ?? 0;
        if (soldTickets > 0) {
          throw new BadRequestException(
            'Нельзя удалить сеанс, по которому уже есть проданные билеты. Сначала отмените или перенесите без продаж.',
          );
        }
        await tx.eventSession.update({
          where: { id: s.id },
          data: {
            isActive: false,
            canceledAt: now,
            cancelReason: 'Удалено через расписание поставщика',
          },
        });
      }

      // Вернём актуальный список, как в GET.
      const updatedSessions = await tx.eventSession.findMany({
        where: {
          eventId,
          startsAt: { gte: now },
          canceledAt: null,
        },
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          capacityTotal: true,
        },
        orderBy: { startsAt: 'asc' },
      });

      if (updatedSessions.length === 0) {
        return [];
      }

      const updatedIds = updatedSessions.map((s) => s.id);
      const updatedSold = await tx.packageItem.groupBy({
        by: ['sessionId'],
        where: {
          sessionId: { in: updatedIds },
          status: { in: ['BOOKED', 'CONFIRMED'] },
        },
        _sum: {
          adultTickets: true,
          childTickets: true,
        },
      });
      const updatedSoldById: Record<string, number> = {};
      for (const row of updatedSold) {
        const total = (row._sum.adultTickets ?? 0) + (row._sum.childTickets ?? 0);
        updatedSoldById[row.sessionId] = total;
      }

      return updatedSessions.map((s) => ({
        id: s.id,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt ? s.endsAt.toISOString() : null,
        capacity: s.capacityTotal ?? null,
        soldTickets: updatedSoldById[s.id] ?? 0,
      }));
    });
  }

  // ─── Offers ───────────────────────────────────────────────────────────────

  @Get('events/:eventId/offers')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard, OperatorScopeGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Офферы события' })
  async listOffers(@Req() req: { user: SupplierAuthUser }, @Param('eventId') eventId: string) {
    const event = await this.prisma.event.findFirst({ where: { id: eventId, operatorId: req.user.operatorId } });
    if (!event) throw new NotFoundException('Событие не найдено');
    return this.prisma.eventOffer.findMany({ where: { eventId }, orderBy: { priority: 'asc' } });
  }

  @Post('events/:eventId/offers')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard, OperatorScopeGuard)
  @SupplierRoles('OWNER', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Добавить оффер' })
  async createOffer(@Req() req: { user: SupplierAuthUser }, @Param('eventId') eventId: string, @Body() data: CreateSupplierOfferDto) {
    await this.rbac.requireSupplierRole(req.user.id, req.user.operatorId, [
      SupplierRole.OWNER,
      SupplierRole.MANAGER,
    ]);
    const event = await this.prisma.event.findFirst({ where: { id: eventId, operatorId: req.user.operatorId } });
    if (!event) throw new NotFoundException('Событие не найдено');
    let widgetProvider = data.widgetProvider || null;
    let widgetPayload = data.widgetPayload || null;
    if (data.purchaseType === 'WIDGET') {
      if (!widgetProvider) widgetProvider = data.source || 'TC';
      if (widgetPayload) {
        widgetPayload = ensurePayloadVersion(widgetPayload as Record<string, unknown>);
        const validation = validateWidgetPayload(widgetProvider, widgetPayload);
        if (!validation.valid) throw new BadRequestException(`Невалидный widgetPayload: ${validation.errors?.join('; ')}`);
      }
    }
    return this.prisma.eventOffer.create({
      data: {
        eventId,
        source: (data.source || 'MANUAL') as OfferSource,
        purchaseType: data.purchaseType || 'REQUEST',
        deeplink: data.deeplink || null,
        priceFrom: data.priceFrom || null,
        status: 'ACTIVE',
        priority: data.priority || 0,
        badge: data.badge || null,
        commissionPercent: data.commission || null,
        operatorId: req.user.operatorId,
        widgetProvider,
        widgetPayload: (widgetPayload ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  @Put('events/:eventId/offers/:offerId')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard, OperatorScopeGuard)
  @SupplierRoles('OWNER', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить оффер' })
  async updateOffer(@Req() req: { user: SupplierAuthUser }, @Param('eventId') eventId: string, @Param('offerId') offerId: string, @Body() data: UpdateSupplierOfferDto) {
    await this.rbac.requireSupplierRole(req.user.id, req.user.operatorId, [
      SupplierRole.OWNER,
      SupplierRole.MANAGER,
    ]);
    const offer = await this.prisma.eventOffer.findFirst({
      where: { id: offerId, eventId, event: { operatorId: req.user.operatorId } },
    });
    if (!offer) throw new NotFoundException('Оффер не найден');
    const updateData: Prisma.EventOfferUpdateInput = {};
    if (data.purchaseType !== undefined) updateData.purchaseType = data.purchaseType;
    if (data.deeplink !== undefined) updateData.deeplink = data.deeplink;
    if (data.priceFrom !== undefined) updateData.priceFrom = data.priceFrom;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.badge !== undefined) updateData.badge = data.badge;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.widgetProvider !== undefined) updateData.widgetProvider = data.widgetProvider;
    if (data.widgetPayload !== undefined) updateData.widgetPayload = data.widgetPayload as Prisma.InputJsonValue;
    return this.prisma.eventOffer.update({ where: { id: offerId }, data: updateData });
  }

  @Delete('events/:eventId/offers/:offerId')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard, OperatorScopeGuard)
  @OperatorScope('Event', 'eventId')
  @SupplierRoles('OWNER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить оффер' })
  async deleteOffer(@Req() req: { user: SupplierAuthUser }, @Param('eventId') eventId: string, @Param('offerId') offerId: string) {
    await this.rbac.requireSupplierRole(req.user.id, req.user.operatorId, [SupplierRole.OWNER]);
    const offer = await this.prisma.eventOffer.findFirst({
      where: { id: offerId, eventId, event: { operatorId: req.user.operatorId } },
    });
    if (!offer) throw new NotFoundException('Оффер не найден');
    await this.prisma.eventSession.updateMany({ where: { offerId }, data: { isActive: false } });
    await this.prisma.eventOffer.update({
      where: { id: offerId },
      data: { isDeleted: true, deletedAt: new Date(), status: 'DISABLED' },
    });
    return { message: 'Оффер удалён (soft-delete)' };
  }

  // ─── Reviews ────────────────────────────────────────────────────────────────

  @Get('reviews')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard, OperatorScopeGuard)
  @SupplierRoles('OWNER', 'MANAGER', 'CONTENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Список отзывов поставщика' })
  async listReviews(
    @Req() req: { user: SupplierAuthUser },
    @Query('tab') tab: 'all' | 'needs_response' | 'disputed' | 'responded' = 'all',
    @Query() query: { page?: string; limit?: string },
  ) {
    return this.reviewsService.list(req.user.operatorId, tab, query);
  }

  @Get('reviews/:id')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard, OperatorScopeGuard)
  @SupplierRoles('OWNER', 'MANAGER', 'CONTENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Детали отзыва' })
  async getReview(@Req() req: { user: SupplierAuthUser }, @Param('id') id: string) {
    return this.reviewsService.getOne(req.user.operatorId, id);
  }

  @Post('reviews/:id/response')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard, OperatorScopeGuard)
  @SupplierRoles('OWNER', 'MANAGER', 'CONTENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать/обновить ответ на отзыв (draft)' })
  async createOrUpdateResponse(
    @Req() req: { user: SupplierAuthUser },
    @Param('id') reviewId: string,
    @Body() dto: CreateSupplierResponseDto,
  ) {
    return this.reviewsService.upsertResponse(req.user.operatorId, req.user.id, reviewId, dto);
  }

  @Post('reviews/:id/response/submit')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard, OperatorScopeGuard)
  @SupplierRoles('OWNER', 'MANAGER', 'CONTENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отправить ответ на модерацию' })
  async submitResponse(@Req() req: { user: SupplierAuthUser }, @Param('id') reviewId: string) {
    return this.reviewsService.submitResponse(req.user.operatorId, req.user.id, reviewId);
  }

  @Post('reviews/:id/accept')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard, OperatorScopeGuard)
  @SupplierRoles('OWNER', 'MANAGER', 'CONTENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Принять отзыв без оспаривания' })
  async acceptReview(@Req() req: { user: SupplierAuthUser }, @Param('id') reviewId: string) {
    return this.reviewsService.accept(req.user.operatorId, req.user.id, reviewId);
  }

  @Post('reviews/:id/dispute')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard, OperatorScopeGuard)
  @SupplierRoles('OWNER', 'MANAGER', 'CONTENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Оспорить отзыв' })
  async createDispute(
    @Req() req: { user: SupplierAuthUser },
    @Param('id') reviewId: string,
    @Body() dto: CreateDisputeDto,
  ) {
    return this.reviewsService.createDispute(req.user.operatorId, req.user.id, reviewId, dto);
  }

  @Get('disputes')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard, OperatorScopeGuard)
  @SupplierRoles('OWNER', 'MANAGER', 'CONTENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Список оспариваний' })
  async listDisputes(@Req() req: { user: SupplierAuthUser }, @Query() query: { page?: string; limit?: string }) {
    return this.reviewsService.listDisputes(req.user.operatorId, query);
  }

  @Post('disputes/:id/evidence')
  @UseGuards(SupplierJwtGuard, SupplierRolesGuard, OperatorScopeGuard)
  @SupplierRoles('OWNER', 'MANAGER', 'CONTENT')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Загрузить доказательство для оспаривания' })
  async addDisputeEvidence(
    @Req() req: { user: SupplierAuthUser },
    @Param('id') disputeId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Файл не загружен');
    return this.reviewsService.addEvidence(req.user.operatorId, disputeId, file);
  }
}
