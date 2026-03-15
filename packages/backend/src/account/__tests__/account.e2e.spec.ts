/**
 * Мини-e2e для AccountController: проверка роутинга и контракта
 * /account/purchases и /account/orders/:id.
 */

import { Controller, Get, Module, Param, Query, Req, UseGuards } from '@nestjs/common';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as http from 'http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AccountController } from '../account.controller';
import { AccountService } from '../account.service';
import { UserJwtGuard } from '../../user/user.guard';

@Injectable()
class TestUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = { id: 'user-1' };
    return true;
  }
}

@UseGuards(TestUserGuard)
@Controller('account')
class TestAccountController extends AccountController {}

class FakeAccountService {
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

@Module({
  controllers: [TestAccountController],
  providers: [
    { provide: AccountService, useClass: FakeAccountService },
    { provide: UserJwtGuard, useClass: TestUserGuard },
  ],
})
class TestAccountModule {}

function httpGet(url: string): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const r = http.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () =>
        resolve({
          statusCode: res.statusCode ?? 0,
          body: Buffer.concat(chunks).toString('utf8'),
        }),
      );
    });
    r.on('error', reject);
  });
}

describe('AccountController E2E (minimal)', () => {
  let baseUrl: string;
  let app: { close: () => Promise<void> };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestAccountModule],
    }).compile();

    const nestApp = moduleRef.createNestApplication();
    await nestApp.init();
    await nestApp.listen(0);

    const addr = nestApp.getHttpServer().address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
    app = nestApp;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /account/purchases returns purchase list', async () => {
    const r = await httpGet(`${baseUrl}/account/purchases?page=1&limit=10`);
    expect(r.statusCode).toBe(200);
    const body = JSON.parse(r.body);
    expect(body.total).toBe(1);
    expect(body.items[0].purchaseId).toBe('s1');
    expect(body.items[0].purchaseType).toBe('INTERNAL_TICKET');
  });

  it('GET /account/orders/:id returns order detail', async () => {
    const r = await httpGet(`${baseUrl}/account/orders/order-1`);
    expect(r.statusCode).toBe(200);
    const body = JSON.parse(r.body);
    expect(body.id).toBe('order-1');
    expect(body.ownerId).toBe('user-1');
  });
}

