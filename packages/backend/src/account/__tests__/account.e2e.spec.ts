/**
 * Мини-e2e для AccountController: проверка роутинга и контракта
 * /account/purchases и /account/orders/:id.
 */

import { Controller, ForbiddenException, Get, Param, Post, Query, Req, UseGuards, Body } from '@nestjs/common';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { AccountService } from '../account.service';

@Injectable()
class TestUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = { id: 'user-1' };
    return true;
  }
}

@Controller('account')
@UseGuards(TestUserGuard)
class TestAccountController {
  constructor(private readonly account: AccountService) {}

  @Get('me')
  getMe(@Req() req: { user: { id: string } }) {
    return this.account.getSummary(req.user.id);
  }

  @Get('purchases')
  getPurchases(
    @Req() req: { user: { id: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.account.getPurchases(req.user.id, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('orders')
  getOrders(
    @Req() req: { user: { id: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.account.getOrders(req.user.id, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('orders/:id')
  getOrderDetail(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.account.getOrderDetail(req.user.id, id);
  }

  @Get('tickets')
  getTickets(@Req() req: { user: { id: string } }) {
    return this.account.getTickets(req.user.id);
  }

  @Get('reviews')
  getReviews(
    @Req() req: { user: { id: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.account.getReviews(req.user.id, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('reviews/:id/dispute')
  getReviewDispute(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.account.getReviewDispute(req.user.id, id);
  }

  @Post('reviews/:id/dispute/messages')
  postReviewDisputeMessage(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() body: { body: string },
  ) {
    return this.account.postReviewDisputeMessage(req.user.id, id, body.body);
  }

  @Post('reviews/:id/dispute/read')
  markReviewDisputeRead(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.account.markReviewDisputeRead(req.user.id, id);
  }

  @Get('notifications/unread-count')
  getNotificationsUnreadCount(@Req() req: { user: { id: string } }) {
    return this.account.getNotificationsUnreadCount(req.user.id);
  }
}

class FakeAccountService implements Partial<AccountService> {
  getSummary() {
    return Promise.resolve({
      user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
      ordersCount: 1,
      activeTicketsCount: 1,
      favoritesCount: 0,
    });
  }

  getPurchases(userId: string, _params: { page?: number; limit?: number }) {
    return Promise.resolve({
      items: [
        {
          purchaseId: 's1',
          shortCode: 'CS-1',
          eventTitle: 'Test',
          purchaseDate: new Date().toISOString(),
          eventDate: null,
          displayStatus: 'Билет доступен',
          purchaseType: 'INTERNAL_TICKET',
          ticketAvailable: true,
          primaryAction: { label: 'Открыть билет', url: 'http://localhost/orders/track?code=CS-1' },
          secondaryAction: null,
        },
      ],
      total: 1,
      userId,
    });
  }

  getOrders() {
    return Promise.resolve({
      items: [],
      total: 0,
    });
  }

  getOrderDetail(userId: string, id: string) {
    return Promise.resolve({ id, ownerId: userId, shortCode: 'CS-1' });
  }

  getTickets(userId: string) {
    return Promise.resolve([
      {
        orderId: 's1',
        shortCode: 'CS-1',
        eventTitle: 'Test ticket',
        eventSlug: 'test-event',
        sessionStartsAt: null,
        status: 'CONFIRMED',
        trackUrl: `http://localhost/orders/track?code=CS-1`,
        externalPaymentUrl: null,
        userId,
      },
    ]);
  }

  getProfile(userId: string) {
    return Promise.resolve({ id: userId, email: 'test@example.com', name: 'Test' });
  }

  updateProfile(userId: string) {
    return Promise.resolve({ id: userId, email: 'test@example.com', name: 'Updated' });
  }

  getReviews(userId: string, _params: { page?: number; limit?: number }) {
    return Promise.resolve({
      items: [
        {
          id: 'r1',
          eventId: 'e1',
          eventSlug: 'event-1',
          eventTitle: 'Event 1',
          cityName: 'City',
          rating: 5,
          text: 'Отзыв',
          status: 'APPROVED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          hasDispute: true,
          unreadDisputeMessagesCount: 2,
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
      userId,
    });
  }

  getReviewDispute(userId: string, reviewId: string) {
    return Promise.resolve({
      status: 'MODERATOR_REVIEW',
      canReply: true,
      messages: [
        {
          id: 'm1',
          authorType: 'MODERATOR' as const,
          authorLabel: 'Поддержка',
          body: 'Сообщение модератора',
          createdAt: new Date().toISOString(),
          isMine: false,
        },
        {
          id: 'm2',
          authorType: 'USER' as const,
          authorLabel: 'Вы',
          body: 'Ответ пользователя',
          createdAt: new Date().toISOString(),
          isMine: true,
        },
      ],
      userId,
      reviewId,
    });
  }

  postReviewDisputeMessage(userId: string, reviewId: string, body: string) {
    return Promise.resolve({
      id: 'm-new',
      authorType: 'USER' as const,
      authorLabel: 'Вы',
      body,
      createdAt: new Date().toISOString(),
      isMine: true,
      userId,
      reviewId,
    });
  }

  markReviewDisputeRead(userId: string, reviewId: string) {
    return Promise.resolve({ updated: 3, userId, reviewId });
  }

  getNotificationsUnreadCount(userId: string) {
    return Promise.resolve({ reviewsDisputesUnread: 5, userId });
  }
}

describe('AccountController E2E (minimal)', () => {
  const controller = new TestAccountController(new FakeAccountService() as AccountService);

  it('GET /account/purchases returns purchase list', async () => {
    const body = await controller.getPurchases({ user: { id: 'user-1' } }, '1', '10');
    expect(body.total).toBe(1);
    expect(body.items[0].purchaseId).toBe('s1');
    expect(body.items[0].purchaseType).toBe('INTERNAL_TICKET');
  });

  it('GET /account/tickets returns ticket list for current user', async () => {
    const body = await controller.getTickets({ user: { id: 'user-1' } });
    expect(body.length).toBe(1);
    expect(body[0].shortCode).toBe('CS-1');
    expect(body[0].trackUrl).toContain('CS-1');
  });

  it('GET /account/orders/:id returns order detail', async () => {
    const body = await controller.getOrderDetail({ user: { id: 'user-1' } }, 'order-1');
    expect(body.id).toBe('order-1');
    expect(body.ownerId).toBe('user-1');
  });

  it('GET /account/orders/:id propagates ForbiddenException from service for foreign order', async () => {
    class ForbiddenAccountService extends FakeAccountService {
      override getOrderDetail(): Promise<never> {
        throw new ForbiddenException('Доступ запрещён');
      }
    }
    const ctrl = new TestAccountController(new ForbiddenAccountService() as AccountService);

    expect(() => ctrl.getOrderDetail({ user: { id: 'user-1' } }, 'foreign-order')).toThrow(
      ForbiddenException,
    );
  });

  it('GET /account/reviews returns reviews list', async () => {
    const body = await controller.getReviews({ user: { id: 'user-1' } }, '1', '10');
    expect(body.total).toBe(1);
    expect(body.items[0].id).toBe('r1');
    expect(body.items[0].hasDispute).toBe(true);
  });

  it('GET /account/reviews/:id/dispute returns dispute dialog', async () => {
    const body = await controller.getReviewDispute({ user: { id: 'user-1' } }, 'r1');
    expect(body.status).toBe('MODERATOR_REVIEW');
    expect(body.canReply).toBe(true);
    expect(body.messages.length).toBe(2);
  });

  it('POST /account/reviews/:id/dispute/messages sends message to dispute', async () => {
    const body = await controller.postReviewDisputeMessage(
      { user: { id: 'user-1' } },
      'r1',
      { body: 'Новый ответ' },
    );
    expect(body.id).toBe('m-new');
    expect(body.body).toBe('Новый ответ');
  });

  it('POST /account/reviews/:id/dispute/read marks messages as read', async () => {
    const body = await controller.markReviewDisputeRead({ user: { id: 'user-1' } }, 'r1');
    expect(body.updated).toBe(3);
  });

  it('GET /account/notifications/unread-count returns unread disputes count', async () => {
    const body = await controller.getNotificationsUnreadCount({ user: { id: 'user-1' } });
    expect(body.reviewsDisputesUnread).toBe(5);
  });
});

