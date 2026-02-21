/**
 * Payment Invariants — тесты критических инвариантов данных.
 *
 * 2a. offersSnapshot immutability after PaymentIntent creation
 * 2b. PaymentIntent amount === partitionCart(snapshot).platformTotal
 * 2c. ProcessedWebhookEvent stores paymentIntentId for tracing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { PaymentService } from '../payment.service';
import { WebhookIdempotencyService } from '../webhook-idempotency.service';
import {
  SnapshotLineItem,
  PaymentFlowType,
  partitionCart,
} from '../cart-partitioning';

// ============================================================
// Helpers
// ============================================================

function makeSnapshotItem(overrides: Partial<SnapshotLineItem> = {}): SnapshotLineItem {
  return {
    lineItemIndex: 0,
    offerId: 'offer-1',
    eventId: 'event-1',
    source: 'MANUAL',
    purchaseType: 'REQUEST',
    purchaseFlow: PaymentFlowType.PLATFORM,
    eventTitle: 'Test Event',
    eventSlug: 'test-event',
    eventImage: null,
    badge: null,
    operatorName: 'Test Operator',
    unitPrice: 100000,
    quantity: 1,
    lineTotal: 100000,
    priceCurrency: 'RUB',
    supplierId: 'supplier-1',
    commissionRateSnapshot: 0.20,
    platformFeeSnapshot: 20000,
    supplierAmountSnapshot: 80000,
    deeplink: null,
    widgetProvider: null,
    widgetPayload: null,
    meetingPoint: null,
    meetingInstructions: null,
    operationalPhone: null,
    operationalNote: null,
    snapshotAt: new Date().toISOString(),
    ...overrides,
  };
}

function createMockPrisma() {
  const sessions = new Map<string, Record<string, unknown>>();
  const intents = new Map<string, Record<string, unknown>>();
  const webhookEvents = new Map<string, Record<string, unknown>>();
  let intentCounter = 0;

  return {
    sessions,
    intents,
    webhookEvents,

    checkoutSession: {
      findUnique: vi.fn().mockImplementation(({ where }: any) => sessions.get(where.id) || null),
      update: vi.fn().mockImplementation(({ where, data }: any) => {
        const s = sessions.get(where.id);
        if (s) Object.assign(s, data);
        return s;
      }),
    },
    paymentIntent: {
      findUnique: vi.fn().mockImplementation(({ where }: any) => {
        if (where.id) return intents.get(where.id) || null;
        if (where.idempotencyKey) {
          for (const i of intents.values()) {
            if (i.idempotencyKey === where.idempotencyKey) return i;
          }
        }
        return null;
      }),
      findFirst: vi.fn().mockImplementation(({ where }: any) => {
        for (const i of intents.values()) {
          if (where.checkoutSessionId && i.checkoutSessionId !== where.checkoutSessionId) continue;
          if (where.status?.in && !where.status.in.includes(i.status)) continue;
          return i;
        }
        return null;
      }),
      findMany: vi.fn().mockReturnValue([]),
      create: vi.fn().mockImplementation(({ data }: any) => {
        intentCounter++;
        const id = data.id || `intent-${intentCounter}`;
        const record = { id, ...data };
        intents.set(id, record);
        return record;
      }),
      update: vi.fn().mockImplementation(({ where, data }: any) => {
        const i = intents.get(where.id);
        if (i) Object.assign(i, data);
        return i;
      }),
    },
    operator: {
      findUnique: vi.fn().mockReturnValue(Promise.resolve(null)),
      update: vi.fn().mockReturnValue(Promise.resolve(null)),
    },
    processedWebhookEvent: {
      findUnique: vi.fn().mockImplementation(({ where }: any) =>
        webhookEvents.get(where.providerEventId) || null,
      ),
      create: vi.fn().mockImplementation(({ data }: any) => {
        webhookEvents.set(data.providerEventId, data);
        return data;
      }),
    },
    $transaction: vi.fn().mockImplementation(async (fn: any) => fn(prisma)),
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  var prisma: any;
}

const mockConfig = {
  get: vi.fn().mockReturnValue('STUB'),
  getOrThrow: vi.fn().mockReturnValue('http://localhost:3000'),
};

// ============================================================
// 2a. offersSnapshot Immutability
// ============================================================
describe('Invariant 2a: offersSnapshot immutability after PaymentIntent creation', () => {
  it('rejects payment if snapshot amount changed since first intent', async () => {
    const prisma = createMockPrisma();

    // Setup session with 1-item snapshot (100000 = 1000 RUB)
    const originalSnapshot = [makeSnapshotItem({ lineTotal: 100000 })];
    prisma.sessions.set('session-imm', {
      id: 'session-imm',
      shortCode: 'CS-IMM',
      status: 'CONFIRMED',
      offersSnapshot: originalSnapshot,
      totalPrice: 100000,
    });

    const service = new PaymentService(prisma as any, mockConfig as any);

    // First intent succeeds
    const result1 = await service.createPaymentIntent('session-imm', 'key-first');
    expect(result1.amount).toBe(100000);

    // Now "tamper" the snapshot (simulate frontend changing it)
    const tamperedSnapshot = [makeSnapshotItem({ lineTotal: 200000, unitPrice: 200000 })];
    prisma.sessions.get('session-imm')!.offersSnapshot = tamperedSnapshot;

    // Second attempt: should be rejected due to invariant check
    await expect(
      service.createPaymentIntent('session-imm', 'key-second'),
    ).rejects.toThrow(ConflictException);
  });

  it('allows new intent when snapshot has not changed', async () => {
    const prisma = createMockPrisma();

    const snapshot = [makeSnapshotItem({ lineTotal: 150000, unitPrice: 150000 })];
    prisma.sessions.set('session-ok', {
      id: 'session-ok',
      shortCode: 'CS-OK',
      status: 'CONFIRMED',
      offersSnapshot: snapshot,
      totalPrice: 150000,
    });

    const service = new PaymentService(prisma as any, mockConfig as any);

    // First intent
    const result1 = await service.createPaymentIntent('session-ok', 'key-a');
    expect(result1.amount).toBe(150000);

    // Mark first as CANCELLED so a new one can be created
    prisma.intents.get(result1.paymentIntentId)!.status = 'CANCELLED';
    // Clear findFirst to not find active intent
    prisma.paymentIntent.findFirst.mockImplementation(({ where }: any) => {
      // Skip CANCELLED when looking for active
      for (const i of prisma.intents.values()) {
        if (where.checkoutSessionId && i.checkoutSessionId !== where.checkoutSessionId) continue;
        if (where.status?.in && !where.status.in.includes(i.status)) continue;
        return i;
      }
      return null;
    });

    // Second intent with same snapshot amount: should succeed
    const result2 = await service.createPaymentIntent('session-ok', 'key-b');
    expect(result2.amount).toBe(150000);
  });
});

// ============================================================
// 2b. PaymentIntent amount === partitionCart(snapshot).platformTotal
// ============================================================
describe('Invariant 2b: PaymentIntent amount matches snapshot sum', () => {
  it('amount equals partitionCart(snapshot).platformTotal', () => {
    const snapshot = [
      makeSnapshotItem({ lineItemIndex: 0, lineTotal: 100000, platformFeeSnapshot: 20000, supplierAmountSnapshot: 80000 }),
      makeSnapshotItem({ lineItemIndex: 1, offerId: 'offer-2', lineTotal: 200000, platformFeeSnapshot: 40000, supplierAmountSnapshot: 160000 }),
      makeSnapshotItem({ lineItemIndex: 2, offerId: 'offer-3', lineTotal: 50000, platformFeeSnapshot: 10000, supplierAmountSnapshot: 40000 }),
    ];

    const partitioned = partitionCart(snapshot);

    // platformTotal = sum of PLATFORM items' lineTotal
    expect(partitioned.platformTotal).toBe(350000);
    expect(partitioned.platform).toHaveLength(3);

    // Verify commission math per item
    for (const item of snapshot) {
      expect(item.platformFeeSnapshot! + item.supplierAmountSnapshot!).toBe(item.lineTotal);
    }
  });

  it('grossAmount matches platformTotal (set in createPaymentIntent)', async () => {
    const prisma = createMockPrisma();

    const snapshot = [
      makeSnapshotItem({ lineItemIndex: 0, lineTotal: 300000 }),
      makeSnapshotItem({ lineItemIndex: 1, offerId: 'offer-2', lineTotal: 200000 }),
    ];

    prisma.sessions.set('session-amt', {
      id: 'session-amt',
      shortCode: 'CS-AMT',
      status: 'CONFIRMED',
      offersSnapshot: snapshot,
      totalPrice: 500000,
    });

    const service = new PaymentService(prisma as any, mockConfig as any);
    const result = await service.createPaymentIntent('session-amt', 'key-amt');

    const expectedTotal = partitionCart(snapshot).platformTotal;
    expect(result.amount).toBe(expectedTotal);
    expect(result.amount).toBe(500000);

    // Verify: grossAmount stored in DB matches
    const storedIntent = prisma.intents.get(result.paymentIntentId)!;
    expect(storedIntent.grossAmount).toBe(expectedTotal);

    // Verify: platformFee + supplierAmount === grossAmount
    const platformFee = storedIntent.platformFee as number;
    const supplierAmount = storedIntent.supplierAmount as number;
    if (platformFee !== null && supplierAmount !== null) {
      expect(platformFee + supplierAmount).toBe(storedIntent.grossAmount);
    }
  });

  it('EXTERNAL items are excluded from payment amount', () => {
    const snapshot = [
      makeSnapshotItem({ lineItemIndex: 0, lineTotal: 300000, purchaseFlow: PaymentFlowType.PLATFORM }),
      makeSnapshotItem({
        lineItemIndex: 1,
        offerId: 'ext-1',
        lineTotal: 500000,
        purchaseFlow: PaymentFlowType.EXTERNAL,
        purchaseType: 'TC_WIDGET',
      }),
    ];

    const partitioned = partitionCart(snapshot);
    expect(partitioned.platformTotal).toBe(300000); // Only PLATFORM
    expect(partitioned.externalTotal).toBe(500000);
    expect(partitioned.grandTotal).toBe(800000);
  });
});

// ============================================================
// 2c. ProcessedWebhookEvent → paymentIntentId tracing
// ============================================================
describe('Invariant 2c: ProcessedWebhookEvent stores paymentIntentId', () => {
  it('processOnce stores paymentIntentId when provided', async () => {
    const prisma = createMockPrisma();
    const idempotency = new WebhookIdempotencyService(prisma as any);

    const intentId = 'intent-uuid-123';

    await idempotency.processOnce(
      'yk-evt-500',
      'YOOKASSA',
      'payment.succeeded',
      { mock: true },
      async () => 'PAID',
      intentId, // paymentIntentId
    );

    // Verify the stored event has paymentIntentId
    const stored = prisma.webhookEvents.get('yk-evt-500');
    expect(stored).toBeDefined();
    expect(stored!.paymentIntentId).toBe(intentId);
    expect(stored!.providerEventId).toBe('yk-evt-500');
    expect(stored!.result).toBe('PAID');
  });

  it('processOnce works without paymentIntentId (backward compatible)', async () => {
    const prisma = createMockPrisma();
    const idempotency = new WebhookIdempotencyService(prisma as any);

    await idempotency.processOnce(
      'yk-evt-501',
      'YOOKASSA',
      'payment.canceled',
      {},
      async () => 'CANCELLED',
      // No paymentIntentId
    );

    const stored = prisma.webhookEvents.get('yk-evt-501');
    expect(stored).toBeDefined();
    expect(stored!.paymentIntentId).toBeUndefined();
    expect(stored!.result).toBe('CANCELLED');
  });

  it('duplicate event still returns previous result without re-processing', async () => {
    const prisma = createMockPrisma();
    const idempotency = new WebhookIdempotencyService(prisma as any);

    // First call
    await idempotency.processOnce('yk-dup', 'YOOKASSA', 'payment.succeeded', {}, async () => 'PAID', 'intent-1');

    // Second call (duplicate)
    let handlerCalled = false;
    const result = await idempotency.processOnce('yk-dup', 'YOOKASSA', 'payment.succeeded', {}, async () => {
      handlerCalled = true;
      return 'PAID';
    }, 'intent-1');

    expect(result.processed).toBe(false);
    expect(handlerCalled).toBe(false);
  });
});
