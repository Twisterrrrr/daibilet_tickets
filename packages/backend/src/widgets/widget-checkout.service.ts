import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { CheckoutService } from '../checkout/checkout.service';
import { PaymentService } from '../checkout/payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { WidgetCheckoutRequestDto, WidgetCheckoutResponseDto } from './dto/widget-checkout.dto';
import { WidgetsApiService } from './widgets-api.service';

@Injectable()
export class WidgetCheckoutService {
  private readonly logger = new Logger(WidgetCheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly widgetsApi: WidgetsApiService,
    private readonly checkoutService: CheckoutService,
    private readonly paymentService: PaymentService,
  ) {}

  async createWidgetCheckout(
    _provider: string,
    body: WidgetCheckoutRequestDto,
  ): Promise<WidgetCheckoutResponseDto> {
    const { eventId, sessionId, qty, buyer, idempotencyKey } = body;

    const session = await this.prisma.eventSession.findFirst({
      where: {
        id: sessionId,
        eventId,
        isActive: true,
        canceledAt: null,
        startsAt: { gt: new Date() },
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            imageUrl: true,
            priceFrom: true,
            isActive: true,
            isDeleted: true,
          },
        },
        offer: true,
      },
    });

    if (!session || !session.event) {
      throw new NotFoundException({ code: 'SESSION_NOT_FOUND', message: 'Сеанс не найден или недоступен' });
    }
    if (session.event.isDeleted || !session.event.isActive) {
      throw new BadRequestException({ code: 'EVENT_NOT_AVAILABLE', message: 'Событие недоступно' });
    }

    let offer = session.offer;
    if (!offer || offer.status !== 'ACTIVE') {
      const primaryOffer = await this.prisma.eventOffer.findFirst({
        where: { eventId, status: 'ACTIVE' },
        orderBy: [{ isPrimary: 'desc' }, { priority: 'desc' }],
      });
      if (!primaryOffer) {
        throw new BadRequestException({ code: 'NO_OFFER', message: 'Нет доступного оффера для покупки' });
      }
      offer = primaryOffer;
    }

    const widgetData = await this.widgetsApi.getEventWithSessions(eventId);
    const sessionDto = widgetData.sessions.find((s) => s.id === sessionId);
    if (!sessionDto) {
      throw new NotFoundException({ code: 'SESSION_NOT_FOUND', message: 'Сеанс не найден в выдаче' });
    }
    if (sessionDto.isSoldOut || sessionDto.available < qty) {
      throw new BadRequestException({
        code: 'NOT_ENOUGH_AVAILABLE',
        message: `Недостаточно мест (доступно: ${sessionDto.available})`,
      });
    }

    let priceFrom = session.event.priceFrom ?? 0;
    if (Array.isArray(session.prices) && session.prices.length > 0) {
      const first = (session.prices as { price?: number }[])[0];
      if (first?.price != null) priceFrom = first.price;
    }
    if (offer.priceFrom != null) priceFrom = offer.priceFrom;

    const cartItem = {
      eventId: session.event.id,
      offerId: offer.id,
      sessionId: session.id,
      quantity: qty,
      eventTitle: session.event.title,
      eventSlug: session.event.slug,
      imageUrl: session.event.imageUrl ?? undefined,
      priceFrom,
      purchaseType: offer.purchaseType,
      source: offer.source,
      deeplink: offer.deeplink ?? undefined,
      badge: offer.badge ?? undefined,
    };

    const { packageId, code } = await this.checkoutService.createPackage({
      items: [cartItem],
      forcePlatformPayment: true, // Виджет на нашей странице: оплата через YooKassa (PLATFORM)
    });

    await this.checkoutService.updatePackageContacts(packageId, {
      name: buyer.name,
      email: buyer.email,
      phone: buyer.phone,
    });

    const key = idempotencyKey ?? randomUUID();
    const paymentResult = await this.paymentService.createPaymentIntent(packageId, key);

    const cs = await this.prisma.checkoutSession.findUnique({
      where: { id: packageId },
      select: { expiresAt: true },
    });

    this.logger.log(
      `Widget checkout: session=${packageId} shortCode=${code} provider=${_provider} eventId=${eventId}`,
    );

    return {
      checkoutSessionId: packageId,
      shortCode: code,
      expiresAt: cs?.expiresAt?.toISOString() ?? new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      redirectUrl: paymentResult.paymentUrl ?? '',
    };
  }
}
