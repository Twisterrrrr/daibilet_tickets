/**
 * Инвариант-тесты на доменную логику.
 *
 * 22 теста:
 *   1-6: State machine: transitions per actor
 *   7-8: Idempotency (no-op)
 *   9-10: Terminal statuses
 *   11-14: Widget payload validation
 *   15-17: ExpireReason
 *   18-20: PURCHASE_TYPE_COMPAT + kill switch
 *   21-22: calculateExpiresAt
 */

import { describe, test, expect, afterEach } from 'vitest';

import {
  tryTransitionCheckout,
  tryTransitionOrderRequest,
  tryTransitionPayment,
  CheckoutStatus,
  OrderRequestStatus,
  PaymentIntentStatus,
  CHECKOUT_TERMINAL,
  ORDER_REQUEST_TERMINAL,
  PAYMENT_TERMINAL,
  calculateExpiresAt,
  determineExpireReason,
  ExpireReason,
} from '../checkout-state-machine';

import {
  validateWidgetPayload,
  ensurePayloadVersion,
  resolvePurchaseType,
  setCompatDisabled,
  PurchaseType,
  CURRENT_PAYLOAD_VERSION,
} from '@daibilet/shared';

// ========================================
// 1-4: State machine forbidden transitions
// ========================================

describe('CheckoutSession state machine', () => {
  test('1. user CANNOT transition PENDING_CONFIRMATION → CONFIRMED', () => {
    const result = tryTransitionCheckout('PENDING_CONFIRMATION', 'CONFIRMED', 'user');
    expect(result.allowed).toBe(false);
    expect(result.noOp).toBe(false);
    expect(result.reason).toBeDefined();
  });

  test('2. admin CAN transition PENDING_CONFIRMATION → CONFIRMED', () => {
    const result = tryTransitionCheckout('PENDING_CONFIRMATION', 'CONFIRMED', 'admin');
    expect(result.allowed).toBe(true);
    expect(result.noOp).toBe(false);
  });

  test('3. system CANNOT transition STARTED → CONFIRMED (skip steps)', () => {
    const result = tryTransitionCheckout('STARTED', 'CONFIRMED', 'system');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Недопустимый переход');
  });

  test('4. no actor can leave terminal status COMPLETED', () => {
    for (const actor of ['user', 'admin', 'system'] as const) {
      const result = tryTransitionCheckout('COMPLETED', 'STARTED', actor);
      expect(result.allowed).toBe(false);
    }
  });
});

describe('OrderRequest state machine', () => {
  test('5. user CANNOT confirm OrderRequest (only admin)', () => {
    const result = tryTransitionOrderRequest('PENDING', 'CONFIRMED', 'user');
    expect(result.allowed).toBe(false);
  });

  test('6. system CAN expire OrderRequest', () => {
    const result = tryTransitionOrderRequest('PENDING', 'EXPIRED', 'system');
    expect(result.allowed).toBe(true);
    expect(result.noOp).toBe(false);
  });
});

// ========================================
// 5-6: Idempotency (no-op)
// ========================================

describe('Idempotency', () => {
  test('7. CheckoutSession: same status → no-op', () => {
    const result = tryTransitionCheckout('CONFIRMED', 'CONFIRMED', 'admin');
    expect(result.allowed).toBe(true);
    expect(result.noOp).toBe(true);
  });

  test('8. OrderRequest: same status → no-op', () => {
    const result = tryTransitionOrderRequest('PENDING', 'PENDING', 'admin');
    expect(result.allowed).toBe(true);
    expect(result.noOp).toBe(true);
  });
});

// ========================================
// 7-8: Terminal statuses
// ========================================

describe('Terminal statuses', () => {
  test('9. All terminal checkout statuses are correctly defined', () => {
    expect(CHECKOUT_TERMINAL.has(CheckoutStatus.COMPLETED)).toBe(true);
    expect(CHECKOUT_TERMINAL.has(CheckoutStatus.EXPIRED)).toBe(true);
    expect(CHECKOUT_TERMINAL.has(CheckoutStatus.CANCELLED)).toBe(true);
    expect(CHECKOUT_TERMINAL.has(CheckoutStatus.STARTED)).toBe(false);
  });

  test('10. All terminal order request statuses', () => {
    expect(ORDER_REQUEST_TERMINAL.has(OrderRequestStatus.CONFIRMED)).toBe(true);
    expect(ORDER_REQUEST_TERMINAL.has(OrderRequestStatus.REJECTED)).toBe(true);
    expect(ORDER_REQUEST_TERMINAL.has(OrderRequestStatus.EXPIRED)).toBe(true);
    expect(ORDER_REQUEST_TERMINAL.has(OrderRequestStatus.PENDING)).toBe(false);
  });
});

// ========================================
// 9-11: Widget payload validation
// ========================================

