import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '@prisma/client';

import { CheckoutService } from '../checkout/checkout.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserAuthService } from '../user/user-auth.service';
import { UserFavoritesService } from '../user/user-favorites.service';
import type {
  AccountOrderListItemDto,
  AccountSummaryDto,
  AccountTicketItemDto,
  PurchaseListItemDto,
  UpdateAccountProfileDto,
} from './dto/account.dto';
import { getPurchaseDisplayType } from './purchase-display.util';

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly checkoutService: CheckoutService,
    private readonly userAuth: UserAuthService,
    private readonly userFavorites: UserFavoritesService,
  ) {}

  async getSummary(userId: string): Promise<AccountSummaryDto> {
    const [user, ordersCount, paidSessions, favoritesCount] = await Promise.all([
      this.userAuth.getProfile(userId),
      this.prisma.checkoutSession.count({ where: { userId } }),
      this.prisma.checkoutSession.findMany({
        where: { userId, status: 'COMPLETED' },
        select: {
          id: true,
          paymentIntents: {
            where: { status: PaymentStatus.PAID },
            take: 1,
            select: { id: true },
          },
          fulfillmentItems: { select: { id: true } },
        },
      }),
      this.userFavorites.getSlugs(userId).then((s) => s.length),
    ]);

    let activeTicketsCount = 0;
    for (const s of paidSessions) {
      if (s.paymentIntents.length > 0) {
        activeTicketsCount += s.fulfillmentItems.length;
      }
    }

    return {
      user: user
        ? { id: user.id, name: user.name, email: user.email }
        : { id: userId, name: '', email: '' },
      ordersCount,
      activeTicketsCount,
      favoritesCount,
    };
  }

  async getPurchases(
    userId: string,
    params: { page?: number; limit?: number },
  ): Promise<{ items: PurchaseListItemDto[]; total: number }> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      this.prisma.checkoutSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          paymentIntents: { orderBy: { createdAt: 'desc' }, take: 1 },
          fulfillmentItems: true,
        },
      }),
      this.prisma.checkoutSession.count({ where: { userId } }),
    ]);

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const sessionIds = [
      ...new Set(
        sessions.flatMap(
          (s) =>
            (s.offersSnapshot as Array<{ sessionId?: string }>)?.map((o) => o.sessionId).filter(Boolean) ?? [],
        ),
      ),
    ].filter(Boolean) as string[];
    const sessionStartsAtMap =
      sessionIds.length > 0
        ? await this.prisma.eventSession
            .findMany({
              where: { id: { in: sessionIds } },
              select: { id: true, startsAt: true },
            })
            .then((list) => new Map(list.map((e) => [e.id, e.startsAt.toISOString()])))
        : new Map<string, string>();

    const items: PurchaseListItemDto[] = sessions.map((s) => {
      const lastIntent = s.paymentIntents[0];
      const paymentStatus = lastIntent?.status ?? 'PENDING';
      const snapshot = (s.offersSnapshot as Array<{
        eventTitle?: string;
        sessionId?: string;
        quantity?: number;
      }>) ?? [];
      const firstSnap = snapshot[0];
      const eventTitle = firstSnap?.eventTitle ?? 'Покупка';
      const firstSessionId = firstSnap?.sessionId;
      const eventDate = firstSessionId ? sessionStartsAtMap.get(firstSessionId) ?? null : null;

      const hasExternalUrl = s.fulfillmentItems.some((f) => f.externalPaymentUrl);
      const hasTrack = s.status === 'COMPLETED';
      const trackUrl = hasTrack ? `${appUrl}/orders/track?code=${s.shortCode}` : null;
      const externalUrl = s.fulfillmentItems.find((f) => f.externalPaymentUrl)?.externalPaymentUrl ?? null;
      const isExternalFlow = s.fulfillmentItems.some((f) => f.purchaseFlow === 'EXTERNAL');

      const { purchaseType, displayStatus } = getPurchaseDisplayType({
        sessionStatus: s.status,
        paymentStatus,
        isExternalFlow,
        hasExternalUrl,
        hasTrack,
      });
      const ticketAvailable =
        (hasTrack && trackUrl !== null) || (hasExternalUrl && externalUrl !== null);

      let primaryAction: { label: string; url: string } | null = null;
      let secondaryAction: { label: string; url: string } | null = null;

      if (purchaseType === 'INTERNAL_TICKET' && trackUrl) {
        primaryAction = { label: 'Открыть билет', url: trackUrl };
      } else if (purchaseType === 'EXTERNAL_VOUCHER' && externalUrl) {
        primaryAction = { label: 'Посмотреть ваучер', url: externalUrl };
        if (trackUrl) secondaryAction = { label: 'Открыть трекинг', url: trackUrl };
      } else if (purchaseType === 'BOOKING_CONFIRMATION' && trackUrl) {
        primaryAction = { label: 'Открыть трекинг', url: trackUrl };
      } else if (purchaseType === 'AWAITING_PAYMENT' && lastIntent?.paymentUrl) {
        primaryAction = { label: 'Оплатить', url: lastIntent.paymentUrl };
      }

      return {
        purchaseId: s.id,
        shortCode: s.shortCode,
        eventTitle,
        purchaseDate: s.createdAt.toISOString(),
        eventDate,
        displayStatus,
        purchaseType,
        ticketAvailable,
        primaryAction,
        secondaryAction,
      };
    });

    return { items, total };
  }

  async getOrders(
    userId: string,
    params: { page?: number; limit?: number },
  ): Promise<{ items: AccountOrderListItemDto[]; total: number }> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      this.prisma.checkoutSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          paymentIntents: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { status: true },
          },
        },
      }),
      this.prisma.checkoutSession.count({ where: { userId } }),
    ]);

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const items: AccountOrderListItemDto[] = sessions.map((s) => {
      const lastIntent = s.paymentIntents[0];
      const paymentStatus = lastIntent?.status ?? 'PENDING';
      const snapshot = (s.offersSnapshot as Array<{ eventTitle?: string; quantity?: number }>) ?? [];
      const itemsPreview = snapshot.slice(0, 5).map((snap) => ({
        eventTitle: snap.eventTitle ?? 'Позиция',
        quantity: snap.quantity ?? 1,
      }));
      return {
        id: s.id,
        shortCode: s.shortCode,
        createdAt: s.createdAt.toISOString(),
        status: s.status,
        paymentStatus,
        totalAmount: s.totalPrice,
        currency: 'RUB',
        itemsPreview,
        trackUrl: s.status === 'COMPLETED' ? `${appUrl}/orders/track?code=${s.shortCode}` : null,
      };
    });

    return { items, total };
  }

  async getOrderDetail(userId: string, id: string) {
    return this.checkoutService.getOrderByIdForUser(userId, id);
  }

  async getTickets(userId: string): Promise<AccountTicketItemDto[]> {
    const sessions = await this.prisma.checkoutSession.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        paymentIntents: { some: { status: PaymentStatus.PAID } },
      },
      include: { fulfillmentItems: true },
    });

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const sessionIds = [...new Set(sessions.flatMap((s) => (s.offersSnapshot as Array<{ sessionId?: string }>)?.map((o) => o.sessionId).filter(Boolean) ?? []))];
    const sessionStartsAt =
      sessionIds.length > 0
        ? await this.prisma.eventSession
            .findMany({
              where: { id: { in: sessionIds as string[] } },
              select: { id: true, startsAt: true },
            })
            .then((list) => new Map(list.map((e) => [e.id, e.startsAt.toISOString()])))
        : new Map<string, string>();

    const result: AccountTicketItemDto[] = [];
    for (const session of sessions) {
      const snapshot = (session.offersSnapshot as Array<{
        eventTitle?: string;
        eventSlug?: string;
        sessionId?: string;
        quantity?: number;
      }>) ?? [];
      const trackUrl = `${appUrl}/orders/track?code=${session.shortCode}`;
      for (let i = 0; i < snapshot.length; i++) {
        const snap = snapshot[i];
        const fi = session.fulfillmentItems.find((f) => f.lineItemIndex === i);
        result.push({
          orderId: session.id,
          shortCode: session.shortCode,
          eventTitle: snap.eventTitle ?? 'Билет',
          eventSlug: snap.eventSlug ?? '',
          sessionStartsAt: (snap.sessionId ? sessionStartsAt.get(snap.sessionId) : null) ?? null,
          status: fi?.status ?? 'CONFIRMED',
          trackUrl,
          externalPaymentUrl: fi?.externalPaymentUrl ?? null,
        });
      }
    }
    return result;
  }

  async getProfile(userId: string) {
    return this.userAuth.getProfile(userId);
  }

  async updateProfile(userId: string, dto: UpdateAccountProfileDto) {
    const data: { name?: string; email?: string } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (Object.keys(data).length === 0) return this.userAuth.getProfile(userId);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, name: true, lastLoginAt: true, createdAt: true },
    });
    return user;
  }
}
