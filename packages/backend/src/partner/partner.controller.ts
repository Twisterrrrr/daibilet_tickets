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
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventSource } from '@prisma/client';
import { Response } from 'express';

import { tryTransitionCheckout, tryTransitionOrderRequest } from '../checkout/checkout-state-machine';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConfirmOrderDto,
  CreatePartnerEventDto,
  CreatePartnerOfferDto,
  PatchAvailabilityDto,
  RejectOrderDto,
  UpdatePartnerEventDto,
  UpdatePartnerOfferDto,
} from './dto/partner.dto';
import { PartnerApiUser } from '../auth/auth.types';
import { ApiKeyGuard } from './partner-auth.guard';

@ApiTags('partner')
@ApiBearerAuth()
@UseGuards(ApiKeyGuard)
@Controller('partner')
export class PartnerController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('whoami')
  @ApiOperation({ summary: 'Информация о текущем ключе' })
  whoami(@Req() req: { user: PartnerApiUser }) {
    return {
      operatorId: req.user.operatorId,
      operatorName: req.user.operatorName,
      apiKeyId: req.user.apiKeyId,
      apiKeyName: req.user.apiKeyName,
      type: req.user.type,
    };
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  @Post('events')
  @ApiOperation({ summary: 'Создать/обновить событие (upsert)' })
  async upsertEvent(@Req() req: { user: { operatorId: string } }, @Body() data: CreatePartnerEventDto) {
    const operatorId = req.user.operatorId;
    const tcEventId = `partner-${operatorId.slice(0, 8)}-${data.externalId}`;
    const existing = await this.prisma.event.findFirst({ where: { tcEventId, operatorId } });
    const slug =
      (data.title || 'event')
        .toLowerCase()
        .replace(/[^a-zа-яё0-9]/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Date.now().toString(36);

    if (existing) {
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

    const operator = await this.prisma.operator.findUnique({ where: { id: operatorId }, select: { trustLevel: true } });
    const moderationStatus = (operator?.trustLevel ?? 0) >= 1 ? 'AUTO_APPROVED' : 'PENDING_REVIEW';

    return this.prisma.event.create({
      data: {
        source: 'MANUAL',
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

  @Put('events/:externalId')
  @ApiOperation({ summary: 'Обновить событие' })
  async updateEvent(@Req() req: { user: { operatorId: string } }, @Param('externalId') externalId: string, @Body() data: UpdatePartnerEventDto) {
    const operatorId = req.user.operatorId;
    const tcEventId = `partner-${operatorId.slice(0, 8)}-${externalId}`;
    const event = await this.prisma.event.findFirst({ where: { tcEventId, operatorId } });
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

  @Delete('events/:externalId')
  @ApiOperation({ summary: 'Деактивировать событие' })
  async deleteEvent(@Req() req: { user: PartnerApiUser }, @Param('externalId') externalId: string) {
    const operatorId = req.user.operatorId;
    const tcEventId = `partner-${operatorId.slice(0, 8)}-${externalId}`;
    const event = await this.prisma.event.findFirst({ where: { tcEventId, operatorId } });
    if (!event) throw new NotFoundException(`Event ${externalId} not found`);
    await this.prisma.event.update({ where: { id: event.id }, data: { isActive: false } });
    return { message: 'Event deactivated', id: event.id };
  }

  // ─── Offers ───────────────────────────────────────────────────────────────

  @Post('events/:externalId/offers')
  @ApiOperation({ summary: 'Добавить/обновить оффер' })
  async upsertOffer(
    @Req() req: { user: PartnerApiUser },
    @Param('externalId') eventExternalId: string,
    @Body() data: CreatePartnerOfferDto,
  ) {
    const operatorId = req.user.operatorId;
    const tcEventId = `partner-${operatorId.slice(0, 8)}-${eventExternalId}`;
    const event = await this.prisma.event.findFirst({ where: { tcEventId, operatorId } });
    if (!event) throw new NotFoundException(`Event ${eventExternalId} not found`);
    const offerExternalId = data.externalId || eventExternalId;
    const source: EventSource = (data.source || 'MANUAL') as EventSource;
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

  @Put('offers/:externalId')
  @ApiOperation({ summary: 'Обновить оффер' })
  async updateOffer(@Req() req: { user: PartnerApiUser }, @Param('externalId') externalId: string, @Body() data: UpdatePartnerOfferDto) {
    const offer = await this.prisma.eventOffer.findFirst({ where: { externalEventId: externalId, operatorId: req.user.operatorId } });
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

  @Patch('offers/:externalId/availability')
  @ApiOperation({ summary: 'Обновить наличие/цену' })
  async updateAvailability(
    @Req() req: { user: PartnerApiUser },
    @Param('externalId') externalId: string,
    @Body() data: PatchAvailabilityDto,
  ) {
    const offer = await this.prisma.eventOffer.findFirst({ where: { externalEventId: externalId, operatorId: req.user.operatorId } });
    if (!offer) throw new NotFoundException(`Offer ${externalId} not found`);
    const updateData: Record<string, unknown> = {};
    if (data.priceFrom !== undefined) updateData.priceFrom = data.priceFrom;
    if (data.availabilityMode) updateData.availabilityMode = data.availabilityMode;
    if (data.status) updateData.status = data.status;
    return this.prisma.eventOffer.update({ where: { id: offer.id }, data: updateData });
  }

  // ─── Orders ───────────────────────────────────────────────────────────────

  @Get('orders')
  @ApiOperation({ summary: 'Список заказов поставщика' })
  async listOrders(
    @Req() req: { user: { operatorId: string } },
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const operatorId = req.user.operatorId;
    const take = Math.min(parseInt(limit) || 20, 100);
    const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;
    const events = await this.prisma.event.findMany({ where: { operatorId }, select: { id: true } });
    const eventIds = events.map((e) => e.id);

    if (eventIds.length === 0) {
      return { items: [], total: 0, page: parseInt(page), limit: take };
    }

    const orderRequests = await this.prisma.orderRequest.findMany({
      where: {
        ...(status ? { status: status.toUpperCase() } : {}),
        ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
        checkoutSession: {},
      },
      include: {
        checkoutSession: { select: { id: true, status: true, totalPrice: true, customerName: true, customerEmail: true, customerPhone: true, offersSnapshot: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: take + 50,
    });

    const filtered = orderRequests.filter(() => true);
    const paged = filtered.slice(skip, skip + take);

    return {
      items: paged.map((or) => ({
        id: or.id,
        status: or.status,
        sessionId: or.checkoutSessionId,
        customerName: or.checkoutSession?.customerName,
        customerEmail: or.checkoutSession?.customerEmail,
        customerPhone: or.checkoutSession?.customerPhone,
        totalPrice: or.checkoutSession?.totalPrice,
        offers: or.checkoutSession?.offersSnapshot,
        slaMinutes: or.slaMinutes,
        expiresAt: or.expiresAt,
        expireReason: or.expireReason,
        createdAt: or.createdAt,
        updatedAt: or.updatedAt,
      })),
      total: filtered.length,
      page: parseInt(page),
      limit: take,
    };
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Детали заказа' })
  async getOrder(@Req() req: { user: { operatorId: string } }, @Param('id') id: string) {
    const order = await this.prisma.orderRequest.findUnique({
      where: { id },
      include: { checkoutSession: { select: { id: true, status: true, totalPrice: true, customerName: true, customerEmail: true, customerPhone: true, offersSnapshot: true, createdAt: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    return {
      id: order.id,
      status: order.status,
      sessionId: order.checkoutSessionId,
      customerName: order.checkoutSession?.customerName,
      customerEmail: order.checkoutSession?.customerEmail,
      customerPhone: order.checkoutSession?.customerPhone,
      totalPrice: order.checkoutSession?.totalPrice,
      offers: order.checkoutSession?.offersSnapshot,
      adminNotes: order.adminNote,
      slaMinutes: order.slaMinutes,
      expiresAt: order.expiresAt,
      expireReason: order.expireReason,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  @Post('orders/:id/confirm')
  @ApiOperation({ summary: 'Подтвердить заказ' })
  async confirmOrder(@Req() req: { user: { operatorId: string } }, @Param('id') id: string, @Body() data?: ConfirmOrderDto) {
    const order = await this.prisma.orderRequest.findUnique({
      where: { id },
      include: { checkoutSession: { select: { id: true, status: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    const result = tryTransitionOrderRequest(order.status, 'CONFIRMED', 'admin');
    if (!result.allowed) throw new BadRequestException(result.reason || 'Transition not allowed');
    if (result.noOp) return { message: 'Already confirmed', id: order.id };
    const updated = await this.prisma.orderRequest.update({
      where: { id },
      data: { status: 'CONFIRMED', adminNote: data?.notes || null, confirmedAt: new Date() },
    });
    if (order.checkoutSession) {
      const csResult = tryTransitionCheckout(order.checkoutSession.status, 'CONFIRMED', 'admin');
      if (csResult.allowed && !csResult.noOp) {
        await this.prisma.checkoutSession.update({ where: { id: order.checkoutSession.id }, data: { status: 'CONFIRMED' } });
      }
    }
    return { message: 'Order confirmed', id: updated.id, status: updated.status };
  }

  @Post('orders/:id/reject')
  @ApiOperation({ summary: 'Отклонить заказ' })
  async rejectOrder(@Req() req: { user: { operatorId: string } }, @Param('id') id: string, @Body() data: RejectOrderDto) {
    const order = await this.prisma.orderRequest.findUnique({
      where: { id },
      include: { checkoutSession: { select: { id: true, status: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    const result = tryTransitionOrderRequest(order.status, 'REJECTED', 'admin');
    if (!result.allowed) throw new BadRequestException(result.reason || 'Transition not allowed');
    if (result.noOp) return { message: 'Already rejected', id: order.id };
    const updated = await this.prisma.orderRequest.update({
      where: { id },
      data: { status: 'REJECTED', adminNote: data.reason || null },
    });
    if (order.checkoutSession) {
      const csResult = tryTransitionCheckout(order.checkoutSession.status, 'CANCELLED', 'admin');
      if (csResult.allowed && !csResult.noOp) {
        await this.prisma.checkoutSession.update({ where: { id: order.checkoutSession.id }, data: { status: 'CANCELLED' } });
      }
    }
    return { message: 'Order rejected', id: updated.id, status: updated.status };
  }

  // ─── Reports ──────────────────────────────────────────────────────────────

  @Get('reports/sales')
  @ApiOperation({ summary: 'Продажи за период' })
  async salesReport(
    @Req() req: { user: { operatorId: string } },
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const operatorId = req.user.operatorId;
    const where: { supplierId: string; status: 'PAID'; createdAt?: { gte?: Date; lte?: Date } } = { supplierId: operatorId, status: 'PAID' };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const payments = await this.prisma.paymentIntent.findMany({
      where,
      select: { id: true, checkoutSessionId: true, grossAmount: true, platformFee: true, supplierAmount: true, commissionRate: true, status: true, createdAt: true },
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
      const rows = payments.map(
        (p) => `${p.id},${p.checkoutSessionId},${p.grossAmount || 0},${p.platformFee || 0},${p.supplierAmount || 0},${p.commissionRate || ''},${p.status},${p.createdAt.toISOString()}`,
      );
      const csv = [header, ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="sales-${new Date().toISOString().slice(0, 10)}.csv"`);
      return csv;
    }

    return { period: { from: from || null, to: to || null }, totals, items: payments };
  }
}