describe('Widget payload validation', () => {
  test('11. TC payload: valid with externalEventId', () => {
    const result = validateWidgetPayload('TC', {
      v: 1,
      externalEventId: 'abc123',
      metaEventId: 'meta456',
    });
    expect(result.valid).toBe(true);
    expect(result.data).toBeDefined();
  });

  test('12. TC payload: invalid without externalEventId', () => {
    const result = validateWidgetPayload('TC', { v: 1 });
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  test('13. ensurePayloadVersion adds v field', () => {
    const payload = { externalEventId: 'test' };
    const versioned = ensurePayloadVersion(payload);
    expect((versioned as any).v).toBe(CURRENT_PAYLOAD_VERSION);
  });

  test('14. Null provider → invalid', () => {
    const result = validateWidgetPayload(null, { externalEventId: 'test' });
    expect(result.valid).toBe(false);
  });
});

// ========================================
// 12: ExpireReason determination
// ========================================

describe('ExpireReason', () => {
  test('15. Cart-based request → CART reason', () => {
    const reason = determineExpireReason({
      checkoutSessionId: 'some-session',
      slaMinutes: 30,
      expiresAt: new Date(Date.now() - 60000),
      createdAt: new Date(Date.now() - 3600000),
    });
    expect(reason).toBe(ExpireReason.CART);
  });

  test('16. Quick request past SLA → SLA reason', () => {
    const reason = determineExpireReason({
      checkoutSessionId: null,
      slaMinutes: 30,
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(Date.now() - 3600000), // 60 min ago, SLA = 30 min
    });
    expect(reason).toBe(ExpireReason.SLA);
  });

  test('17. Quick request within SLA → TTL reason', () => {
    const reason = determineExpireReason({
      checkoutSessionId: null,
      slaMinutes: 120,
      expiresAt: new Date(Date.now() - 60000),
      createdAt: new Date(Date.now() - 60000), // just created
    });
    expect(reason).toBe(ExpireReason.TTL);
  });
});

// ========================================
// 13: PURCHASE_TYPE_COMPAT
// ========================================

describe('PURCHASE_TYPE_COMPAT', () => {
  afterEach(() => {
    setCompatDisabled(false);
  });

  test('18. Legacy TC_WIDGET resolves to WIDGET', () => {
    const result = resolvePurchaseType('TC_WIDGET', 'test');
    expect(result).toBe(PurchaseType.WIDGET);
  });

  test('19. Kill switch blocks legacy values', () => {
    setCompatDisabled(true);
    expect(() => resolvePurchaseType('TC_WIDGET', 'test')).toThrow('запрещён');
  });

  test('20. Current values pass through even with kill switch', () => {
    setCompatDisabled(true);
    expect(resolvePurchaseType('WIDGET')).toBe(PurchaseType.WIDGET);
    expect(resolvePurchaseType('REDIRECT')).toBe(PurchaseType.REDIRECT);
    expect(resolvePurchaseType('REQUEST')).toBe(PurchaseType.REQUEST);
  });
});

// ========================================
// 14: calculateExpiresAt
// ========================================

describe('calculateExpiresAt', () => {
  test('21. Calculates correct expiry time', () => {
    const now = new Date();
    const expiry = calculateExpiresAt(30, now);
    expect(expiry.getTime() - now.getTime()).toBe(30 * 60 * 1000);
  });

  test('22. Zero minutes → same time', () => {
    const now = new Date();
    const expiry = calculateExpiresAt(0, now);
    expect(expiry.getTime()).toBe(now.getTime());
  });
});

// ========================================
// PaymentIntent state machine
// ========================================

describe('PaymentIntent state machine', () => {
  test('23. system CAN transition PENDING → PAID', () => {
    const result = tryTransitionPayment('PENDING', 'PAID', 'system');
    expect(result.allowed).toBe(true);
    expect(result.noOp).toBe(false);
  });

  test('24. user CANNOT transition PENDING → PAID', () => {
    const result = tryTransitionPayment('PENDING', 'PAID', 'user');
    expect(result.allowed).toBe(false);
  });

  test('25. user CAN cancel PENDING payment', () => {
    const result = tryTransitionPayment('PENDING', 'CANCELLED', 'user');
    expect(result.allowed).toBe(true);
  });

  test('26. PAID → REFUNDED only by admin or system', () => {
    expect(tryTransitionPayment('PAID', 'REFUNDED', 'admin').allowed).toBe(true);
    expect(tryTransitionPayment('PAID', 'REFUNDED', 'system').allowed).toBe(true);
    expect(tryTransitionPayment('PAID', 'REFUNDED', 'user').allowed).toBe(false);
  });

  test('27. FAILED is terminal', () => {
    expect(PAYMENT_TERMINAL.has(PaymentIntentStatus.FAILED)).toBe(true);
    for (const actor of ['user', 'admin', 'system'] as const) {
      const result = tryTransitionPayment('FAILED', 'PENDING', actor);
      expect(result.allowed).toBe(false);
    }
  });

  test('28. Idempotent no-op for PaymentIntent', () => {
    const result = tryTransitionPayment('PAID', 'PAID', 'system');
    expect(result.allowed).toBe(true);
    expect(result.noOp).toBe(true);
  });
});
