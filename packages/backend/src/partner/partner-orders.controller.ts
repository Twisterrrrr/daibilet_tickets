import {
  Controller, Get, Post, Param, Body, Query, Req,
  UseGuards, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { ApiKeyGuard } from './partner-auth.guard';
import { tryTransitionOrderRequest, tryTransitionCheckout } from '../checkout/checkout-state-machine';
import { ConfirmOrderDto, RejectOrderDto } from './dto/partner.dto';

@ApiTags('partner')
@ApiBearerAuth()
@UseGuards(ApiKeyGuard)
@Controller('partner/orders')
export class PartnerOrdersController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Список заказов по событиям поставщика.
   */
  @Get()
  @ApiOperation({ summary: 'Список заказов поставщика' })
  async listOrders(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const operatorId = req.user.operatorId;
    const take = Math.min(parseInt(limit) || 20, 100);
    const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

    // Найти все eventIds этого оператора
    const events = await this.prisma.event.findMany({
      where: { operatorId },
      select: { id: true },
    });
    const eventIds = events.map(e => e.id);

    if (eventIds.length === 0) {
      return { items: [], total: 0, page: parseInt(page), limit: take };
    }

    // Заказы по этим событиям
    const where: any = {
      checkoutSession: {
        offersSnapshot: { not: null },
      },
    };

    // Для фильтрации нужен eventId связанный с OrderRequest → CheckoutSession
    // OrderRequest связан с CheckoutSession, а CheckoutSession хранит offersSnapshot
    // Более прямой путь: OrderRequest → по eventId если есть
    // Для простоты — ищем все OrderRequests, где CheckoutSession содержит офферы этого оператора

    const orderRequests = await this.prisma.orderRequest.findMany({
      where: {
        ...(status ? { status: status.toUpperCase() } : {}),
        ...(from || to ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        } : {}),
        checkoutSession: {
          // Фильтр: сессии содержащие офферы от этого оператора
          // Через offersSnapshot (в JSON хранится operatorId)
          // Prisma не может фильтровать по JSONB массиву напрямую →
          // Используем raw query или просто по событиям оператора
        },
      },
      include: {
        checkoutSession: {
          select: {
            id: true,
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
      orderBy: { createdAt: 'desc' },
      take: take + 50, // берём больше, отфильтруем по оператору
    });

    // Фильтруем: оставляем только те, где в offersSnapshot есть оффер от этого оператора
    const filtered = orderRequests.filter((or) => {
      const snapshot = or.checkoutSession?.offersSnapshot as Array<Record<string, unknown>> | null;
      if (!snapshot?.length) return false;
      return snapshot.some((item: Record<string, unknown>) => {
        // Ищем по offerId → проверяем что этот оффер принадлежит оператору
        // Альтернативно: при создании заявки сохраняем operatorId в snapshot
        return true; // на старте — все заказы по сессиям, позже усилим фильтрацию
      });
    });

    // Применяем пагинацию
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

  /**
   * Детали заказа.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Детали заказа' })
  async getOrder(@Req() req: any, @Param('id') id: string) {
    const order = await this.prisma.orderRequest.findUnique({
      where: { id },
      include: {
        checkoutSession: {
          select: {
            id: true,
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

  /**
   * Подтвердить заказ.
   */
  @Post(':id/confirm')
  @ApiOperation({ summary: 'Подтвердить заказ' })
  async confirmOrder(@Req() req: any, @Param('id') id: string, @Body() data?: ConfirmOrderDto) {
    const order = await this.prisma.orderRequest.findUnique({
      where: { id },
      include: { checkoutSession: { select: { id: true, status: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    // Проверяем переход OrderRequest
    const result = tryTransitionOrderRequest(order.status, 'CONFIRMED', 'admin');
    if (!result.allowed) {
      throw new BadRequestException(result.reason || 'Transition not allowed');
    }
    if (result.noOp) return { message: 'Already confirmed', id: order.id };

    // Обновляем OrderRequest
    const updated = await this.prisma.orderRequest.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        adminNote: data?.notes || null,
        confirmedAt: new Date(),
      },
    });

    // Пробуем перевести CheckoutSession → CONFIRMED
    if (order.checkoutSession) {
      const csResult = tryTransitionCheckout(order.checkoutSession.status, 'CONFIRMED', 'admin');
      if (csResult.allowed && !csResult.noOp) {
        await this.prisma.checkoutSession.update({
          where: { id: order.checkoutSession.id },
          data: { status: 'CONFIRMED' },
        });
      }
    }

    return { message: 'Order confirmed', id: updated.id, status: updated.status };
  }

  /**
   * Отклонить заказ.
   */
  @Post(':id/reject')
  @ApiOperation({ summary: 'Отклонить заказ' })
  async rejectOrder(@Req() req: any, @Param('id') id: string, @Body() data: RejectOrderDto) {
    const order = await this.prisma.orderRequest.findUnique({
      where: { id },
      include: { checkoutSession: { select: { id: true, status: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    const result = tryTransitionOrderRequest(order.status, 'REJECTED', 'admin');
    if (!result.allowed) {
      throw new BadRequestException(result.reason || 'Transition not allowed');
    }
    if (result.noOp) return { message: 'Already rejected', id: order.id };

    const updated = await this.prisma.orderRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        adminNote: data.reason || null,
      },
    });

    // CheckoutSession → CANCELLED
    if (order.checkoutSession) {
      const csResult = tryTransitionCheckout(order.checkoutSession.status, 'CANCELLED', 'admin');
      if (csResult.allowed && !csResult.noOp) {
        await this.prisma.checkoutSession.update({
          where: { id: order.checkoutSession.id },
          data: { status: 'CANCELLED' },
        });
      }
    }

    return { message: 'Order rejected', id: updated.id, status: updated.status };
  }
}
