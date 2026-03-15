import { describe, expect, it } from 'vitest';

import {
  computeTicketAvailable,
  deriveProviderStatus,
  derivePurchaseActions,
  getDisplayStatusByProviderStatus,
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
    expect(r.displayStatus).toBe('Билет отправлен на e-mail');
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

  it('treats completed external booking without artifacts as booking confirmation with provider status', () => {
    const r = getPurchaseDisplayType({
      sessionStatus: 'COMPLETED',
      paymentStatus: 'PAID',
      isExternalFlow: true,
      hasExternalUrl: false,
      hasTrack: false,
    });
    expect(r.purchaseType).toBe('BOOKING_CONFIRMATION');
    expect(r.displayStatus).toBe('Билет отправлен на e-mail'); // derived confirmed
  });

  it('does not create pay action when awaiting payment but paymentUrl is missing', () => {
    const r = getPurchaseDisplayType({
      sessionStatus: 'AWAITING_PAYMENT',
      paymentStatus: 'PENDING',
      isExternalFlow: false,
      hasExternalUrl: false,
      hasTrack: false,
    });
    expect(r.purchaseType).toBe('AWAITING_PAYMENT');
    expect(r.displayStatus).toBe('Ожидает оплаты');
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

  it('shows cancelled message for external voucher when payment refunded', () => {
    const r = getPurchaseDisplayType({
      sessionStatus: 'COMPLETED',
      paymentStatus: 'REFUNDED',
      isExternalFlow: true,
      hasExternalUrl: true,
      hasTrack: false,
    });
    expect(r.purchaseType).toBe('EXTERNAL_VOUCHER');
    expect(r.displayStatus).toBe('Билет отменен, ожидайте возврата');
  });

  it('uses passed providerStatus when provided', () => {
    const r = getPurchaseDisplayType({
      sessionStatus: 'COMPLETED',
      paymentStatus: 'PAID',
      isExternalFlow: true,
      hasExternalUrl: true,
      hasTrack: false,
      providerStatus: 'pending',
    });
    expect(r.purchaseType).toBe('EXTERNAL_VOUCHER');
    expect(r.displayStatus).toBe('Обрабатывается');
  });

  it('shows same provider statuses for Teplohod (isProviderTcOrTep) as for Ticketscloud', () => {
    const r = getPurchaseDisplayType({
      sessionStatus: 'COMPLETED',
      paymentStatus: 'PAID',
      isExternalFlow: false,
      hasExternalUrl: false,
      hasTrack: true,
      isProviderTcOrTep: true,
    });
    expect(r.purchaseType).toBe('EXTERNAL_VOUCHER');
    expect(r.displayStatus).toBe('Билет отправлен на e-mail');
  });
});

describe('deriveProviderStatus and getDisplayStatusByProviderStatus', () => {
  it('maps confirmed/cancelled/pending/unknown to messages', () => {
    expect(getDisplayStatusByProviderStatus('confirmed')).toBe('Билет отправлен на e-mail');
    expect(getDisplayStatusByProviderStatus('cancelled')).toBe('Билет отменен, ожидайте возврата');
    expect(getDisplayStatusByProviderStatus('returned')).toBe('Билет отменен, ожидайте возврата');
    expect(getDisplayStatusByProviderStatus('pending')).toBe('Обрабатывается');
    expect(getDisplayStatusByProviderStatus('unknown')).toBe('Неизвестно');
  });

  it('derives provider status from session and payment', () => {
    expect(deriveProviderStatus('COMPLETED', 'PAID')).toBe('confirmed');
    expect(deriveProviderStatus('COMPLETED', 'REFUNDED')).toBe('cancelled');
    expect(deriveProviderStatus('CANCELLED', 'PAID')).toBe('cancelled');
    expect(deriveProviderStatus('AWAITING_PAYMENT', 'PENDING')).toBe('pending');
    expect(deriveProviderStatus('STARTED', 'FAILED')).toBe('unknown');
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

  it('returns no actions for AWAITING_PAYMENT when paymentUrl is missing', () => {
    const r = derivePurchaseActions({
      purchaseType: 'AWAITING_PAYMENT',
      lastIntentPaymentUrl: null,
      trackUrl: null,
      externalUrl: null,
    });
    expect(strip(r)).toEqual({
      primaryLabel: null,
      secondaryLabel: null,
    });
  });

  describe('computeTicketAvailable', () => {
    it('returns true for completed internal ticket with trackUrl', () => {
      const available = computeTicketAvailable({
        sessionStatus: 'COMPLETED',
        hasTrack: true,
        hasExternalUrl: false,
        trackUrl: 'http://localhost/orders/track?code=CS-1',
        externalUrl: null,
      });
      expect(available).toBe(true);
    });

    it('returns true for external voucher with external url', () => {
      const available = computeTicketAvailable({
        sessionStatus: 'COMPLETED',
        hasTrack: false,
        hasExternalUrl: true,
        trackUrl: null,
        externalUrl: 'https://partner/voucher/123',
      });
      expect(available).toBe(true);
    });

    it('returns false when there is no track or external artifact', () => {
      const available = computeTicketAvailable({
        sessionStatus: 'COMPLETED',
        hasTrack: false,
        hasExternalUrl: false,
        trackUrl: null,
        externalUrl: null,
      });
      expect(available).toBe(false);
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

