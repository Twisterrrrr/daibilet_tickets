import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus, ReviewDisputeStatus, ReviewStatus, Prisma } from '@prisma/client';

import { CheckoutService } from '../checkout/checkout.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserAuthService } from '../user/user-auth.service';
import { UserFavoritesService } from '../user/user-favorites.service';
import type {
  AccountOrderListItemDto,
  AccountReviewItemDto,
  AccountSummaryDto,
  AccountTicketItemDto,
  PurchaseListItemDto,
  UpdateAccountProfileDto,
} from './dto/account.dto';
import type { CheckoutSessionWithRelations } from './purchase-read.service';
import { PurchaseReadService } from './purchase-read.service';

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly checkoutService: CheckoutService,
    private readonly userAuth: UserAuthService,
    private readonly userFavorites: UserFavoritesService,
    private readonly purchaseRead: PurchaseReadService,
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

    const items: PurchaseListItemDto[] = sessions.map((s) =>
      this.purchaseRead.mapSessionToPurchase(s as CheckoutSessionWithRelations, {
        appUrl,
        sessionStartsAtMap,
      }),
    );

    return { items, total };
  }

  async getReviews(
    userId: string,
    params: { page?: number; limit?: number; status?: ReviewStatus },
  ): Promise<{
    items: AccountReviewItemDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const user = await this.userAuth.getProfile(userId);
    const authorEmail = user?.email;

    if (!authorEmail) {
      return { items: [], total: 0, page, totalPages: 1 };
    }

    const where: Prisma.ReviewWhereInput = {
      authorEmail,
    };

    if (params.status) {
      where.status = params.status;
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          event: {
            select: {
              id: true,
              slug: true,
              title: true,
              city: { select: { name: true } },
            },
          },
          disputes: {
            select: { id: true },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);
    const items: AccountReviewItemDto[] = reviews.map((r) => {
      const hasDispute = Array.isArray(r.disputes) && r.disputes.length > 0;

      return {
        id: r.id,
        eventId: r.event?.id ?? null,
        eventSlug: r.event?.slug ?? null,
        eventTitle: r.event?.title ?? 'Событие',
        cityName: r.event?.city?.name ?? null,
        rating: r.rating,
        text: r.text,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        hasDispute,
        // TODO: заполнить после успешного prisma generate и добавления ReviewDisputeMessage в клиент
        unreadDisputeMessagesCount: 0,
      };
    });

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return { items, total, page, totalPages };
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

  async getReviewDispute(userId: string, reviewId: string) {
    const user = await this.userAuth.getProfile(userId);
    const email = user?.email;
    if (!email) {
      throw new Error('User email is required');
    }

    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, authorEmail: email },
      include: {
        disputes: {
          select: { id: true, status: true },
        },
        event: {
          select: { title: true, city: { select: { name: true } } },
        },
      },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    const dispute = review.disputes?.[0] ?? null;
    const status: ReviewDisputeStatus | null = dispute?.status ?? null;
    const openStatuses: ReviewDisputeStatus[] = [ReviewDisputeStatus.MODERATOR_REVIEW];
    const canReply = status ? openStatuses.includes(status) : false;

    return {
      status,
      canReply,
      // История сообщений будет подключена после обновления prisma client
      messages: [],
    };
  }

  async postReviewDisputeMessage(userId: string, reviewId: string, body: string) {
    // В этом окружении persist в БД отключён, чтобы не ломать старый Prisma client.
    // Сообщение возвращается только для локального отображения на фронте.
    const now = new Date();
    return {
      id: `${userId}-${now.getTime()}`,
      authorType: 'USER' as const,
      authorLabel: 'Вы',
      body,
      createdAt: now.toISOString(),
      isMine: true,
    };
  }

  async markReviewDisputeRead(userId: string, reviewId: string) {
    // Пока prisma client не обновлён, просто возвращаем 0 как no-op.
    return { updated: 0 };
  }

  async getNotificationsUnreadCount(userId: string) {
    // Временная заглушка: до обновления Prisma client считаем только по полям ReviewDisputeMessage/Notification вне этого сервиса.
    return {
      totalUnread: 0,
      reviewsDisputesUnread: 0,
      supportUnread: 0,
      ordersUnread: 0,
    };
  }

  async getNotifications(
    userId: string,
    params: { type?: string; page?: number; limit?: number },
  ): Promise<{
    items: {
      id: string;
      type: string;
      title: string;
      body: string;
      meta: Record<string, unknown> | null;
      isRead: boolean;
      createdAt: string;
    }[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Каркас: пока возвращаем пустой список, чтобы не зависеть от Notification до миграции.
    const page = Math.max(1, params.page ?? 1);
    return {
      items: [],
      total: 0,
      page,
      totalPages: 1,
    };
  }

  async markNotificationRead(userId: string, id: string) {
    // Каркас: no-op, возвращаем ok=true для совместимости с фронтом.
    return { ok: true };
  }

  async markAllNotificationsRead(userId: string) {
    // Каркас: no-op.
    return { ok: true };
  }
}
