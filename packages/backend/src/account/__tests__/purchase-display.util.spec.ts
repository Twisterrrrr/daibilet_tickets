import { describe, expect, it } from 'vitest';

import {
  derivePurchaseActions,
  getPurchaseDisplayType,
  type PurchaseActionsResult,
} from '../purchase-display.util';

describe('getPurchaseDisplayType', () => {
  it('marks awaiting payment when session or payment pending', () => {
    const r1 = getPurchaseDisplayType({
      sessionStatus: 'AWAITING_PAYMENT',
      paymentStatus: 'PENDING',
      isExternalFlow: false,
      hasExternalUrl: false,
      hasTrack: false,
    });
    expect(r1.purchaseType).toBe('AWAITING_PAYMENT');
    expect(r1.displayStatus).toBe('Ожидает оплаты');

    const r2 = getPurchaseDisplayType({
      sessionStatus: 'STARTED',
      paymentStatus: 'PROCESSING',
      isExternalFlow: false,
      hasExternalUrl: false,
      hasTrack: false,
    });
    expect(r2.purchaseType).toBe('AWAITING_PAYMENT');
  });

  it('marks manual confirmation when session is pending confirmation', () => {
    const r = getPurchaseDisplayType({
      sessionStatus: 'PENDING_CONFIRMATION',
      paymentStatus: 'PENDING',
      isExternalFlow: false,
      hasExternalUrl: false,
      hasTrack: false,
    });
    expect(r.purchaseType).toBe('MANUAL_CONFIRMATION');
    expect(r.displayStatus).toBe('Ожидает подтверждения');
  });

  it('marks internal ticket when completed, paid and has track url', () => {
    const r = getPurchaseDisplayType({
      sessionStatus: 'COMPLETED',
      paymentStatus: 'PAID',
      isExternalFlow: false,
      hasExternalUrl: false,
      hasTrack: true,
    });
    expect(r.purchaseType).toBe('INTERNAL_TICKET');
    expect(r.displayStatus).toBe('Билет доступен');
  });

  it('marks external voucher for completed external flows with artifact', () => {
    const r = getPurchaseDisplayType({
      sessionStatus: 'COMPLETED',
      paymentStatus: 'PAID',
      isExternalFlow: true,
      hasExternalUrl: true,
      hasTrack: false,
    });
    expect(r.purchaseType).toBe('EXTERNAL_VOUCHER');
    expect(r.displayStatus).toBe('Подтверждено партнёром');
  });

  it('does not treat external completed booking as internal ticket even if track exists', () => {
    const r = getPurchaseDisplayType({
      sessionStatus: 'COMPLETED',
      paymentStatus: 'PAID',
      isExternalFlow: true,
      hasExternalUrl: false,
      hasTrack: true,
    });
    // Imported / external события остаются внешними, даже если есть trackUrl
    expect(r.purchaseType).toBe('EXTERNAL_VOUCHER');
  });

  it('marks booking confirmation when completed but no artifacts', () => {
    const r = getPurchaseDisplayType({
      sessionStatus: 'COMPLETED',
      paymentStatus: 'PAID',
      isExternalFlow: false,
      hasExternalUrl: false,
      hasTrack: false,
    });
    expect(r.purchaseType).toBe('BOOKING_CONFIRMATION');
    expect(r.displayStatus).toBe('Бронирование подтверждено');
  });

  it('falls back to manual confirmation for other statuses', () => {
    const r = getPurchaseDisplayType({
      sessionStatus: 'STARTED',
      paymentStatus: 'FAILED',
      isExternalFlow: false,
      hasExternalUrl: false,
      hasTrack: false,
    });
    expect(r.purchaseType).toBe('MANUAL_CONFIRMATION');
    expect(r.displayStatus).toBe('В обработке');
  });
});

describe('derivePurchaseActions', () => {
  function strip(result: PurchaseActionsResult) {
    return {
      primaryLabel: result.primaryAction?.label ?? null,
      secondaryLabel: result.secondaryAction?.label ?? null,
    };
  }

  it('returns open ticket action for INTERNAL_TICKET with track', () => {
    const r = derivePurchaseActions({
      purchaseType: 'INTERNAL_TICKET',
      lastIntentPaymentUrl: null,
      trackUrl: 'http://localhost/orders/track?code=CS-1',
      externalUrl: null,
    });
    expect(strip(r)).toEqual({ primaryLabel: 'Открыть билет', secondaryLabel: null });
  });

  it('returns voucher + tracking for EXTERNAL_VOUCHER', () => {
    const r = derivePurchaseActions({
      purchaseType: 'EXTERNAL_VOUCHER',
      lastIntentPaymentUrl: null,
      trackUrl: 'http://localhost/orders/track?code=CS-1',
      externalUrl: 'https://partner/voucher/123',
    });
    expect(strip(r)).toEqual({
      primaryLabel: 'Посмотреть ваучер',
      secondaryLabel: 'Открыть трекинг',
    });
  });

  it('returns tracking action for BOOKING_CONFIRMATION', () => {
    const r = derivePurchaseActions({
      purchaseType: 'BOOKING_CONFIRMATION',
      lastIntentPaymentUrl: null,
      trackUrl: 'http://localhost/orders/track?code=CS-1',
      externalUrl: null,
    });
    expect(strip(r)).toEqual({
      primaryLabel: 'Открыть трекинг',
      secondaryLabel: null,
    });
  });

  it('returns pay action for AWAITING_PAYMENT with paymentUrl', () => {
    const r = derivePurchaseActions({
      purchaseType: 'AWAITING_PAYMENT',
      lastIntentPaymentUrl: 'https://pay.example/session/123',
      trackUrl: null,
      externalUrl: null,
    });
    expect(strip(r)).toEqual({
      primaryLabel: 'Оплатить',
      secondaryLabel: null,
    });
  });

  it('returns no actions for MANUAL_CONFIRMATION', () => {
    const r = derivePurchaseActions({
      purchaseType: 'MANUAL_CONFIRMATION',
      lastIntentPaymentUrl: 'https://pay.example/session/123',
      trackUrl: 'http://localhost/orders/track?code=CS-1',
      externalUrl: 'https://partner/voucher/123',
    });
    expect(strip(r)).toEqual({
      primaryLabel: null,
      secondaryLabel: null,
    });
  });
});

