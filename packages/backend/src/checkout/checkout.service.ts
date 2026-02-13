import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TcApiService } from '../catalog/tc-api.service';

/** Cart item from frontend */
interface CartItemDto {
  eventId: string;
  offerId: string;
  sessionId?: string;
  quantity: number;
  eventTitle: string;
  eventSlug: string;
  imageUrl?: string;
  priceFrom: number;
  purchaseType: string;
  source: string;
  deeplink?: string;
  badge?: string;
}

/**
 * Checkout Service — покупка билетов + корзина + заявки.
 */
@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tcApi: TcApiService,
  ) {}

  /**
   * Создать заказ в Ticketscloud.
   *
   * @param eventSlug — slug или UUID события в нашей БД
   * @param items — [{ setId, quantity }]
   * @param customerEmail — email покупателя (для отправки билетов)
   */
  async createTcOrder(body: {
    eventId: string;
    items: Array<{ setId: string; quantity: number }>;
    customerEmail?: string;
    customerName?: string;
  }) {
    // 1. Найти событие в нашей БД
    // tcEventId — это строка (TC ObjectId или tep-xxx), не UUID
    // id — UUID, slug — строка
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        body.eventId,
      );

    const event = await this.prisma.event.findFirst({
      where: {
        OR: [
          ...(isUuid ? [{ id: body.eventId }] : []),
          { slug: body.eventId },
          { tcEventId: body.eventId },
        ],
      },
    });

    if (!event) {
      throw new NotFoundException(`Событие не найдено: ${body.eventId}`);
    }

    if (event.source !== 'TC') {
      throw new BadRequestException(
        'Прямая покупка пока доступна только для событий Ticketscloud',
      );
    }

    if (!event.tcEventId) {
      throw new BadRequestException('У события нет идентификатора TC');
    }

    // 2. Подготовить random-маппинг для TC
    // TC ожидает: { "random": { "set_id_1": qty_1, "set_id_2": qty_2 } }
    const random: Record<string, number> = {};
    let totalQty = 0;

    for (const item of body.items) {
      if (item.quantity <= 0) continue;
      random[item.setId] = item.quantity;
      totalQty += item.quantity;
    }

    if (totalQty === 0) {
      throw new BadRequestException('Выберите хотя бы один билет');
    }

    // 3. Создать заказ в TC API
    this.logger.log(
      `Creating TC order: event=${event.tcEventId}, items=${JSON.stringify(random)}`,
    );

    let tcOrder: any;
    try {
      tcOrder = await this.tcApi.createOrder({
        event: event.tcEventId,
        random,
      });
    } catch (err: any) {
      this.logger.error(`TC order creation failed: ${err.message}`);
      throw new BadRequestException(
        `Не удалось создать заказ: ${err.message}`,
      );
    }

    const orderData = tcOrder?.data || tcOrder;

    // 4. Обновить заказ с данными покупателя и включить отправку билетов
    if (orderData.id) {
      try {
        await this.tcApi.updateOrder(orderData.id, {
          settings: {
            send_tickets: true,
          },
          vendor_data: {
            customer_email: body.customerEmail || '',
            customer_name: body.customerName || '',
            source: 'daibilet.ru',
          },
        });
        this.logger.log(`Updated TC order ${orderData.id} with customer data`);
      } catch (err: any) {
        this.logger.warn(
          `Failed to update TC order with customer data: ${err.message}`,
        );
      }
    }

    // 5. Автоподтверждение заказа — TC отправит билеты покупателю
    // Партнёр (мы) подтверждает заказ, TC обрабатывает доставку билетов.
    // Оплата проходит через билетную систему (реквизиты партнёра прописаны в TC).
    let confirmedOrder: any = null;
    try {
      confirmedOrder = await this.tcApi.finishOrder(orderData.id);
      this.logger.log(
        `TC order ${orderData.id} confirmed (status: done). Tickets will be sent.`,
      );
    } catch (err: any) {
      this.logger.error(`TC order confirmation failed: ${err.message}`);
      // Заказ создан, но не подтверждён — билеты зарезервированы
    }

    const finalOrder = confirmedOrder?.data || orderData;

    // 6. Рассчитать стоимость
    const values = finalOrder.values || orderData.values || {};
    const totalPrice = parseFloat(values.full || '0') * 100; // в копейках

    // 7. Сформировать ответ
    return {
      success: true,
      order: {
        id: finalOrder.id || orderData.id,
        number: finalOrder.number || orderData.number,
        status: finalOrder.status || orderData.status,
        expiresAt: orderData.expired_after,
        tickets: (orderData.tickets || []).map((t: any) => ({
          id: t.id,
          number: t.number,
          setId: t.set,
          price: parseFloat(t.full || '0') * 100, // копейки
          status: t.status,
        })),
        totalPrice, // копейки
        totalPriceFormatted: `${(totalPrice / 100).toLocaleString('ru-RU')} ₽`,
      },
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug,
        imageUrl: event.imageUrl,
      },
      confirmed: !!confirmedOrder,
      message: confirmedOrder
        ? 'Заказ оформлен! Билеты будут отправлены на вашу почту.'
        : 'Билеты зарезервированы на 15 минут.',
    };
  }

  /**
   * Подтвердить заказ TC (после оплаты).
   */
  async confirmTcOrder(tcOrderId: string) {
    this.logger.log(`Confirming TC order: ${tcOrderId}`);

    try {
      const result = await this.tcApi.finishOrder(tcOrderId);
      return {
        success: true,
        order: result?.data || result,
        message: 'Заказ подтверждён. Билеты будут отправлены на email.',
      };
    } catch (err: any) {
      this.logger.error(`TC order confirmation failed: ${err.message}`);
      throw new BadRequestException(
        `Не удалось подтвердить заказ: ${err.message}`,
      );
    }
  }

  /**
   * Отменить заказ TC.
   */
  async cancelTcOrder(tcOrderId: string) {
    this.logger.log(`Cancelling TC order: ${tcOrderId}`);

    try {
      const result = await this.tcApi.updateOrder(tcOrderId, {
        status: 'cancelled',
      });
      return {
        success: true,
        message: 'Заказ отменён. Билеты возвращены в продажу.',
      };
    } catch (err: any) {
      this.logger.error(`TC order cancellation failed: ${err.message}`);
      throw new BadRequestException(
        `Не удалось отменить заказ: ${err.message}`,
      );
    }
  }

  // ============================
  // Cart: Validate
  // ============================

  /**
   * Валидировать корзину: проверить наличие/актуальность цен офферов.
   */
  async validateCart(items: CartItemDto[]) {
    if (!items || items.length === 0) {
      throw new BadRequestException('Корзина пуста');
    }

    const validated: Array<CartItemDto & { valid: boolean; currentPrice: number | null; reason?: string }> = [];

    for (const item of items) {
      const offer = await this.prisma.eventOffer.findFirst({
        where: { id: item.offerId, eventId: item.eventId, status: 'ACTIVE' },
        include: { event: { select: { id: true, title: true, slug: true, imageUrl: true, isActive: true } } },
      });

      if (!offer) {
        validated.push({ ...item, valid: false, currentPrice: null, reason: 'Оффер не найден или неактивен' });
        continue;
      }

      if (!offer.event.isActive) {
        validated.push({ ...item, valid: false, currentPrice: null, reason: 'Событие неактивно' });
        continue;
      }

      // Check availability
      if (offer.availabilityMode === 'SOLD_OUT') {
        validated.push({ ...item, valid: false, currentPrice: offer.priceFrom, reason: 'Распродано' });
        continue;
      }

      validated.push({
        ...item,
        valid: true,
        currentPrice: offer.priceFrom,
        eventTitle: offer.event.title,
        eventSlug: offer.event.slug,
        imageUrl: offer.event.imageUrl || item.imageUrl,
      });
    }

    const allValid = validated.every((v) => v.valid);
    const totalPrice = validated
      .filter((v) => v.valid)
      .reduce((sum, v) => sum + (v.currentPrice || v.priceFrom) * v.quantity, 0);

    return { items: validated, allValid, totalPrice };
  }

  // ============================
  // Cart: Create Checkout Session
  // ============================

  /**
   * Создать CheckoutSession + OrderRequests для REQUEST_ONLY items.
   */
  async createCheckoutSession(data: {
    items: CartItemDto[];
    customer: { name: string; email: string; phone: string };
    utm?: { source?: string; medium?: string; campaign?: string };
    referrer?: string;
    userAgent?: string;
    ip?: string;
  }) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Корзина пуста');
    }

    // Validate first
    const validation = await this.validateCart(data.items);
    if (!validation.allValid) {
      throw new BadRequestException('Некоторые позиции недоступны. Обновите корзину.');
    }

    const shortCode = `CS-${Date.now().toString(36).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min TTL

    // Separate items by type
    const requestItems = data.items.filter((i) => i.purchaseType === 'REQUEST_ONLY' || i.purchaseType === 'API_CHECKOUT');
    const redirectItems = data.items.filter((i) => i.purchaseType === 'REDIRECT');

    const session = await this.prisma.$transaction(async (tx) => {
      // Create checkout session
      const cs = await tx.checkoutSession.create({
        data: {
          shortCode,
          cartSnapshot: data.items as any,
          validatedSnapshot: validation.items as any,
          customerName: data.customer.name,
          customerEmail: data.customer.email,
          customerPhone: data.customer.phone,
          status: requestItems.length > 0 ? 'PENDING_CONFIRMATION' : 'REDIRECTED',
          totalPrice: validation.totalPrice,
          expiresAt,
          utmSource: data.utm?.source || null,
          utmMedium: data.utm?.medium || null,
          utmCampaign: data.utm?.campaign || null,
          referrer: data.referrer || null,
          userAgent: data.userAgent || null,
          ip: data.ip || null,
        },
      });

      // Create OrderRequests for REQUEST_ONLY items
      for (const item of requestItems) {
        await tx.orderRequest.create({
          data: {
            checkoutSessionId: cs.id,
            eventOfferId: item.offerId,
            eventId: item.eventId,
            sessionId: item.sessionId || null,
            quantity: item.quantity,
            priceSnapshot: item.priceFrom * item.quantity,
            customerName: data.customer.name,
            customerEmail: data.customer.email,
            customerPhone: data.customer.phone,
            status: 'PENDING',
            expiresAt,
          },
        });
      }

      return cs;
    });

    this.logger.log(`Created checkout session ${shortCode} with ${requestItems.length} request items and ${redirectItems.length} redirect items`);

    return {
      sessionId: session.id,
      shortCode,
      status: session.status,
      expiresAt: session.expiresAt,
      requestItems: requestItems.length,
      redirectItems: redirectItems.map((item) => ({
        offerId: item.offerId,
        eventTitle: item.eventTitle,
        deeplink: item.deeplink,
        priceFrom: item.priceFrom,
      })),
    };
  }

  // ============================
  // Quick Request (no cart)
  // ============================

  /**
   * Быстрая заявка с одной страницы события (без корзины).
   */
  async createQuickRequest(data: {
    eventId: string;
    offerId?: string;
    name: string;
    email: string;
    phone: string;
    comment?: string;
  }) {
    // Find event
    const event = await this.prisma.event.findUnique({
      where: { id: data.eventId },
      include: { offers: { where: { status: 'ACTIVE' }, orderBy: { isPrimary: 'desc' } } },
    });

    if (!event) throw new NotFoundException('Событие не найдено');

    // Find offer
    let offer = data.offerId
      ? event.offers.find((o) => o.id === data.offerId)
      : event.offers[0];

    if (!offer) throw new BadRequestException('Активный оффер не найден');

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h TTL

    const request = await this.prisma.orderRequest.create({
      data: {
        eventOfferId: offer.id,
        eventId: event.id,
        quantity: 1,
        priceSnapshot: offer.priceFrom || 0,
        customerName: data.name,
        customerEmail: data.email,
        customerPhone: data.phone,
        customerComment: data.comment || null,
        status: 'PENDING',
        expiresAt,
      },
    });

    this.logger.log(`Created quick request ${request.id} for event ${event.title}`);

    return {
      requestId: request.id,
      message: 'Заявка отправлена! Оператор свяжется с вами для подтверждения.',
      event: { id: event.id, title: event.title },
    };
  }

  // ============================
  // Get Checkout Session Status
  // ============================

  async getCheckoutSession(sessionId: string) {
    const session = await this.prisma.checkoutSession.findUnique({
      where: { id: sessionId },
      include: {
        orderRequests: true,
      },
    });

    if (!session) throw new NotFoundException('Сессия не найдена');

    return session;
  }

  // ============================
  // Trip Planner (legacy)
  // ============================

  async create(body: any) {
    // TODO: Реализовать создание Package + платёж YooKassa (Trip Planner)
    return {
      message: 'Checkout create — в разработке. Требуется подключение YooKassa.',
    };
  }

  async handleWebhook(body: any) {
    // TODO: Верификация IP + подпись, обработка payment.succeeded / payment.canceled
    return { status: 'ok' };
  }

  async getStatus(packageId: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { id: packageId },
      include: {
        items: { include: { event: true } },
        voucher: true,
      },
    });

    if (!pkg) throw new NotFoundException('Пакет не найден');

    return {
      status: pkg.status,
      voucherUrl: pkg.voucher?.publicUrl || null,
    };
  }
}
