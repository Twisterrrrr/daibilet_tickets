import { describe, expect, it } from 'vitest';

import {
  findCheaperAlternative,
  getRecommendedSessionsForSoldOut,
  getScarcityState,
  getSessionBadges,
} from '../session-ux.util';

describe('session-ux.util', () => {
  describe('getScarcityState', () => {
    it('returns NONE for 10+ available', () => {
      expect(getScarcityState(10)).toEqual({ level: 'NONE', label: null });
      expect(getScarcityState(100)).toEqual({ level: 'NONE', label: null });
    });
    it('returns LOW for 4–9 available', () => {
      expect(getScarcityState(9)).toEqual({ level: 'LOW', label: 'Осталось всего 9 мест' });
      expect(getScarcityState(4)).toEqual({ level: 'LOW', label: 'Осталось всего 4 мест' });
    });
    it('returns LAST for 1–3 available', () => {
      expect(getScarcityState(3)).toEqual({ level: 'LAST', label: 'Последние места (3)' });
      expect(getScarcityState(1)).toEqual({ level: 'LAST', label: 'Последние места (1)' });
    });
    it('returns SOLD_OUT for 0', () => {
      expect(getScarcityState(0)).toEqual({ level: 'SOLD_OUT', label: 'Распродано' });
    });
    it('handles null/undefined', () => {
      expect(getScarcityState(null)).toEqual({ level: 'NONE', label: null });
      expect(getScarcityState(undefined)).toEqual({ level: 'NONE', label: null });
    });
  });

  describe('getSessionBadges', () => {
    const baseSession = (overrides: Partial<{ startsAt: Date; price: number; soldLast24h: number; isSoldOut: boolean }>) => ({
      id: 's1',
      startsAt: new Date(),
      price: 100000,
      available: 5,
      isSoldOut: false,
      soldLast24h: 0,
      ...overrides,
    });

    it('adds today badge for session today', () => {
      const session = baseSession({ startsAt: new Date() });
      const badges = getSessionBadges(session, [session]);
      expect(badges.some((b) => b.key === 'today')).toBe(true);
    });
    it('adds best_price when session has minimum price', () => {
      const s1 = baseSession({ price: 50000 });
      const s2 = baseSession({ id: 's2', price: 100000 });
      const badges = getSessionBadges(s1, [s1, s2]);
      expect(badges.some((b) => b.key === 'best_price')).toBe(true);
    });
    it('adds popular when session has max soldLast24h', () => {
      const s1 = baseSession({ soldLast24h: 10 });
      const s2 = baseSession({ id: 's2', soldLast24h: 5 });
      const badges = getSessionBadges(s1, [s1, s2]);
      expect(badges.some((b) => b.key === 'popular')).toBe(true);
    });
  });

  describe('findCheaperAlternative', () => {
    it('returns cheaper session when diff >= 20000 kopecks', () => {
      const current = { id: 'a', price: 150000 };
      const sessions = [
        { id: 'a', price: 150000, isSoldOut: false },
        { id: 'b', price: 120000, isSoldOut: false },
      ];
      const alt = findCheaperAlternative(current, sessions);
      expect(alt).toEqual({ sessionId: 'b', price: 120000, savingsKopecks: 30000 });
    });
    it('returns null when no cheaper session', () => {
      const current = { id: 'a', price: 100000 };
      const sessions = [
        { id: 'a', price: 100000, isSoldOut: false },
        { id: 'b', price: 120000, isSoldOut: false },
      ];
      expect(findCheaperAlternative(current, sessions)).toBeNull();
    });
    it('returns null when current is sold out or price invalid', () => {
      expect(findCheaperAlternative({ id: 'a', price: 0 }, [])).toBeNull();
    });
  });

  describe('getRecommendedSessionsForSoldOut', () => {
    it('returns up to 3 available sessions sorted by startsAt', () => {
      const sessions = [
        { id: 's1', startsAt: '2026-06-02T12:00:00Z', price: 100000, available: 5, isSoldOut: true },
        { id: 's2', startsAt: '2026-06-01T10:00:00Z', price: 80000, available: 3, isSoldOut: false },
        { id: 's3', startsAt: '2026-06-03T14:00:00Z', price: 90000, available: 2, isSoldOut: false },
      ];
      const rec = getRecommendedSessionsForSoldOut('s1', sessions);
      expect(rec).toHaveLength(2);
      expect(rec[0].id).toBe('s2');
      expect(rec[1].id).toBe('s3');
    });
    it('excludes sold-out and zero-available', () => {
      const sessions = [
        { id: 's1', startsAt: '2026-06-01T10:00:00Z', price: 100000, available: 0, isSoldOut: false },
        { id: 's2', startsAt: '2026-06-02T10:00:00Z', price: 100000, available: 2, isSoldOut: true },
        { id: 's3', startsAt: '2026-06-03T10:00:00Z', price: 100000, available: 5, isSoldOut: false },
      ];
      const rec = getRecommendedSessionsForSoldOut('s1', sessions);
      expect(rec).toHaveLength(1);
      expect(rec[0].id).toBe('s3');
    });
  });
});
