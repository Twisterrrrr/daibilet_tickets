/**
 * Мини-e2e для публичного трекинга заказа по shortCode.
 */

import { Controller, Get, Param } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { CheckoutService } from '../checkout.service';

@Controller('checkout')
class TestCheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Get('track/:shortCode')
  trackOrder(@Param('shortCode') shortCode: string) {
    return this.checkoutService.trackByShortCode(shortCode);
  }
}

class FakeCheckoutService implements Partial<CheckoutService> {
  trackByShortCode(code: string) {
    return Promise.resolve({ shortCode: code, status: 'COMPLETED' });
  }
}

describe('Checkout track E2E (minimal)', () => {
  const controller = new TestCheckoutController(new FakeCheckoutService() as CheckoutService);

  it('GET /checkout/track/:shortCode returns tracking data', async () => {
    const body = await controller.trackOrder('CS-TEST');
    expect(body.shortCode).toBe('CS-TEST');
    expect(body.status).toBe('COMPLETED');
  });
});

