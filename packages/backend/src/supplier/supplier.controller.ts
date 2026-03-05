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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ModerationStatus, OfferSource, Prisma } from '@prisma/client';
import { Request, Response } from 'express';

import { CurrentSupplierUser } from '../common/decorators/current-supplier-user.decorator';
import type { SupplierAuthUser } from '../common/decorators/current-supplier-user.decorator';
import { OperatorScope } from '../common/guards/operator-scope.guard';
import { OperatorScopeGuard } from '../common/guards/operator-scope.guard';
import { buildPaginatedResult, paginationArgs, parsePagination } from '../common/pagination';
import { streamCsv } from '../common/csv-stream.util';
import { PrismaService } from '../prisma/prisma.service';
import { SupplierLoginDto, SupplierRegisterDto } from './dto/supplier-auth.dto';
import {
  CreateSupplierEventDto,
  CreateSupplierOfferDto,
  UpdateSupplierEventDto,
  UpdateSupplierOfferDto,
  UpdateSupplierSettingsDto,
} from './dto/supplier.dto';
import { SupplierJwtGuard, SupplierRoles, SupplierRolesGuard } from './supplier.guard';
import { SupplierAuthService } from './supplier-auth.service';

@ApiTags('supplier')
@Controller('supplier')
export class SupplierController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: SupplierAuthService,
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
        select: { name: true, trustLevel: true, commissionRate: true, promoRate: true, promoUntil: true, successfulSales: true, verifiedAt: true },
      }),
    ]);
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
    return this.prisma.operator.update({
      where: { id: user.operatorId },
      data: { name: data.name, logo: data.logo, website: data.website, companyName: data.companyName, inn: data.inn, contactEmail: data.contactEmail, contactPhone: data.contactPhone },
    });
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
    const where: Prisma.EventWhereInput = { operatorId: user.operatorId };
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
    const event = await this.prisma.event.findFirst({ where: { id, operatorId: req.user.operatorId } });
    if (!event) throw new NotFoundException('Событие не найдено');
    if (!['DRAFT', 'REJECTED'].includes(event.moderationStatus)) {
      throw new BadRequestException('Событие уже отправлено или одобрено');
    }
    return this.prisma.event.update({ where: { id }, data: { moderationStatus: 'PENDING_REVIEW' } });
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
}
