import { resolvePurchaseType } from '@daibilet/shared';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

import { TcApiService } from '../catalog/tc-api.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentFlowType, resolvePaymentFlow } from './cart-partitioning';
import {
  calculateExpiresAt,
  CHECKOUT_SESSION_TTL_MINUTES,
  DEFAULT_REQUEST_SLA_MINUTES,
  QUICK_REQUEST_TTL_MINUTES,
} from './checkout-state-machine';
import { CartItemDto, CreatePackageDto, CreateTripPlanCheckoutDto } from './dto/checkout.dto';

/**
 * Checkout Service — покупка билетов + корзина + заявки.
 */
@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tcApi: TcApiService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  /** Domain/host from APP_URL for vendor_data.source (e.g. daibilet.ru). */
  private getSourceDomain(): string {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    try {
      return new URL(appUrl).hostname;
    } catch {
      return 'daibilet.ru';
    }
  }

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
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.eventId);

    const event = await this.prisma.event.findFirst({
      where: {
        OR: [...(isUuid ? [{ id: body.eventId }] : []), { slug: body.eventId }, { tcEventId: body.eventId }],
      },
    });

    if (!event) {
      throw new NotFoundException(`Событие не найдено: ${body.eventId}`);
    }

    if (event.source !== 'TC') {
      throw new BadRequestException('Прямая покупка пока доступна только для событий Ticketscloud');
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
    this.logger.log(`Creating TC order: event=${event.tcEventId}, items=${JSON.stringify(random)}`);

    let tcOrder: Record<string, unknown> | undefined;
    try {
      tcOrder = await this.tcApi.createOrder({
        event: event.tcEventId,
        random,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`TC order creation failed: ${msg}`);
      throw new BadRequestException(`Не удалось создать заказ: ${msg}`);
    }

    const orderData = (tcOrder?.data ?? tcOrder) as Record<string, unknown>;
    if (!orderData) throw new BadRequestException('Не удалось создать заказ');

    // 4. Обновить заказ с данными покупателя и включить отправку билетов
    const orderId = String(orderData.id ?? '');
    if (orderId) {
      try {
        await this.tcApi.updateOrder(orderId, {
          settings: {
            send_tickets: true,
          },
          vendor_data: {
            customer_email: body.customerEmail || '',
            customer_name: body.customerName || '',
            source: this.getSourceDomain(),
          },
        });
        this.logger.log(`Updated TC order ${orderId} with customer data`);
      } catch (err: unknown) {
        this.logger.warn(
          `Failed to update TC order with customer data: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // 5. Автоподтверждение заказа — TC отправит билеты покупателю
    let confirmedOrder: unknown = null;
    if (orderId) {
      try {
        confirmedOrder = await this.tcApi.finishOrder(orderId);
        this.logger.log(`TC order ${orderId} confirmed (status: done). Tickets will be sent.`);
      } catch (err: unknown) {
        this.logger.error(`TC order confirmation failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const finalOrder = ((confirmedOrder as { data?: unknown })?.data ?? orderData) as Record<string, unknown>;

    // 6. Рассчитать стоимость
    const values = (finalOrder?.values ?? orderData.values ?? {}) as Record<string, unknown>;
    const totalPrice = parseFloat(String(values.full ?? '0')) * 100;

    // 7. Сформировать ответ
    return {
      success: true,
      order: {
        id: finalOrder.id ?? orderData.id,
        number: finalOrder.number ?? orderData.number,
        status: finalOrder.status ?? orderData.status,
        expiresAt: orderData.expired_after,
        tickets: ((orderData.tickets as Array<Record<string, unknown>>) || []).map((t) => ({
          id: t.id,
          number: t.number,
          setId: t.set,
          price: parseFloat(String(t.full ?? '0')) * 100,
          status: t.status,
        })),
        totalPrice, // копейки
        totalPriceFormatted: `${Math.round(totalPrice / 100).toLocaleString('ru-RU')} ₽`,
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
        order: (result as { data?: unknown })?.data ?? result,
        message: 'Заказ подтверждён. Билеты будут отправлены на email.',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`TC order confirmation failed: ${msg}`);
      throw new BadRequestException(`Не удалось подтвердить заказ: ${msg}`);
    }
  }

  /**
   * Отменить заказ TC.
   */
  async cancelTcOrder(tcOrderId: string) {
    this.logger.log(`Cancelling TC order: ${tcOrderId}`);

    try {
      await this.tcApi.updateOrder(tcOrderId, {
        status: 'cancelled',
      });
      return {
        success: true,
        message: 'Заказ отменён. Билеты возвращены в продажу.',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`TC order cancellation failed: ${msg}`);
      throw new BadRequestException(`Не удалось отменить заказ: ${msg}`);
    }
  }

  // ============================
  // Gift Certificate
  // ============================

  /**
   * Создать CheckoutSession для подарочного сертификата.
   * Сессия сразу в CONFIRMED — можно переходить к оплате.
   */
  async createGiftCertificateCheckoutSession(data: {
    amount: number;
    recipientEmail: string;
    senderName: string;
    message?: string;
    customer: { name: string; email: string; phone: string };
    utm?: { source?: string; medium?: string; campaign?: string };
    referrer?: string;
    userAgent?: string;
    ip?: string;
  }) {
    const denominations = this.getGiftCertificateDenominations();
    if (!denominations.includes(data.amount)) {
      throw new BadRequestException(
        `Недопустимый номинал. Доступные: ${denominations.map((a) => `${a / 100} ₽`).join(', ')}`,
      );
    }

    const shortCode = `CS-${Date.now().toString(36).toUpperCase()}`;
    const expiresAt = calculateExpiresAt(CHECKOUT_SESSION_TTL_MINUTES);

    const giftCertificateSnapshot = {
      amount: data.amount,
      recipientEmail: data.recipientEmail,
      senderName: data.senderName,
      message: data.message || null,
    };

    const session = await this.prisma.checkoutSession.create({
      data: {
        shortCode,
        cartSnapshot: [],
        giftCertificateSnapshot: giftCertificateSnapshot as unknown as Prisma.InputJsonValue,
        customerName: data.customer.name,
        customerEmail: data.customer.email,
        customerPhone: data.customer.phone,
        status: 'CONFIRMED',
        totalPrice: data.amount,
        expiresAt,
        utmSource: data.utm?.source || null,
        utmMedium: data.utm?.medium || null,
        utmCampaign: data.utm?.campaign || null,
        referrer: data.referrer || null,
        userAgent: data.userAgent || null,
        ip: data.ip || null,
      },
    });

    this.logger.log(`Created gift certificate checkout session ${shortCode}, amount=${data.amount}`);

    return {
      sessionId: session.id,
      shortCode,
      status: session.status,
      expiresAt: session.expiresAt,
      totalPrice: data.amount,
    };
  }

  getGiftCertificateDenominations(): number[] {
    const raw = this.config.get<string>('GIFT_CERTIFICATE_DENOMINATIONS', '300000,500000,1000000');
    return raw
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);
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
    const now = new Date();

    for (const item of items) {
      const offer = await this.prisma.eventOffer.findFirst({
        where: { id: item.offerId, eventId: item.eventId, status: 'ACTIVE' },
        include: {
          event: { select: { id: true, title: true, slug: true, imageUrl: true, isActive: true } },
        },
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

      // --- Price & validity rules ---
      let currentPrice = offer.priceFrom ?? null;

      // OPEN_PRICE: используем клиентскую цену из item.priceFrom, валидируем minAmount
      if ((offer as any).priceMode === 'OPEN_PRICE') {
        const clientPrice = item.priceFrom;
        const minAmount = (offer as any).minAmount as number | null | undefined;
        if (!clientPrice || clientPrice <= 0) {
          validated.push({
            ...item,
            valid: false,
            currentPrice: null,
            reason: 'Укажите сумму для билета',
          });
          continue;
        }
        if (minAmount != null && clientPrice < minAmount) {
          validated.push({
            ...item,
            valid: false,
            currentPrice: clientPrice,
            reason: 'Сумма меньше минимально допустимой',
          });
          continue;
        }
        currentPrice = clientPrice;
      } else {
        // FIXED_PRICE: защищаемся от расхождения — цена в корзине должна совпадать с актуальной
        const dbPrice = offer.priceFrom ?? 0;
        if (item.priceFrom !== dbPrice) {
          validated.push({
            ...item,
            valid: false,
            currentPrice: dbPrice,
            reason: 'Цена изменилась, обновите страницу',
          });
          continue;
        }
        currentPrice = dbPrice;
      }

      // Validity window (UNTIL_DATE / DAYS_FROM_PURCHASE / NO_EXPIRY)
      const validityMode = (offer as any).validityMode as string | undefined;
      const validUntil = (offer as any).validUntil as Date | null | undefined;
      if (validityMode === 'UNTIL_DATE' && validUntil && validUntil < now) {
        validated.push({
          ...item,
          valid: false,
          currentPrice,
          reason: 'Срок действия билета истёк',
        });
        continue;
      }

      validated.push({
        ...item,
        valid: true,
        currentPrice,
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

  /**
   * Валидировать подарочный сертификат по коду.
   * Возвращает discountAmount = min(amount, cartTotal) при успехе.
   */
  async validateGiftCertificate(
    code: string,
    cartTotalKopecks: number,
  ): Promise<{
    valid: boolean;
    discountAmount?: number;
    amount?: number;
    message?: string;
  }> {
    const normalized = code?.trim().toUpperCase();
    if (!normalized || cartTotalKopecks <= 0) {
      return { valid: false, message: 'Укажите код и сумму корзины' };
    }

    const cert = await this.prisma.giftCertificate.findUnique({
      where: { code: normalized },
    });
    if (!cert) {
      return { valid: false, message: 'Сертификат не найден' };
    }
    if (cert.status !== 'ISSUED') {
      return { valid: false, message: 'Сертификат уже использован или недействителен' };
    }
    if (cert.expiresAt && cert.expiresAt < new Date()) {
      return { valid: false, message: 'Срок действия сертификата истёк' };
    }
    if (cert.amount <= 0) {
      return { valid: false, message: 'Некорректный номинал сертификата' };
    }

    const discountAmount = Math.min(cert.amount, cartTotalKopecks);
    return {
      valid: true,
      discountAmount,
      amount: cert.amount,
    };
  }

  // ============================
  // Cart: Create Checkout Session
  // ============================

  /**
   * Создать CheckoutSession + OrderRequests для REQUEST items.
   */
  async createCheckoutSession(data: {
    items: CartItemDto[];
    customer: { name: string; email: string; phone: string };
    utm?: { source?: string; medium?: string; campaign?: string };
    referrer?: string;
    userAgent?: string;
    ip?: string;
    giftCertificateCode?: string;
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
    const expiresAt = calculateExpiresAt(CHECKOUT_SESSION_TTL_MINUTES);

    // Separate items by purchase flow (domain contract: PLATFORM vs EXTERNAL)
    const platformItems = data.items.filter((i) => resolvePaymentFlow(i.purchaseType) === PaymentFlowType.PLATFORM);
    const externalItems = data.items.filter((i) => resolvePaymentFlow(i.purchaseType) === PaymentFlowType.EXTERNAL);
    // Legacy alias for OrderRequest creation (REQUEST items need confirmation)
    const requestItems = data.items.filter((i) => i.purchaseType === 'REQUEST');

    // Build immutable offers snapshot (не зависит от будущих правок офферов в админке)
    const offerIds = data.items.map((i) => i.offerId);
    const offersData = await this.prisma.eventOffer.findMany({
      where: { id: { in: offerIds } },
      include: {
        event: { select: { id: true, title: true, slug: true, imageUrl: true } },
        operator: {
          select: {
            id: true,
            name: true,
            isSupplier: true,
            commissionRate: true,
            promoRate: true,
            promoUntil: true,
          },
        },
        venue: { select: { id: true, commissionRate: true } },
      },
    });

    // Map offerId → cart item for quantity lookup
    const cartByOffer = new Map(data.items.map((i) => [i.offerId, i]));

    // Immutable snapshot: write-once, единая структура для PLATFORM и EXTERNAL
    const now = new Date();
    const offersSnapshot = offersData.map((o, index) => {
      const cartItem = cartByOffer.get(o.id);
      const quantity = cartItem?.quantity || 1;
      // Цена единицы: для OPEN_PRICE берём цену из корзины, иначе актуальную priceFrom
      let unitPrice = o.priceFrom || 0;
      if ((o as any).priceMode === 'OPEN_PRICE' && cartItem) {
        unitPrice = cartItem.priceFrom;
      }
      const lineTotal = unitPrice * quantity;
      const purchaseFlow = resolvePaymentFlow(o.purchaseType);

      // Commission snapshot (для PLATFORM split)
      // Правила: promoRate 10% до promoUntil; базовая 25% для всех; Venue/Operator override (госмузеи) через админку
      let commissionRateSnapshot: number | null = null;
      let platformFeeSnapshot: number | null = null;
      let supplierAmountSnapshot: number | null = null;
      const isVenueOffer = !!o.venueId;
      if (purchaseFlow === PaymentFlowType.PLATFORM && o.operator?.isSupplier) {
        const inPromo = o.operator.promoUntil && now < o.operator.promoUntil;
        let effectiveRate: number;
        if (inPromo && o.operator.promoRate != null) {
          effectiveRate = Number(o.operator.promoRate); // 10% промо
        } else if (isVenueOffer && o.venue?.commissionRate != null) {
          effectiveRate = Number(o.venue.commissionRate); // индивидуальная для venue (госмузеи)
        } else {
          effectiveRate = Number(o.operator.commissionRate); // базовая 25% для всех
        }
        commissionRateSnapshot = effectiveRate;
        platformFeeSnapshot = Math.round(lineTotal * effectiveRate);
        supplierAmountSnapshot = lineTotal - platformFeeSnapshot;
      }

      return {
        // === Identity ===
        lineItemIndex: index,
        offerId: o.id,
        eventId: o.eventId,
        source: o.source,
        purchaseType: o.purchaseType,
        purchaseTypeResolved: resolvePurchaseType(o.purchaseType, `offer:${o.id}`),
        purchaseFlow, // PLATFORM | EXTERNAL — единственный контракт
        // === Content ===
        eventTitle: o.event.title,
        eventSlug: o.event.slug,
        eventImage: o.event.imageUrl,
        badge: o.badge,
        operatorName: o.operator?.name || null,
        // === Pricing (immutable, kopecks) ===
        unitPrice,
        quantity,
        lineTotal,
        priceCurrency: 'RUB',
        // === Supplier/Split (для PLATFORM) ===
        supplierId: o.operator?.id || null,
        commissionRateSnapshot,
        platformFeeSnapshot,
        supplierAmountSnapshot,
        // === External purchase info ===
        deeplink: o.deeplink,
        widgetProvider: o.widgetProvider,
        widgetPayload: o.widgetPayload,
        // === Operational info (frozen) ===
        meetingPoint: o.meetingPoint || null,
        meetingInstructions: o.meetingInstructions || null,
        operationalPhone: o.operationalPhone || null,
        operationalNote: o.operationalNote || null,
        // === Meta ===
        snapshotAt: now.toISOString(),
      };
    });

    // totalPrice вычисляется ТОЛЬКО из snapshot (единственный источник правды по сумме)
    const snapshotTotalPrice = offersSnapshot.reduce((sum, s) => sum + s.lineTotal, 0);

    // Применение подарочного сертификата
    let appliedGiftCertSnapshot: { certificateId: string; code: string; discountAmount: number } | null = null;
    let finalTotalPrice = snapshotTotalPrice;
    if (data.giftCertificateCode?.trim()) {
      const validation = await this.validateGiftCertificate(data.giftCertificateCode.trim(), snapshotTotalPrice);
      if (validation.valid && validation.discountAmount) {
        const cert = await this.prisma.giftCertificate.findUnique({
          where: { code: data.giftCertificateCode.trim().toUpperCase() },
        });
        if (cert) {
          appliedGiftCertSnapshot = {
            certificateId: cert.id,
            code: cert.code,
            discountAmount: validation.discountAmount,
          };
          finalTotalPrice = Math.max(0, snapshotTotalPrice - validation.discountAmount);
        }
      }
    }

    const session = await this.prisma.$transaction(async (tx) => {
      // Determine initial status:
      // - Has PLATFORM (REQUEST) items → PENDING_CONFIRMATION (need operator confirmation)
      // - Only EXTERNAL items → REDIRECTED (user pays at provider)
      const initialStatus = platformItems.length > 0 ? 'PENDING_CONFIRMATION' : 'REDIRECTED';

      // Create checkout session with immutable snapshot
      const cs = await tx.checkoutSession.create({
        data: {
          shortCode,
          cartSnapshot: data.items as unknown as Prisma.InputJsonValue,
          validatedSnapshot: validation.items as unknown as Prisma.InputJsonValue,
          offersSnapshot: offersSnapshot as unknown as Prisma.InputJsonValue,
          appliedGiftCertificateSnapshot: appliedGiftCertSnapshot
            ? (appliedGiftCertSnapshot as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          customerName: data.customer.name,
          customerEmail: data.customer.email,
          customerPhone: data.customer.phone,
          status: initialStatus,
          totalPrice: finalTotalPrice,
          expiresAt,
          utmSource: data.utm?.source || null,
          utmMedium: data.utm?.medium || null,
          utmCampaign: data.utm?.campaign || null,
          referrer: data.referrer || null,
          userAgent: data.userAgent || null,
          ip: data.ip || null,
        },
      });

      // Create OrderRequests for REQUEST items (with SLA)
      for (const item of requestItems) {
        const slaMinutes = DEFAULT_REQUEST_SLA_MINUTES;
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
            slaMinutes,
            expiresAt: calculateExpiresAt(slaMinutes),
          },
        });
      }

      return cs;
    });

    this.logger.log(
      `Created checkout session ${shortCode}: ${platformItems.length} PLATFORM, ${externalItems.length} EXTERNAL items, total=${snapshotTotalPrice}`,
    );

    // Send "order created" email
    if (data.customer.email) {
      this.mailService
        .sendOrderCreated(data.customer.email, {
          customerName: data.customer.name || 'Клиент',
          shortCode,
          items: data.items.map((item) => ({
            title: item.eventTitle || 'Билет',
            quantity: item.quantity,
            price: Math.round(item.priceFrom / 100),
          })),
          totalPrice: Math.round(session.totalPrice ? session.totalPrice / 100 : 0),
        })
        .catch((e) => this.logger.error('Order email failed: ' + e.message));
    }

    return {
      sessionId: session.id,
      shortCode,
      status: session.status,
      expiresAt: session.expiresAt,
      totalPrice: snapshotTotalPrice,
      platformItems: platformItems.length,
      externalItems: externalItems.map((item) => ({
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
    const offer = data.offerId ? event.offers.find((o) => o.id === data.offerId) : event.offers[0];

    if (!offer) throw new BadRequestException('Активный оффер не найден');

    const slaMinutes = QUICK_REQUEST_TTL_MINUTES;
    const expiresAt = calculateExpiresAt(slaMinutes);

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
        slaMinutes,
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
  // Public order tracking (no auth)
  // ============================

  /** T24: Получить заказ по id (UUID session) или shortCode */
  async getOrderById(id: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      const session = await this.prisma.checkoutSession.findUnique({
        where: { id },
        include: {
          orderRequests: {
            include: {
              eventOffer: {
                select: {
                  id: true, priceFrom: true, purchaseType: true,
                  meetingPoint: true, meetingInstructions: true, operationalPhone: true, operationalNote: true,
                },
              },
              event: { select: { id: true, title: true, slug: true, imageUrl: true } },
            },
          },
        },
      });
      if (!session) return null;
      return this.formatTrackingResult(session);
    }
    return this.trackByShortCode(id);
  }

  private formatTrackingResult(session: {
    shortCode: string;
    status: string;
    totalPrice: number | null;
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
    expiresAt: Date | null;
    offersSnapshot: unknown;
    orderRequests: Array<{
      id: string;
      status: string;
      quantity: number;
      priceSnapshot: number;
      confirmedAt: Date | null;
      eventOffer?: { meetingPoint?: string | null; meetingInstructions?: string | null; operationalPhone?: string | null; operationalNote?: string | null } | null;
      event?: { title: string; slug: string; imageUrl: string | null } | null;
    }>;
  }) {
    const showOperational = ['CONFIRMED', 'COMPLETED', 'AWAITING_PAYMENT'].includes(session.status);
    const snapshot = (session.offersSnapshot as Array<{ eventTitle: string; eventSlug: string; eventImage?: string; quantity: number; lineTotal: number }>) || [];
    const items = session.orderRequests.length > 0
      ? session.orderRequests.map((req) => ({
          id: req.id,
          status: req.status,
          quantity: req.quantity,
          priceSnapshot: req.priceSnapshot,
          confirmedAt: req.confirmedAt,
          event: req.event ? { title: req.event.title, slug: req.event.slug, imageUrl: req.event.imageUrl } : null,
          offerTitle: req.event?.title || null,
          ...(showOperational && req.eventOffer ? {
            meetingPoint: req.eventOffer.meetingPoint || undefined,
            meetingInstructions: req.eventOffer.meetingInstructions || undefined,
            operationalPhone: req.eventOffer.operationalPhone || undefined,
            operationalNote: req.eventOffer.operationalNote || undefined,
          } : {}),
        }))
      : snapshot.map((s, i) => ({
          id: `snap-${i}`,
          status: 'CONFIRMED',
          quantity: s.quantity,
          priceSnapshot: s.lineTotal / s.quantity,
          confirmedAt: null,
          event: { title: s.eventTitle, slug: s.eventSlug, imageUrl: s.eventImage || null },
          offerTitle: s.eventTitle,
        }));
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const voucherUrl =
      session.status === 'COMPLETED'
        ? `${appUrl}/orders/track?code=${session.shortCode}`
        : null;

    return {
      id: session.shortCode,
      shortCode: session.shortCode,
      status: session.status,
      totalPrice: session.totalPrice,
      customerName: session.customerName,
      customerEmail: session.customerEmail,
      customerPhone: session.customerPhone,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      completedAt: session.completedAt,
      expiresAt: session.expiresAt,
      voucherUrl,
      items,
    };
  }

  async trackByShortCode(shortCode: string) {
    const session = await this.prisma.checkoutSession.findFirst({
      where: { shortCode: shortCode.toUpperCase() },
      include: {
        orderRequests: {
          include: {
            eventOffer: {
              select: {
                id: true,
                priceFrom: true,
                purchaseType: true,
                meetingPoint: true,
                meetingInstructions: true,
                operationalPhone: true,
                operationalNote: true,
              },
            },
            event: {
              select: { id: true, title: true, slug: true, imageUrl: true },
            },
          },
        },
      },
    });

    if (!session) return null;
    return this.formatTrackingResult(session as Parameters<typeof this.formatTrackingResult>[0]);
  }

  // ============================
  // Snapshot write-once guard
  // ============================

  /**
   * offersSnapshot записывается ОДИН РАЗ при создании session.
   * Перезапись запрещена — данные иммутабельны.
   */
  async assertSnapshotImmutable(sessionId: string): Promise<void> {
    const session = await this.prisma.checkoutSession.findUnique({
      where: { id: sessionId },
      select: { offersSnapshot: true },
    });
    if (session?.offersSnapshot) {
      throw new BadRequestException('offersSnapshot уже записан и не может быть перезаписан (immutable)');
    }
  }

  // ============================
  // Trip Planner (legacy)
  // ============================

  async create(_body: CreateTripPlanCheckoutDto) {
    // TODO: Реализовать создание Package + платёж YooKassa (Trip Planner)
    return {
      message: 'Checkout create — в разработке. Требуется подключение YooKassa.',
    };
  }

  /**
   * C4: Holds по сессиям события (для проверки доступности при создании checkout).
   * Key: "eventId:sessionId", value: sum of quantity.
   */
  private async getHoldsForEvent(eventId: string): Promise<Map<string, number>> {
    const now = new Date();
    const sessions = await this.prisma.checkoutSession.findMany({
      where: {
        status: { in: ['STARTED', 'VALIDATED', 'REDIRECTED', 'AWAITING_PAYMENT'] },
        expiresAt: { not: null, gt: now },
      },
      select: { cartSnapshot: true },
    });
    const map = new Map<string, number>();
    for (const row of sessions) {
      const cart = (row.cartSnapshot as Array<{ eventId?: string; sessionId?: string; quantity?: number }> | null) ?? [];
      for (const item of cart) {
        const eid = item?.eventId ?? '';
        const sid = item?.sessionId ?? '';
        const qty = Math.max(0, Math.floor(Number(item?.quantity ?? 0)));
        if (!eid || !sid || qty <= 0 || eid !== eventId) continue;
        const key = `${eid}:${sid}`;
        map.set(key, (map.get(key) ?? 0) + qty);
      }
    }
    return map;
  }

  /**
   * Paid count per sessionId (PackageItem PAID + FulfillmentItem CONFIRMED по offersSnapshot).
   */
  private async getPaidBySessionId(sessionIds: string[]): Promise<Map<string, number>> {
    if (sessionIds.length === 0) return new Map();
    const set = new Set(sessionIds);
    const map = new Map<string, number>();

    const pkgItems = await this.prisma.packageItem.findMany({
      where: { sessionId: { in: sessionIds }, package: { status: 'PAID' } },
      select: { sessionId: true, adultTickets: true, childTickets: true },
    });
    for (const item of pkgItems) {
      const qty = (item.adultTickets ?? 0) + (item.childTickets ?? 0);
      map.set(item.sessionId, (map.get(item.sessionId) ?? 0) + qty);
    }

    const fulfilled = await this.prisma.fulfillmentItem.findMany({
      where: { status: 'CONFIRMED' },
      select: { lineItemIndex: true, checkoutSessionId: true },
    });
    if (fulfilled.length > 0) {
      const csIds = [...new Set(fulfilled.map((f) => f.checkoutSessionId))];
      const sessions = await this.prisma.checkoutSession.findMany({
        where: { id: { in: csIds } },
        select: { id: true, offersSnapshot: true },
      });
      const snap = new Map(sessions.map((s) => [s.id, s.offersSnapshot]));
      for (const item of fulfilled) {
        const snapshot = snap.get(item.checkoutSessionId) as Array<{ sessionId?: string | null; quantity?: number }> | null;
        if (!Array.isArray(snapshot)) continue;
        const line = snapshot[item.lineItemIndex];
        const sid = line?.sessionId ?? null;
        const qty = Math.max(0, Math.floor(Number(line?.quantity ?? 0)));
        if (sid && set.has(sid) && qty > 0) map.set(sid, (map.get(sid) ?? 0) + qty);
      }
    }
    return map;
  }

  /**
   * Effective available for session (capacity - paid - holds). Used for widget last-seats guard.
   */
  private async getEffectiveAvailableForSession(eventId: string, sessionId: string): Promise<number> {
    const session = await this.prisma.eventSession.findUnique({
      where: { id: sessionId, eventId },
      select: { availableTickets: true, capacityTotal: true, event: { select: { defaultCapacityTotal: true } } },
    });
    if (!session) return 0;
    const raw =
      (session.availableTickets ?? undefined) != null
        ? Number(session.availableTickets)
        : Number(session.capacityTotal ?? session.event?.defaultCapacityTotal ?? 0);
    const capacity = Math.max(0, Math.floor(Number.isFinite(raw) ? raw : 0));
    const [holdsMap, paidMap] = await Promise.all([
      this.getHoldsForEvent(eventId),
      this.getPaidBySessionId([sessionId]),
    ]);
    const holds = holdsMap.get(`${eventId}:${sessionId}`) ?? 0;
    const paid = paidMap.get(sessionId) ?? 0;
    return Math.max(0, capacity - paid - holds);
  }

  /**
   * T21: Создать CheckoutSession из 1+ items (без customer) → редирект на /checkout/[id].
   * При forcePlatformPayment (widget) проверяет доступность по сессиям (last-seats guard).
   */
  async createPackage(body: CreatePackageDto) {
    if (!body.items?.length) {
      throw new BadRequestException('Добавьте хотя бы один товар');
    }
    const validation = await this.validateCart(body.items);
    if (!validation.allValid) {
      throw new BadRequestException('Некоторые позиции недоступны');
    }

    // Last-seats guard: при виджетном checkout перепроверяем доступность по сессиям
    if (Boolean(body.forcePlatformPayment)) {
      const bySession = new Map<string, number>();
      for (const item of body.items) {
        if (!item.sessionId || !item.eventId) continue;
        const key = `${item.eventId}:${item.sessionId}`;
        bySession.set(key, (bySession.get(key) ?? 0) + (item.quantity ?? 1));
      }
      for (const [key, requestedQty] of bySession) {
        const [eventId, sessionId] = key.split(':');
        if (!eventId || !sessionId) continue;
        const available = await this.getEffectiveAvailableForSession(eventId, sessionId);
        if (requestedQty > available) {
          this.logger.warn(
            `createPackage: NOT_ENOUGH_AVAILABLE eventId=${eventId} sessionId=${sessionId} requested=${requestedQty} available=${available}`,
          );
          throw new BadRequestException({
            code: 'NOT_ENOUGH_AVAILABLE',
            message: `Недостаточно мест (доступно: ${available})`,
          });
        }
      }
    }
    const shortCode = `CS-${Date.now().toString(36).toUpperCase()}`;
    const expiresAt = calculateExpiresAt(CHECKOUT_SESSION_TTL_MINUTES);
    const offerIds = body.items.map((i) => i.offerId);
    const offersData = await this.prisma.eventOffer.findMany({
      where: { id: { in: offerIds } },
      include: {
        event: { select: { id: true, title: true, slug: true, imageUrl: true, cityId: true } },
        operator: {
          select: {
            id: true, name: true, isSupplier: true,
            commissionRate: true, promoRate: true, promoUntil: true,
          },
        },
        venue: { select: { id: true, commissionRate: true } },
      },
    });
    const cartByOffer = new Map(body.items.map((i) => [i.offerId, i]));
    const now = new Date();
    const forcePlatform = Boolean(body.forcePlatformPayment);
    const offersSnapshot = offersData.map((o, idx) => {
      const cartItem = cartByOffer.get(o.id);
      const quantity = cartItem?.quantity || 1;
      const unitPrice = o.priceFrom || 0;
      const lineTotal = unitPrice * quantity;
      const purchaseFlow = forcePlatform ? PaymentFlowType.PLATFORM : resolvePaymentFlow(o.purchaseType);
      let commissionRateSnapshot: number | null = null;
      let platformFeeSnapshot: number | null = null;
      let supplierAmountSnapshot: number | null = null;
      const isVenueOffer = !!o.venueId;
      if (purchaseFlow === PaymentFlowType.PLATFORM && o.operator?.isSupplier) {
        const inPromo = o.operator.promoUntil && now < o.operator.promoUntil;
        let effectiveRate: number;
        if (inPromo && o.operator.promoRate != null) {
          effectiveRate = Number(o.operator.promoRate); // 10% промо
        } else if (isVenueOffer && o.venue?.commissionRate != null) {
          effectiveRate = Number(o.venue.commissionRate); // индивидуальная для venue (госмузеи)
        } else {
          effectiveRate = Number(o.operator.commissionRate); // базовая 25% для всех
        }
        commissionRateSnapshot = effectiveRate;
        platformFeeSnapshot = Math.round(lineTotal * effectiveRate);
        supplierAmountSnapshot = lineTotal - platformFeeSnapshot;
      }
      return {
        lineItemIndex: idx,
        offerId: o.id,
        eventId: o.eventId,
        sessionId: cartItem?.sessionId ?? null,
        source: o.source,
        purchaseType: o.purchaseType,
        purchaseFlow,
        eventTitle: o.event.title,
        eventSlug: o.event.slug,
        eventImage: o.event.imageUrl,
        badge: o.badge ?? null,
        operatorName: o.operator?.name || null,
        unitPrice,
        quantity,
        lineTotal,
        priceCurrency: 'RUB',
        supplierId: o.operator?.id || null,
        commissionRateSnapshot,
        platformFeeSnapshot,
        supplierAmountSnapshot,
        deeplink: o.deeplink ?? null,
        widgetProvider: o.widgetProvider ?? null,
        widgetPayload: o.widgetPayload ?? null,
        meetingPoint: o.meetingPoint ?? null,
        meetingInstructions: o.meetingInstructions ?? null,
        operationalPhone: o.operationalPhone ?? null,
        operationalNote: o.operationalNote ?? null,
        snapshotAt: now.toISOString(),
      };
    });
    const totalPrice = offersSnapshot.reduce((s, x) => s + x.lineTotal, 0);
    const platformItems = offersSnapshot.filter((s: { purchaseFlow: string }) => s.purchaseFlow === PaymentFlowType.PLATFORM);
    const session = await this.prisma.checkoutSession.create({
      data: {
        shortCode,
        cartSnapshot: JSON.parse(JSON.stringify(body.items)) as Prisma.InputJsonValue,
        validatedSnapshot: JSON.parse(JSON.stringify(validation.items)) as Prisma.InputJsonValue,
        offersSnapshot: JSON.parse(JSON.stringify(offersSnapshot)) as Prisma.InputJsonValue,
        customerName: null,
        customerEmail: null,
        customerPhone: null,
        status: platformItems.length > 0 ? 'VALIDATED' : 'STARTED',
        totalPrice,
        expiresAt,
        utmSource: body.utm?.source,
        utmMedium: body.utm?.medium,
        utmCampaign: body.utm?.campaign,
      },
    });
    this.logger.log(
      `checkout_created sessionId=${session.id} shortCode=${session.shortCode} forcePlatform=${forcePlatform}`,
    );
    return { packageId: session.id, code: session.shortCode };
  }

  async handleWebhook(_body: Record<string, unknown>) {
    // TODO: Верификация IP + подпись, обработка payment.succeeded / payment.canceled
    return { status: 'ok' };
  }

  async getStatus(packageId: string) {
    // Поддержка Package (Trip Planner) и CheckoutSession (cart flow)
    const pkg = await this.prisma.package.findUnique({
      where: { id: packageId },
      include: {
        items: {
          include: {
            event: { select: { id: true, title: true, slug: true, imageUrl: true } },
            session: { select: { startsAt: true } },
          },
        },
        voucher: true,
      },
    });
    if (pkg) {
      return {
        id: pkg.id,
        code: pkg.code,
        status: pkg.status,
        totalPrice: pkg.totalPrice,
        voucherUrl: pkg.voucher?.publicUrl || null,
        paidAt: pkg.paidAt?.toISOString() || null,
        trackUrl: null,
        items: pkg.items.map((item) => ({
          id: item.id,
          event: item.event,
          sessionStartsAt: item.session?.startsAt?.toISOString() || null,
          adultTickets: item.adultTickets,
          childTickets: item.childTickets,
          subtotal: item.subtotal,
        })),
      };
    }
    const session = await this.prisma.checkoutSession.findUnique({
      where: { id: packageId },
      include: { paymentIntents: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!session) throw new NotFoundException('Заказ не найден');
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const offersSnapshot = (session.offersSnapshot as Array<{ eventTitle: string; eventSlug: string; eventImage?: string; unitPrice: number; quantity: number; lineTotal: number }>) || [];
    const statusMap: Record<string, string> = {
      STARTED: 'DRAFT',
      VALIDATED: 'DRAFT',
      CONFIRMED: 'PENDING_PAYMENT',
      AWAITING_PAYMENT: 'PENDING_PAYMENT',
      COMPLETED: 'PAID',
      CANCELLED: 'FAILED',
      EXPIRED: 'FAILED',
    };
    const lastIntent = session.paymentIntents[0];
    const voucherUrl = lastIntent?.paidAt ? `${appUrl}/orders/track?code=${session.shortCode}` : null;
    return {
      id: session.id,
      code: session.shortCode,
      status: statusMap[session.status] || session.status,
      totalPrice: session.totalPrice || 0,
      voucherUrl,
      paidAt: lastIntent?.paidAt?.toISOString() || null,
      trackUrl: `${appUrl}/orders/track?code=${session.shortCode}`,
      items: offersSnapshot.map((s, i) => ({
        id: `snap-${i}`,
        event: { id: '', title: s.eventTitle, slug: s.eventSlug, imageUrl: s.eventImage || null },
        sessionStartsAt: null,
        adultTickets: s.quantity,
        childTickets: 0,
        subtotal: s.lineTotal,
      })),
    };
  }

  async updatePackageContacts(packageId: string, customer: { name: string; email: string; phone: string }) {
    const session = await this.prisma.checkoutSession.findUnique({ where: { id: packageId } });
    if (!session) throw new NotFoundException('Заказ не найден');
    if (!['STARTED', 'VALIDATED'].includes(session.status)) {
      throw new BadRequestException('Контактные данные уже заполнены');
    }
    await this.prisma.checkoutSession.update({
      where: { id: packageId },
      data: {
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        status: 'CONFIRMED',
      },
    });
    return { ok: true };
  }
}
