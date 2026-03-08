import { describe, expect, it } from 'vitest';
import { normalizePromoPeriod } from '../promo-period.util';

describe('normalizePromoPeriod', () => {
  it('startsAt date-only yields start of day UTC', () => {
    const { startsAt } = normalizePromoPeriod('2026-03-10', null);
    expect(startsAt).not.toBeNull();
    expect(startsAt!.getUTCHours()).toBe(0);
    expect(startsAt!.getUTCMinutes()).toBe(0);
    expect(startsAt!.getUTCDate()).toBe(10);
  });

  it('endsAt date-only yields end of day UTC', () => {
    const { endsAt } = normalizePromoPeriod(null, '2026-03-10');
    expect(endsAt).not.toBeNull();
    expect(endsAt!.getUTCHours()).toBe(23);
    expect(endsAt!.getUTCMinutes()).toBe(59);
    expect(endsAt!.getUTCMilliseconds()).toBe(999);
  });

  it('returns null for empty inputs', () => {
    expect(normalizePromoPeriod(null, null)).toEqual({ startsAt: null, endsAt: null });
  });
});
