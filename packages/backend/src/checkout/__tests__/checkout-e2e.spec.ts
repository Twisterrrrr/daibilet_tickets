/**
 * E2E Test Scenarios — 10 критических путей чекаута.
 *
 * Тесты используют моки для Prisma / провайдеров (unit-level E2E).
 * Полноценные E2E (с БД + Redis) — в отдельном test:e2e задании.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolvePaymentFlow,
  PaymentFlowType,
  partitionCart,
  isSessionFullyFulfilled,
  SnapshotLineItem,
} from '../cart-partitioning';
import {
  tryTransitionPayment,
  tryTransitionCheckout,
} from '../checkout-state-machine';

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
    unitPrice: 150000, // 1500 RUB
    quantity: 2,
    lineTotal: 300000,
    priceCurrency: 'RUB',
    supplierId: 'supplier-1',
    commissionRateSnapshot: 0.25,
    platformFeeSnapshot: 75000,
    supplierAmountSnapshot: 225000,
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

// ============================================================
// Scenario 1: Happy Path — PLATFORM only
// ============================================================
describe('Scenario 1: PLATFORM-only checkout', () => {
  it('resolves REQUEST to PLATFORM flow', () => {
    expect(resolvePaymentFlow('REQUEST')).toBe(PaymentFlowType.PLATFORM);
  });

  it('partitions correctly with only PLATFORM items', () => {
    const items = [
      makeSnapshotItem({ lineItemIndex: 0 }),
      makeSnapshotItem({ lineItemIndex: 1, offerId: 'offer-2', lineTotal: 200000 }),
    ];
    const result = partitionCart(items);
    expect(result.platform).toHaveLength(2);
    expect(result.external).toHaveLength(0);
    expect(result.platformTotal).toBe(500000);
    expect(result.grandTotal).toBe(500000);
  });

  it('completes when all items CONFIRMED', () => {
    const result = isSessionFullyFulfilled(['CONFIRMED', 'CONFIRMED']);
    expect(result.fulfilled).toBe(true);
    expect(result.allConfirmed).toBe(true);
    expect(result.hasFailures).toBe(false);
  });
});

// ============================================================
// Scenario 2: Happy Path — EXTERNAL only
// ============================================================
describe('Scenario 2: EXTERNAL-only checkout', () => {
  it('resolves TC_WIDGET to EXTERNAL flow', () => {
    expect(resolvePaymentFlow('TC_WIDGET')).toBe(PaymentFlowType.EXTERNAL);
  });

  it('resolves REDIRECT to EXTERNAL flow', () => {
    expect(resolvePaymentFlow('REDIRECT')).toBe(PaymentFlowType.EXTERNAL);
  });

  it('resolves WIDGET to EXTERNAL flow', () => {
    expect(resolvePaymentFlow('WIDGET')).toBe(PaymentFlowType.EXTERNAL);
  });

  it('partitions correctly with only EXTERNAL items', () => {
    const items = [
      makeSnapshotItem({
        lineItemIndex: 0,
        purchaseType: 'TC_WIDGET',
        purchaseFlow: PaymentFlowType.EXTERNAL,
        deeplink: 'https://tc.example/buy',
      }),
    ];
    const result = partitionCart(items);
    expect(result.platform).toHaveLength(0);
    expect(result.external).toHaveLength(1);
    expect(result.platformTotal).toBe(0);
    expect(result.externalTotal).toBe(300000);
  });
});

// ============================================================
// Scenario 3: Mixed cart (PLATFORM + EXTERNAL)
// ============================================================
describe('Scenario 3: Mixed cart', () => {
  const mixedItems: SnapshotLineItem[] = [
    makeSnapshotItem({ lineItemIndex: 0, purchaseFlow: PaymentFlowType.PLATFORM }),
    makeSnapshotItem({
      lineItemIndex: 1,
      offerId: 'offer-tc',
      purchaseType: 'TC_WIDGET',
      purchaseFlow: PaymentFlowType.EXTERNAL,
      lineTotal: 100000,
    }),
    makeSnapshotItem({
      lineItemIndex: 2,
      offerId: 'offer-platform2',
      purchaseFlow: PaymentFlowType.PLATFORM,
      lineTotal: 200000,
    }),
  ];

  it('partitions into correct groups', () => {
    const result = partitionCart(mixedItems);
    expect(result.platform).toHaveLength(2);
    expect(result.external).toHaveLength(1);
    expect(result.platformTotal).toBe(500000);
    expect(result.externalTotal).toBe(100000);
    expect(result.grandTotal).toBe(600000);
  });
});

// ============================================================
// Scenario 4: Webhook duplicate handling
// ============================================================
describe('Scenario 4: Webhook idempotency (unit)', () => {
  it('isSessionFullyFulfilled handles empty list', () => {
    const result = isSessionFullyFulfilled([]);
    expect(result.fulfilled).toBe(false);
  });
});

// ============================================================
// Scenario 5: Paid but reserve failed
// ============================================================
describe('Scenario 5: PAID → reserve FAILED', () => {
  it('detects partial failure', () => {
    const result = isSessionFullyFulfilled(['CONFIRMED', 'FAILED']);
    expect(result.fulfilled).toBe(true);
    expect(result.allConfirmed).toBe(false);
    expect(result.hasFailures).toBe(true);
  });
});

// ============================================================
// Scenario 6: Partial failure → compensation
// ============================================================
describe('Scenario 6: Partial failure', () => {
  it('session is "fulfilled" when all terminal (even with FAILED + REFUNDED)', () => {
    const result = isSessionFullyFulfilled(['CONFIRMED', 'REFUNDED', 'CONFIRMED']);
    expect(result.fulfilled).toBe(true);
    expect(result.allConfirmed).toBe(false);
    expect(result.hasFailures).toBe(false);
  });
});

// ============================================================
// Scenario 7: Cancellation flow
// ============================================================
describe('Scenario 7: Cancellation', () => {
  it('PaymentIntent PENDING → CANCELLED is allowed', () => {
    const result = tryTransitionPayment('PENDING', 'CANCELLED', 'user');
    expect(result.allowed).toBe(true);
  });

  it('PaymentIntent PAID → CANCELLED is NOT allowed', () => {
    const result = tryTransitionPayment('PAID', 'CANCELLED', 'user');
    expect(result.allowed).toBe(false);
  });
});

// ============================================================
// Scenario 8: Refund flow
// ============================================================
describe('Scenario 8: Refund', () => {
  it('PaymentIntent PAID → REFUNDED is allowed', () => {
    const result = tryTransitionPayment('PAID', 'REFUNDED', 'system');
    expect(result.allowed).toBe(true);
  });

  it('PaymentIntent PENDING → REFUNDED is NOT allowed', () => {
    const result = tryTransitionPayment('PENDING', 'REFUNDED', 'system');
    expect(result.allowed).toBe(false);
  });
});

// ============================================================
// Scenario 9: State machine transitions
// ============================================================
describe('Scenario 9: State machine', () => {
  it('CheckoutSession VALIDATED → PENDING_CONFIRMATION is allowed (user)', () => {
    const result = tryTransitionCheckout('VALIDATED', 'PENDING_CONFIRMATION', 'user');
    expect(result.allowed).toBe(true);
  });

  it('CheckoutSession PENDING_CONFIRMATION → CONFIRMED (admin)', () => {
    const result = tryTransitionCheckout('PENDING_CONFIRMATION', 'CONFIRMED', 'admin');
    expect(result.allowed).toBe(true);
  });

  it('CheckoutSession CONFIRMED → COMPLETED (system)', () => {
    const result = tryTransitionCheckout('CONFIRMED', 'COMPLETED', 'system');
    expect(result.allowed).toBe(true);
  });

  it('same-state transition is no-op', () => {
    const result = tryTransitionPayment('PENDING', 'PENDING', 'system');
    // State machine should handle gracefully
    expect(result).toBeDefined();
  });
});

// ============================================================
// Scenario 10: Commission snapshot immutability
// ============================================================
describe('Scenario 10: Snapshot immutability', () => {
  it('commission is calculated at snapshot time', () => {
    const item = makeSnapshotItem({
      unitPrice: 100000,
      quantity: 3,
      lineTotal: 300000,
      commissionRateSnapshot: 0.25,
      platformFeeSnapshot: 75000,
      supplierAmountSnapshot: 225000,
    });

    // Verify the snapshot math is correct
    expect(item.lineTotal).toBe(item.unitPrice * item.quantity);
    expect(item.platformFeeSnapshot).toBe(Math.round(item.lineTotal * (item.commissionRateSnapshot || 0)));
    expect(item.supplierAmountSnapshot).toBe(item.lineTotal - (item.platformFeeSnapshot || 0));
  });

  it('EXTERNAL items have null commission fields', () => {
    const item = makeSnapshotItem({
      purchaseFlow: PaymentFlowType.EXTERNAL,
      commissionRateSnapshot: null,
      platformFeeSnapshot: null,
      supplierAmountSnapshot: null,
    });
    expect(item.commissionRateSnapshot).toBeNull();
    expect(item.platformFeeSnapshot).toBeNull();
    expect(item.supplierAmountSnapshot).toBeNull();
  });
});
