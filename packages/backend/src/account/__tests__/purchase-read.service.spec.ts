import { describe, expect, it } from 'vitest';

import { PurchaseReadService } from '../purchase-read.service';

describe('PurchaseReadService.mapSessionToPurchase', () => {
  const service = new PurchaseReadService();

  function makeSession(overrides: Partial<any> = {}): any {
    const now = new Date();
    return {
      id: 'session-1',
      shortCode: 'CS-1234',
      status: 'COMPLETED',
      createdAt: now,
      offersSnapshot: [
        {
          eventTitle: 'Test Event',
          sessionId: 'sess-1',
          quantity: 2,
        },
      ],
      paymentIntents: [
        {
          status: 'PAID',
          paymentUrl: 'https://pay.example/session/123',
        },
      ],
      fulfillmentItems: [],
      ...overrides,
    };
  }

  it('maps internal ticket session with trackUrl', () => {
    const session = makeSession();
    const ctx = {
      appUrl: 'http://localhost:3000',
      sessionStartsAtMap: new Map<string, string>([['sess-1', new Date().toISOString()]]),
    };

    const dto = service.mapSessionToPurchase(session, ctx);

    expect(dto.purchaseId).toBe('session-1');
    expect(dto.shortCode).toBe('CS-1234');
    expect(dto.eventTitle).toBe('Test Event');
    expect(dto.purchaseType).toBe('INTERNAL_TICKET');
    expect(dto.ticketAvailable).toBe(true);
    expect(dto.primaryAction?.label).toBe('Открыть билет');
    expect(dto.primaryAction?.url).toContain('/orders/track?code=CS-1234');
  });

  it('maps external voucher session with external url', () => {
    const session = makeSession({
      fulfillmentItems: [
        { purchaseFlow: 'EXTERNAL', externalPaymentUrl: 'https://partner/voucher/123' },
      ],
    });
    const ctx = {
      appUrl: 'http://localhost:3000',
      sessionStartsAtMap: new Map<string, string>(),
    };

    const dto = service.mapSessionToPurchase(session, ctx);

    expect(dto.purchaseType).toBe('EXTERNAL_VOUCHER');
    expect(dto.ticketAvailable).toBe(true);
    expect(dto.primaryAction?.label).toBe('Посмотреть ваучер');
  });

  it('maps completed booking without artifacts as internal ticket with track-only artifact', () => {
    const session = makeSession({
      status: 'COMPLETED',
      paymentIntents: [
        {
          status: 'PAID',
          paymentUrl: null,
        },
      ],
      fulfillmentItems: [],
    });
    const ctx = {
      appUrl: 'http://localhost:3000',
      sessionStartsAtMap: new Map<string, string>(),
    };

    const dto = service.mapSessionToPurchase(session, ctx);

    expect(dto.purchaseType).toBe('INTERNAL_TICKET');
    // hasTrack=true даёт trackUrl, поэтому ticketAvailable=true как "есть что открыть"
    expect(dto.ticketAvailable).toBe(true);
  });

  it('marks awaiting payment purchase with pay action when paymentUrl is present', () => {
    const session = makeSession({
      status: 'AWAITING_PAYMENT',
      paymentIntents: [
        {
          status: 'PENDING',
          paymentUrl: 'https://pay.example/session/awaiting',
        },
      ],
      fulfillmentItems: [],
    });
    const ctx = {
      appUrl: 'http://localhost:3000',
      sessionStartsAtMap: new Map<string, string>(),
    };

    const dto = service.mapSessionToPurchase(session, ctx);

    expect(dto.purchaseType).toBe('AWAITING_PAYMENT');
    expect(dto.displayStatus).toBe('Ожидает оплаты');
    expect(dto.ticketAvailable).toBe(false);
    expect(dto.primaryAction?.label).toBe('Оплатить');
    expect(dto.primaryAction?.url).toBe('https://pay.example/session/awaiting');
  });
});

