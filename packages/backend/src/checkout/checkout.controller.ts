import { InjectQueue } from '@nestjs/bullmq';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Queue } from 'bullmq';
import { Request } from 'express';

import { QUEUE_FULFILLMENT } from '../queue/queue.constants';
import { CheckoutService } from './checkout.service';
import {
  CreateCheckoutSessionDto,
  CreateGiftCertificateCheckoutDto,
  CreateOrderRequestDto,
  CreatePackageDto,
  CreateTcOrderDto,
  CreateTripPlanCheckoutDto,
  PayDto,
  PaymentWebhookDto,
  UpdatePackageContactsDto,
  ValidateCartDto,
  ValidateGiftCertificateDto,
  YookassaWebhookDto,
} from './dto/checkout.dto';
import { PaymentEventLogService } from './payment-event-log.service';
import { PaymentService } from './payment.service';
import { WebhookIdempotencyService } from './webhook-idempotency.service';
import { extractPaymentIdFromWebhook, isYkWebhookEvent } from './yookassa.types';

@ApiTags('checkout')
@Controller('checkout')
export class CheckoutController {
  private readonly logger = new Logger(CheckoutController.name);

  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly paymentService: PaymentService,
    private readonly webhookIdempotency: WebhookIdempotencyService,
    private readonly paymentEventLog: PaymentEventLogService,
    @InjectQueue(QUEUE_FULFILLMENT) private readonly fulfillmentQueue: Queue,
  ) {}

  // ============================
  // TC — прямая покупка билетов
  // ============================

  @Post('tc')
  @ApiOperation({
    summary: 'Создать заказ в Ticketscloud (резерв билетов на 15 мин)',
  })
  createTcOrder(@Body() body: CreateTcOrderDto) {
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
  createCheckout(@Body() body: CreateTripPlanCheckoutDto) {
    return this.checkoutService.create(body);
  }

  @Post('package')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'T21: Создать checkout-пакет из каталога (редирект на /checkout/[id])' })
  createPackage(@Body() body: CreatePackageDto) {
    return this.checkoutService.createPackage(body);
  }

  @Post('package/:id/contacts')
  @ApiOperation({ summary: 'Обновить контакты пакета' })
  updatePackageContacts(@Param('id') id: string, @Body() body: UpdatePackageContactsDto) {
    return this.checkoutService.updatePackageContacts(id, body);
  }

  @Post('webhook/yookassa')
  @SkipThrottle()
  @ApiOperation({ summary: 'Webhook от YooKassa (IP-validated, raw body, PaymentEventLog, idempotent)' })
  async handleYookassaWebhook(@Body() body: YookassaWebhookDto, @Req() req: Request) {
    // 1. IP whitelist check
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
    if (!this.paymentService.isYookassaIp(ip)) {
      this.logger.warn(`YooKassa webhook rejected: untrusted IP ${ip}`);
      throw new ForbiddenException('Untrusted IP');
    }

    // 2. Validate webhook structure
    if (!isYkWebhookEvent(body)) {
      this.logger.warn('YooKassa webhook: invalid payload structure');
      return { status: 'ignored', reason: 'invalid structure' };
    }

    // 3. Extract payment ID and event type
    const paymentId = extractPaymentIdFromWebhook(body.object);
    if (!paymentId) {
      this.logger.warn('YooKassa webhook: missing object.id');
      return { status: 'ignored', reason: 'missing event id' };
    }

    const paymentObj = body.object as unknown as Record<string, unknown>;
    const eventType = body.event;

    // 4. PaymentEventLog: accept & log (idempotent). Duplicate → 200 OK, no retry.
    const logged = await this.paymentEventLog.logOnce(eventType, paymentId, body);
    if (!logged) {
      this.logger.debug(`YooKassa webhook: duplicate eventType=${eventType} paymentId=${paymentId}, returning 200`);
      return { status: 'ok', processed: false, result: 'DUPLICATE' };
    }

    // 5. Idempotent processing → queue (ProcessedWebhookEvent + fulfillment)
    const providerEventId = paymentId; // для payment.* = object.id, для refund.* = object.id
    const result = await this.webhookIdempotency.processOnce(providerEventId, 'YOOKASSA', eventType, body, async () => {
      // Minimal handler: validate + enqueue job
      await this.fulfillmentQueue.add(
        'yookassa-webhook',
      {
        providerEventId,
          eventType,
          paymentObject: paymentObj,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );
      return eventType === 'payment.succeeded' ? 'QUEUED_PAID' : 'QUEUED_' + eventType.toUpperCase();
    });

    return { status: 'ok', processed: result.processed, result: result.result };
  }

  @Get(':packageId/status')
  @ApiOperation({ summary: 'Статус пакета после оплаты' })
  getStatus(@Param('packageId') packageId: string) {
    return this.checkoutService.getStatus(packageId);
  }

  // ============================
  // Public order tracking (no auth)
  // ============================

  @Get('track/:shortCode')
  @ApiOperation({ summary: 'Публичный трекинг заказа по shortCode (без авторизации)' })
  async trackOrder(@Param('shortCode') shortCode: string) {
    const result = await this.checkoutService.trackByShortCode(shortCode);
    if (!result) throw new NotFoundException('Заказ не найден');
    return result;
  }

  // ============================
  // Cart Checkout (новые endpoints)
  // ============================

  @Post('validate')
  @ApiOperation({ summary: 'Валидировать корзину (проверка наличия/цен)' })
  validateCart(@Body() body: ValidateCartDto) {
    return this.checkoutService.validateCart(body.items);
  }

  @Post('validate-gift-certificate')
  @ApiOperation({ summary: 'Валидировать подарочный сертификат по коду' })
  validateGiftCertificate(@Body() body: ValidateGiftCertificateDto) {
    return this.checkoutService.validateGiftCertificate(body.code, body.cartTotalKopecks);
  }

  @Get('gift-certificate/denominations')
  @ApiOperation({ summary: 'Номиналы подарочных сертификатов (копейки)' })
  getGiftCertificateDenominations() {
    return {
      denominations: this.checkoutService.getGiftCertificateDenominations(),
    };
  }

  @Post('gift-certificate')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Создать checkout session для подарочного сертификата' })
  createGiftCertificateSession(@Body() body: CreateGiftCertificateCheckoutDto, @Req() req: Request) {
    return this.checkoutService.createGiftCertificateCheckoutSession({
      amount: body.amount,
      recipientEmail: body.recipientEmail,
      senderName: body.senderName,
      message: body.message,
      customer: body.customer,
      utm: body.utm,
      referrer: req.headers.referer || body.referrer,
      userAgent: req.headers['user-agent'],
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
    });
  }

  @Post('session')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Создать checkout session + order requests' })
  createSession(@Body() body: CreateCheckoutSessionDto, @Req() req: Request) {
    return this.checkoutService.createCheckoutSession({
      items: body.items,
      customer: body.customer,
      utm: body.utm,
      referrer: req.headers.referer || body.referrer,
      userAgent: req.headers['user-agent'],
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
      giftCertificateCode: body.giftCertificateCode,
    });
  }

  @Get('session/:id')
  @ApiOperation({ summary: 'Статус checkout session' })
  getSession(@Param('id') id: string) {
    return this.checkoutService.getCheckoutSession(id);
  }

  @Post('request')
  @ApiOperation({ summary: 'Быстрая заявка (без корзины, для REQUEST)' })
  createQuickRequest(@Body() body: CreateOrderRequestDto) {
    return this.checkoutService.createQuickRequest(body);
  }

  // ============================
  // Payment (YooKassa-ready stub)
  // ============================

  @Post(':sessionId/pay')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Создать PaymentIntent для checkout session' })
  createPayment(@Param('sessionId') sessionId: string, @Body() body: PayDto) {
    return this.paymentService.createPaymentIntent(sessionId, body.idempotencyKey);
  }

  @Get('payment/:id')
  @ApiOperation({ summary: 'Статус PaymentIntent' })
  getPayment(@Param('id') id: string) {
    return this.paymentService.getPaymentIntent(id);
  }

  @Post('payment/:id/cancel')
  @ApiOperation({ summary: 'Отменить PaymentIntent' })
  cancelPayment(@Param('id') id: string) {
    return this.paymentService.cancelIntent(id);
  }

  @Post('payment/:id/simulate-paid')
  @ApiOperation({ summary: 'STUB: Имитировать оплату (только dev/staging)' })
  simulatePaid(@Param('id') id: string) {
    return this.paymentService.simulatePaid(id);
  }

  @Post('webhook/payment')
  @SkipThrottle()
  @ApiOperation({ summary: 'Webhook от платёжного провайдера (generic/STUB)' })
  async handlePaymentWebhook(@Body() body: PaymentWebhookDto) {
    const result = await this.webhookIdempotency.processOnce(
      `generic_${body.paymentIntentId}_${body.status}`,
      'GENERIC',
      body.status,
      body,
      async () => {
        if (body.status === 'PAID' || body.status === 'succeeded') {
          await this.paymentService.markPaid(body.paymentIntentId, body.providerPaymentId);
          // Trigger fulfillment after PAID
          await this.fulfillmentQueue.add(
            'payment-paid',
            {
              paymentIntentId: body.paymentIntentId,
            },
            { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
          );
          return 'PAID';
        }
        if (body.status === 'FAILED' || body.status === 'canceled') {
          await this.paymentService.markFailed(body.paymentIntentId, body.failReason);
          return 'FAILED';
        }
        return `IGNORED_${body.status}`;
      },
    );

    return { status: 'ok', processed: result.processed, result: result.result };
  }
}
