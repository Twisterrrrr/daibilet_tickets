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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OfferSource, Prisma } from '@prisma/client';
import type { RequestWithUser } from '../auth/auth.types';
import type { SupplierAuthUser } from '../auth/auth.types';

import { buildPaginatedResult, paginationArgs, parsePagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSupplierEventDto,
  CreateSupplierOfferDto,
  UpdateSupplierEventDto,
  UpdateSupplierOfferDto,
} from './dto/supplier.dto';
import { SupplierJwtGuard, SupplierRoles, SupplierRolesGuard } from './supplier.guard';

@ApiTags('supplier')
@ApiBearerAuth()
@UseGuards(SupplierJwtGuard, SupplierRolesGuard)
@Controller('supplier/events')
export class SupplierEventsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Список событий поставщика (только свои).
   */
  @Get()
  @ApiOperation({ summary: 'Мои события' })
  async list(
    @Req() req: RequestWithUser<SupplierAuthUser>,
    @Query('status') status?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pg = parsePagination({ cursor, page, limit: limit || '25' });
    const where: any = { operatorId: req.user.operatorId };

    if (status) where.moderationStatus = status;

    const [rawItems, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        include: {
          city: { select: { id: true, name: true } },
          _count: { select: { offers: true, reviews: true } },
        },
        orderBy: { createdAt: 'desc' },
        ...paginationArgs(pg),
      }),
      this.prisma.event.count({ where }),
    ]);

    return buildPaginatedResult(rawItems, total, pg.limit);
  }

  /**
   * Детали события.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Детали события' })
  async getEvent(@Req() req: RequestWithUser<SupplierAuthUser>, @Param('id') id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, operatorId: req.user.operatorId },
      include: {
        city: { select: { id: true, name: true, slug: true } },
        offers: true,
        tags: { include: { tag: true } },
      },
    });
    if (!event) throw new NotFoundException('Событие не найдено');
    return event;
  }

  /**
   * Создать событие. Trust level определяет moderationStatus.
   */
  @Post()
  @SupplierRoles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Создать событие' })
  async create(@Req() req: RequestWithUser<SupplierAuthUser>, @Body() data: CreateSupplierEventDto) {
    const operator = await this.prisma.operator.findUnique({
      where: { id: req.user.operatorId },
      select: { trustLevel: true },
    });

    // ModerationStatus по trust level
    let moderationStatus: string;
    if (operator!.trustLevel >= 2) {
      moderationStatus = 'AUTO_APPROVED';
    } else if (operator!.trustLevel >= 1) {
      moderationStatus = 'AUTO_APPROVED'; // но попадёт в очередь пост-модерации
    } else {
      moderationStatus = 'PENDING_REVIEW';
    }

    // Генерация slug
    const slug =
      (data.title || 'event')
        .toLowerCase()
        .replace(/[^a-zа-яё0-9]/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Date.now().toString(36);

    const event = await this.prisma.event.create({
      data: {
        source: 'MANUAL' as any,
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
        isActive: moderationStatus !== 'PENDING_REVIEW', // скрыть до модерации
        operatorId: req.user.operatorId,
        supplierId: req.user.operatorId,
        moderationStatus: moderationStatus as any,
        createdByType: 'SUPPLIER',
        createdById: req.user.id,
      },
    });

    return event;
  }

  /**
   * Обновить событие (только своё, не в статусе APPROVED_LOCKED).
   */
  @Put(':id')
  @SupplierRoles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Обновить событие' })
  async update(@Req() req: RequestWithUser<SupplierAuthUser>, @Param('id') id: string, @Body() data: UpdateSupplierEventDto) {
    const event = await this.prisma.event.findFirst({
      where: { id, operatorId: req.user.operatorId },
    });
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
      },
    });
  }

  /**
   * Отправить событие на модерацию (DRAFT → PENDING_REVIEW).
   */
  @Post(':id/submit')
  @SupplierRoles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Отправить на модерацию' })
  async submit(@Req() req: RequestWithUser<SupplierAuthUser>, @Param('id') id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, operatorId: req.user.operatorId },
    });
    if (!event) throw new NotFoundException('Событие не найдено');

    if (!['DRAFT', 'REJECTED'].includes(event.moderationStatus)) {
      throw new BadRequestException('Событие уже отправлено или одобрено');
    }

    return this.prisma.event.update({
      where: { id },
      data: { moderationStatus: 'PENDING_REVIEW' },
    });
  }

  // ============================
  // Offers CRUD (для своих событий)
  // ============================

  @Get(':eventId/offers')
  @ApiOperation({ summary: 'Офферы события' })
  async listOffers(@Req() req: RequestWithUser<SupplierAuthUser>, @Param('eventId') eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, operatorId: req.user.operatorId },
    });
    if (!event) throw new NotFoundException('Событие не найдено');

    return this.prisma.eventOffer.findMany({
      where: { eventId },
      orderBy: { priority: 'asc' },
    });
  }

  @Post(':eventId/offers')
  @SupplierRoles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Добавить оффер' })
  async createOffer(@Req() req: RequestWithUser<SupplierAuthUser>, @Param('eventId') eventId: string, @Body() data: CreateSupplierOfferDto) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, operatorId: req.user.operatorId },
    });
    if (!event) throw new NotFoundException('Событие не найдено');

    // Widget validation
    let widgetProvider = data.widgetProvider || null;
    let widgetPayload = data.widgetPayload || null;
    if (data.purchaseType === 'WIDGET') {
      if (!widgetProvider) widgetProvider = data.source || 'TC';
      if (widgetPayload) {
        widgetPayload = ensurePayloadVersion(widgetPayload as Record<string, unknown>);
        const validation = validateWidgetPayload(widgetProvider, widgetPayload);
        if (!validation.valid) {
          throw new BadRequestException(`Невалидный widgetPayload: ${validation.errors?.join('; ')}`);
        }
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

  @Put(':eventId/offers/:offerId')
  @SupplierRoles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Обновить оффер' })
  async updateOffer(
    @Req() req: RequestWithUser<SupplierAuthUser>,
    @Param('eventId') eventId: string,
    @Param('offerId') offerId: string,
    @Body() data: UpdateSupplierOfferDto,
  ) {
    const offer = await this.prisma.eventOffer.findFirst({
      where: { id: offerId, eventId, event: { operatorId: req.user.operatorId } },
    });
    if (!offer) throw new NotFoundException('Оффер не найден');

    const updateData: any = {};
    if (data.purchaseType !== undefined) updateData.purchaseType = data.purchaseType;
    if (data.deeplink !== undefined) updateData.deeplink = data.deeplink;
    if (data.priceFrom !== undefined) updateData.priceFrom = data.priceFrom;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.badge !== undefined) updateData.badge = data.badge;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.widgetProvider !== undefined) updateData.widgetProvider = data.widgetProvider;
    if (data.widgetPayload !== undefined) updateData.widgetPayload = data.widgetPayload;

    return this.prisma.eventOffer.update({
      where: { id: offerId },
      data: updateData,
    });
  }

  @Delete(':eventId/offers/:offerId')
  @SupplierRoles('OWNER')
  @ApiOperation({ summary: 'Удалить оффер' })
  async deleteOffer(@Req() req: RequestWithUser<SupplierAuthUser>, @Param('eventId') eventId: string, @Param('offerId') offerId: string) {
    const offer = await this.prisma.eventOffer.findFirst({
      where: { id: offerId, eventId, event: { operatorId: req.user.operatorId } },
    });
    if (!offer) throw new NotFoundException('Оффер не найден');

    // Soft-deactivate related sessions
    await this.prisma.eventSession.updateMany({
      where: { offerId },
      data: { isActive: false },
    });

    // Soft-delete оффера
    await this.prisma.eventOffer.update({
      where: { id: offerId },
      data: { isDeleted: true, deletedAt: new Date(), status: 'DISABLED' },
    });

    return { message: 'Оффер удалён (soft-delete)' };
  }
}
