import { Controller, Post, Get, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { Request } from 'express';

@ApiTags('checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  // ============================
  // TC — прямая покупка билетов
  // ============================

  @Post('tc')
  @ApiOperation({
    summary: 'Создать заказ в Ticketscloud (резерв билетов на 15 мин)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'ID, slug или tcEventId события',
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              setId: { type: 'string', description: 'TC set ID' },
              quantity: { type: 'number', description: 'Количество билетов' },
            },
          },
        },
        customerEmail: { type: 'string', description: 'Email покупателя' },
        customerName: { type: 'string', description: 'Имя покупателя' },
      },
      required: ['eventId', 'items'],
    },
  })
  createTcOrder(
    @Body()
    body: {
      eventId: string;
      items: Array<{ setId: string; quantity: number }>;
      customerEmail?: string;
      customerName?: string;
    },
  ) {
    return this.checkoutService.createTcOrder(body);
  }

  @Post('tc/:orderId/confirm')
  @ApiOperation({ summary: 'Подтвердить заказ TC (после оплаты)' })
  confirmTcOrder(@Param('orderId') orderId: string) {
    return this.checkoutService.confirmTcOrder(orderId);
  }

  @Post('tc/:orderId/cancel')
  @ApiOperation({ summary: 'Отменить заказ TC' })
  cancelTcOrder(@Param('orderId') orderId: string) {
    return this.checkoutService.cancelTcOrder(orderId);
  }

  // ============================
  // Trip Planner — пакеты
  // ============================

  @Post()
  @ApiOperation({ summary: 'Создать пакет и инициировать оплату (Trip Planner)' })
  createCheckout(@Body() body: any) {
    return this.checkoutService.create(body);
  }

  @Post('webhook/yookassa')
  @ApiOperation({ summary: 'Webhook от YooKassa' })
  handleYookassaWebhook(@Body() body: any) {
    return this.checkoutService.handleWebhook(body);
  }

  @Get(':packageId/status')
  @ApiOperation({ summary: 'Статус пакета после оплаты' })
  getStatus(@Param('packageId') packageId: string) {
    return this.checkoutService.getStatus(packageId);
  }

  // ============================
  // Cart Checkout (новые endpoints)
  // ============================

  @Post('validate')
  @ApiOperation({ summary: 'Валидировать корзину (проверка наличия/цен)' })
  validateCart(@Body() body: { items: any[] }) {
    return this.checkoutService.validateCart(body.items);
  }

  @Post('session')
  @ApiOperation({ summary: 'Создать checkout session + order requests' })
  createSession(@Body() body: any, @Req() req: Request) {
    return this.checkoutService.createCheckoutSession({
      items: body.items,
      customer: body.customer,
      utm: body.utm,
      referrer: req.headers.referer || body.referrer,
      userAgent: req.headers['user-agent'],
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
    });
  }

  @Get('session/:id')
  @ApiOperation({ summary: 'Статус checkout session' })
  getSession(@Param('id') id: string) {
    return this.checkoutService.getCheckoutSession(id);
  }

  @Post('request')
  @ApiOperation({ summary: 'Быстрая заявка (без корзины, для REQUEST_ONLY)' })
  createQuickRequest(@Body() body: { eventId: string; offerId?: string; name: string; email: string; phone: string; comment?: string }) {
    return this.checkoutService.createQuickRequest(body);
  }
}
