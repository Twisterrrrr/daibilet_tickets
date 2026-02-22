import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OfferSource } from '@prisma/client';
import type { PartnerAuthUser } from '../auth/auth.types';
import type { Request as ExpressRequest } from 'express';

import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePartnerEventDto,
  CreatePartnerOfferDto,
  PatchAvailabilityDto,
  UpdatePartnerEventDto,
  UpdatePartnerOfferDto,
} from './dto/partner.dto';
import { ApiKeyGuard } from './partner-auth.guard';

@ApiTags('partner')
@ApiBearerAuth()
@UseGuards(ApiKeyGuard)
@Controller('partner')
export class PartnerEventsController {
  constructor(private readonly prisma: PrismaService) {}

  // ============================
  // Events
  // ============================

  /**
   * Создать или обновить событие (upsert по externalId).
   */
  @Post('events')
  @ApiOperation({ summary: 'Создать/обновить событие (upsert)' })
  async upsertEvent(@Req() req: ExpressRequest & { user: PartnerAuthUser }, @Body() data: CreatePartnerEventDto) {
    const operatorId = req.user.operatorId;
    const tcEventId = `partner-${operatorId.slice(0, 8)}-${data.externalId}`;

    // Проверяем, существует ли
    const existing = await this.prisma.event.findFirst({
      where: { tcEventId, operatorId },
    });

    const slug =
      (data.title || 'event')
        .toLowerCase()
        .replace(/[^a-zа-яё0-9]/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Date.now().toString(36);

    if (existing) {
      // Update
      return this.prisma.event.update({
        where: { id: existing.id },
        data: {
          title: data.title,
          description: data.description,
          shortDescription: data.shortDescription,
          category: data.category,
          audience: data.audience,
          durationMinutes: data.durationMinutes,
          address: data.address,
          imageUrl: data.imageUrl,
          galleryUrls: data.galleryUrls || [],
          priceFrom: data.priceFrom,
          isActive: data.isActive ?? true,
        },
      });
    }

    // Create
    const operator = await this.prisma.operator.findUnique({
      where: { id: operatorId },
      select: { trustLevel: true },
    });

    const moderationStatus = (operator?.trustLevel ?? 0) >= 1 ? 'AUTO_APPROVED' : 'PENDING_REVIEW';

    return this.prisma.event.create({
      data: {
        source: OfferSource.MANUAL,
        tcEventId,
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
        isActive: moderationStatus !== 'PENDING_REVIEW',
        operatorId,
        supplierId: operatorId,
        moderationStatus,
      },
    });
  }

  /**
   * Обновить событие по externalId.
   */
  @Put('events/:externalId')
  @ApiOperation({ summary: 'Обновить событие' })
  async updateEvent(@Req() req: ExpressRequest & { user: PartnerAuthUser }, @Param('externalId') externalId: string, @Body() data: UpdatePartnerEventDto) {
    const operatorId = req.user.operatorId;
    const tcEventId = `partner-${operatorId.slice(0, 8)}-${externalId}`;

    const event = await this.prisma.event.findFirst({
      where: { tcEventId, operatorId },
    });
    if (!event) throw new NotFoundException(`Event ${externalId} not found`);

    return this.prisma.event.update({
      where: { id: event.id },
      data: {
        title: data.title ?? event.title,
        description: data.description ?? event.description,
        shortDescription: data.shortDescription ?? event.shortDescription,
        durationMinutes: data.durationMinutes ?? event.durationMinutes,
        address: data.address ?? event.address,
        imageUrl: data.imageUrl ?? event.imageUrl,
        priceFrom: data.priceFrom ?? event.priceFrom,
        isActive: data.isActive ?? event.isActive,
      },
    });
  }

  /**
   * Деактивировать событие.
   */
  @Delete('events/:externalId')
  @ApiOperation({ summary: 'Деактивировать событие' })
  async deleteEvent(@Req() req: ExpressRequest & { user: PartnerAuthUser }, @Param('externalId') externalId: string) {
    const operatorId = req.user.operatorId;
    const tcEventId = `partner-${operatorId.slice(0, 8)}-${externalId}`;

    const event = await this.prisma.event.findFirst({
      where: { tcEventId, operatorId },
    });
    if (!event) throw new NotFoundException(`Event ${externalId} not found`);

    await this.prisma.event.update({
      where: { id: event.id },
      data: { isActive: false },
    });

    return { message: 'Event deactivated', id: event.id };
  }

  // ============================
  // Offers
  // ============================

  /**
   * Добавить/обновить оффер для события.
   */
  @Post('events/:externalId/offers')
  @ApiOperation({ summary: 'Добавить/обновить оффер' })
  async upsertOffer(
    @Req() req: ExpressRequest & { user: PartnerAuthUser },
    @Param('externalId') eventExternalId: string,
    @Body() data: CreatePartnerOfferDto,
  ) {
    const operatorId = req.user.operatorId;
    const tcEventId = `partner-${operatorId.slice(0, 8)}-${eventExternalId}`;

    const event = await this.prisma.event.findFirst({
      where: { tcEventId, operatorId },
    });
    if (!event) throw new NotFoundException(`Event ${eventExternalId} not found`);

    const offerExternalId = data.externalId || eventExternalId;
    const source = (data.source || OfferSource.MANUAL) as OfferSource;

    // Ищем существующий оффер
    const existing = await this.prisma.eventOffer.findFirst({
      where: { eventId: event.id, operatorId, externalEventId: offerExternalId },
    });

    if (existing) {
      return this.prisma.eventOffer.update({
        where: { id: existing.id },
        data: {
          purchaseType: data.purchaseType || existing.purchaseType,
          deeplink: data.deeplink ?? existing.deeplink,
          priceFrom: data.priceFrom ?? existing.priceFrom,
          priority: data.priority ?? existing.priority,
          badge: data.badge ?? existing.badge,
          status: data.status || existing.status,
          availabilityMode: data.availabilityMode ?? existing.availabilityMode,
        },
      });
    }

    return this.prisma.eventOffer.create({
      data: {
        eventId: event.id,
        source,
        purchaseType: data.purchaseType || 'REQUEST',
        externalEventId: offerExternalId,
        deeplink: data.deeplink || null,
        priceFrom: data.priceFrom || null,
        status: 'ACTIVE',
        priority: data.priority || 0,
        badge: data.badge || null,
        operatorId,
        availabilityMode: data.availabilityMode || 'UNKNOWN',
      },
    });
  }

  /**
   * Обновить оффер по externalId.
   */
  @Put('offers/:externalId')
  @ApiOperation({ summary: 'Обновить оффер' })
  async updateOffer(@Req() req: ExpressRequest & { user: PartnerAuthUser }, @Param('externalId') externalId: string, @Body() data: UpdatePartnerOfferDto) {
    const offer = await this.prisma.eventOffer.findFirst({
      where: { externalEventId: externalId, operatorId: req.user.operatorId },
    });
    if (!offer) throw new NotFoundException(`Offer ${externalId} not found`);

    return this.prisma.eventOffer.update({
      where: { id: offer.id },
      data: {
        purchaseType: data.purchaseType,
        deeplink: data.deeplink,
        priceFrom: data.priceFrom,
        priority: data.priority,
        badge: data.badge,
        status: data.status,
        availabilityMode: data.availabilityMode,
      },
    });
  }

  /**
   * Быстрое обновление наличия/цены.
   */
  @Patch('offers/:externalId/availability')
  @ApiOperation({ summary: 'Обновить наличие/цену' })
  async updateAvailability(
    @Req() req: ExpressRequest & { user: PartnerAuthUser },
    @Param('externalId') externalId: string,
    @Body() data: PatchAvailabilityDto,
  ) {
    const offer = await this.prisma.eventOffer.findFirst({
      where: { externalEventId: externalId, operatorId: req.user.operatorId },
    });
    if (!offer) throw new NotFoundException(`Offer ${externalId} not found`);

    const updateData: any = {};
    if (data.priceFrom !== undefined) updateData.priceFrom = data.priceFrom;
    if (data.availabilityMode) updateData.availabilityMode = data.availabilityMode;
    if (data.status) updateData.status = data.status;

    return this.prisma.eventOffer.update({
      where: { id: offer.id },
      data: updateData,
    });
  }

  /**
   * Служебный: whoami.
   */
  @Get('whoami')
  @ApiOperation({ summary: 'Информация о текущем ключе' })
  whoami(@Req() req: ExpressRequest & { user: PartnerAuthUser }) {
    return {
      operatorId: req.user.operatorId,
      operatorName: req.user.operatorName,
      apiKeyId: req.user.apiKeyId,
      apiKeyName: req.user.apiKeyName,
      type: req.user.type,
    };
  }
}
