/**
 * Мини-e2e для публичного трекинга заказа по shortCode.
 */

import { Controller, Get, Module, Param } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as http from 'http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CheckoutController } from '../checkout.controller';
import { CheckoutService } from '../checkout.service';

@Controller('checkout')
class TestCheckoutController extends CheckoutController {}

class FakeCheckoutService {
  trackByShortCode(code: string) {
    return Promise.resolve({ shortCode: code, status: 'COMPLETED' });
  }
}

@Module({
  controllers: [TestCheckoutController],
  providers: [{ provide: CheckoutService, useClass: FakeCheckoutService }],
})
class TestCheckoutModule {}

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

describe('Checkout track E2E (minimal)', () => {
  let baseUrl: string;
  let app: { close: () => Promise<void> };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestCheckoutModule],
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

  it('GET /checkout/track/:shortCode returns tracking data', async () => {
    const r = await httpGet(`${baseUrl}/checkout/track/CS-TEST`);
    expect(r.statusCode).toBe(200);
    const body = JSON.parse(r.body);
    expect(body.shortCode).toBe('CS-TEST');
    expect(body.status).toBe('COMPLETED');
  });
}

