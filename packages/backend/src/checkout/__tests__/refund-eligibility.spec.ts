import { describe, expect, it } from 'vitest';

import { evaluateRefundEligibility } from '../refund-eligibility';

const base = {
  now: new Date('2026-06-01T12:00:00.000Z'),
  isRedeemed: false,
  eventDateMode: 'SCHEDULED' as const,
  eventEndDate: null as Date | null,
  sessionStartsAt: new Date('2026-06-02T15:00:00.000Z'),
  sessionCancelledBypass: false,
};

describe('evaluateRefundEligibility', () => {
  it('разрешает CONFIRMED до начала сеанса', () => {
    const r = evaluateRefundEligibility({
      ...base,
      itemStatus: 'CONFIRMED',
    });
    expect(r.canRefund).toBe(true);
    expect(r.reason).toBe('OK');
  });

  it('запрещает после начала сеанса (scheduled)', () => {
    const r = evaluateRefundEligibility({
      ...base,
      itemStatus: 'CONFIRMED',
      now: new Date('2026-06-02T16:00:00.000Z'),
    });
    expect(r.canRefund).toBe(false);
    expect(r.reason).toBe('SESSION_ALREADY_STARTED');
  });

  it('обход правил при отменённом сеансе', () => {
    const r = evaluateRefundEligibility({
      ...base,
      itemStatus: 'CONFIRMED',
      now: new Date('2026-06-02T16:00:00.000Z'),
      sessionCancelledBypass: true,
    });
    expect(r.canRefund).toBe(true);
    expect(r.reason).toBe('SESSION_CANCELLED');
  });

  it('запрещает REFUND_PENDING и REFUNDED', () => {
    expect(
      evaluateRefundEligibility({ ...base, itemStatus: 'REFUND_PENDING' }).canRefund,
    ).toBe(false);
    expect(evaluateRefundEligibility({ ...base, itemStatus: 'REFUNDED' }).canRefund).toBe(false);
  });

  it('OPEN_DATE: запрещает погашенный билет', () => {
    const r = evaluateRefundEligibility({
      ...base,
      itemStatus: 'CONFIRMED',
      eventDateMode: 'OPEN_DATE',
      isRedeemed: true,
    });
    expect(r.canRefund).toBe(false);
    expect(r.reason).toBe('TICKET_REDEEMED');
  });

  it('OPEN_DATE: запрещает после endDate', () => {
    const r = evaluateRefundEligibility({
      ...base,
      itemStatus: 'CONFIRMED',
      eventDateMode: 'OPEN_DATE',
      eventEndDate: new Date('2026-05-01T00:00:00.000Z'),
    });
    expect(r.canRefund).toBe(false);
    expect(r.reason).toBe('EVENT_EXPIRED');
  });
});
