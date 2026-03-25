import { describe, expect, it } from 'vitest';

import {
  classifyProgramState,
  compareCurrent,
  comparePast,
  compareUpcoming,
  computeWindowFromScheduledSessions,
  computeWindowOpenDate,
  VENUE_PROGRAM_FAR_FUTURE,
} from '../venue-program.logic';

describe('venue-program.logic', () => {
  const now = new Date('2025-06-15T12:00:00.000Z');

  it('computeWindowFromScheduledSessions aggregates min start and max end', () => {
    const w = computeWindowFromScheduledSessions([
      { startsAt: new Date('2025-06-10T10:00:00.000Z'), endsAt: new Date('2025-06-10T12:00:00.000Z') },
      { startsAt: new Date('2025-06-20T10:00:00.000Z'), endsAt: null },
    ]);
    expect(w).not.toBeNull();
    expect(w!.startsAtMin.toISOString()).toBe('2025-06-10T10:00:00.000Z');
    expect(w!.endsAtMax.toISOString()).toBe('2025-06-20T10:00:00.000Z');
  });

  it('classifyProgramState: UPCOMING when first session in future', () => {
    const starts = new Date('2025-07-01T00:00:00.000Z');
    const ends = new Date('2025-07-31T00:00:00.000Z');
    expect(classifyProgramState(now, starts, ends)).toBe('UPCOMING');
  });

  it('classifyProgramState: PAST when ended', () => {
    const starts = new Date('2025-01-01T00:00:00.000Z');
    const ends = new Date('2025-05-01T00:00:00.000Z');
    expect(classifyProgramState(now, starts, ends)).toBe('PAST');
  });

  it('classifyProgramState: CURRENT in window', () => {
    const starts = new Date('2025-06-01T00:00:00.000Z');
    const ends = new Date('2025-07-01T00:00:00.000Z');
    expect(classifyProgramState(now, starts, ends)).toBe('CURRENT');
  });

  it('computeWindowOpenDate uses endDate and far future when no endDate', () => {
    const created = new Date('2025-01-01T08:00:00.000Z');
    const w = computeWindowOpenDate({ createdAt: created, endDate: null, isPermanent: true }, []);
    expect(w.endsAtMax.getTime()).toBe(VENUE_PROGRAM_FAR_FUTURE.getTime());
  });

  it('comparePast sorts by endsAt desc', () => {
    const a = {
      isFeaturedInVenue: false,
      venueProgramSortOrder: null,
      manualBoost: null,
      endsAt: new Date('2025-01-01').getTime(),
      startsAt: 0,
    };
    const b = {
      isFeaturedInVenue: false,
      venueProgramSortOrder: null,
      manualBoost: null,
      endsAt: new Date('2025-06-01').getTime(),
      startsAt: 0,
    };
    expect(comparePast(a, b)).toBeGreaterThan(0);
  });

  it('compareCurrent prefers featured', () => {
    const a = {
      isFeaturedInVenue: true,
      venueProgramSortOrder: null,
      manualBoost: null,
      endsAt: 0,
      startsAt: 0,
    };
    const b = {
      isFeaturedInVenue: false,
      venueProgramSortOrder: null,
      manualBoost: null,
      endsAt: 0,
      startsAt: 0,
    };
    expect(compareCurrent(a, b)).toBeLessThan(0);
  });

  it('compareUpcoming sorts by startsAt asc after featured', () => {
    const a = {
      isFeaturedInVenue: false,
      venueProgramSortOrder: null,
      manualBoost: null,
      endsAt: 0,
      startsAt: new Date('2025-08-01').getTime(),
    };
    const b = {
      isFeaturedInVenue: false,
      venueProgramSortOrder: null,
      manualBoost: null,
      endsAt: 0,
      startsAt: new Date('2025-07-01').getTime(),
    };
    expect(compareUpcoming(b, a)).toBeLessThan(0);
  });
});
