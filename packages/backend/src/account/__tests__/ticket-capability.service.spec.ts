import { describe, expect, it } from 'vitest';

import type { Prisma } from '@prisma/client';

import { TicketCapabilityService } from '../ticket-capability.service';

function makeSession(partial?: Partial<Prisma.CheckoutSessionGetPayload<{ include: { paymentIntents: true; fulfillmentItems: true } }>>) {
  return {
    id: 'session-1',
    shortCode: 'CS-1',
    status: 'COMPLETED',
    createdAt: new Date('2026-03-15T10:00:00.000Z'),
    offersSnapshot: [],
    paymentIntents: [],
    fulfillmentItems: [],
    // остальные поля для теста несущественны
    ...(partial as any),
  } as Prisma.CheckoutSessionGetPayload<{ include: { paymentIntents: true; fulfillmentItems: true } }>;
}

describe('TicketCapabilityService', () => {
  const service = new TicketCapabilityService();

  it('detects internal ticket when session is COMPLETED', () => {
    const session = makeSession({ status: 'COMPLETED' });

    const result = service.getTicketCapability({
      session,
      appUrl: 'http://localhost:3000',
    });

    expect(result.hasArtifact).toBe(true);
    expect(result.primaryArtifact).not.toBeNull();
    expect(result.primaryArtifact?.type).toBe('INTERNAL_TICKET');
    expect(result.canOpenInternalTrack).toBe(true);
  });

  it('detects external voucher when fulfillment has externalPaymentUrl', () => {
    const session = makeSession({
      status: 'CONFIRMED',
      fulfillmentItems: [
        {
          id: 'f1',
          checkoutSessionId: 'session-1',
          lineItemIndex: 0,
          purchaseFlow: 'EXTERNAL',
          status: 'CONFIRMED',
          externalPaymentUrl: 'https://partner/voucher/123',
        } as any,
      ],
    });

    const result = service.getTicketCapability({
      session,
      appUrl: 'http://localhost:3000',
    });

    expect(result.hasArtifact).toBe(true);
    expect(result.primaryArtifact).not.toBeNull();
    expect(result.primaryArtifact?.type).toBe('EXTERNAL_VOUCHER');
    expect(result.canOpenExternalVoucher).toBe(true);
  });

  it('returns no artifact when neither track nor external url exist', () => {
    const session = makeSession({
      status: 'CONFIRMED',
      fulfillmentItems: [],
    });

    const result = service.getTicketCapability({
      session,
      appUrl: 'http://localhost:3000',
    });

    expect(result.hasArtifact).toBe(false);
    expect(result.primaryArtifact).toBeNull();
    expect(result.allArtifacts).toHaveLength(0);
  });
});

