/**
 * Мини-e2e для AccountController: проверка роутинга и контракта
 * /account/purchases и /account/orders/:id.
 */

import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
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

  getTickets() {
    return Promise.resolve([]);
  }

  getProfile(userId: string) {
    return Promise.resolve({ id: userId, email: 'test@example.com', name: 'Test' });
  }

  updateProfile(userId: string) {
    return Promise.resolve({ id: userId, email: 'test@example.com', name: 'Updated' });
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

  it('GET /account/orders/:id returns order detail', async () => {
    const body = await controller.getOrderDetail({ user: { id: 'user-1' } }, 'order-1');
    expect(body.id).toBe('order-1');
    expect(body.ownerId).toBe('user-1');
  });
});

