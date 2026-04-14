import { describe, expect, it } from 'vitest';

import {
  parseVenueReadinessStatusQuery,
  venueReadinessListWhere,
} from '../venue-admin-list-readiness-where.util';

describe('parseVenueReadinessStatusQuery', () => {
  it('принимает READY / needs_review (case-insensitive)', () => {
    expect(parseVenueReadinessStatusQuery('READY')).toBe('READY');
    expect(parseVenueReadinessStatusQuery('needs_review')).toBe('NEEDS_REVIEW');
    expect(parseVenueReadinessStatusQuery('')).toBe(null);
    expect(parseVenueReadinessStatusQuery('nope')).toBe(null);
  });
});

describe('venueReadinessListWhere', () => {
  it('BLOCKED → MERGED | REJECTED', () => {
    const w = venueReadinessListWhere('BLOCKED');
    expect(w).toEqual({ lifecycleStatus: { in: ['MERGED', 'REJECTED'] } });
  });

  it('NEEDS_REVIEW → needsReview + не финальные статусы', () => {
    const w = venueReadinessListWhere('NEEDS_REVIEW');
    expect(w).toMatchObject({
      needsReview: true,
      lifecycleStatus: { notIn: ['MERGED', 'REJECTED'] },
    });
  });

  it('READY содержит ключевые AND (готовность)', () => {
    const w = venueReadinessListWhere('READY');
    expect(w).toMatchObject({
      lifecycleStatus: { notIn: ['MERGED', 'REJECTED'] },
      needsReview: false,
    });
    expect(w).toHaveProperty('AND');
    expect(Array.isArray((w as { AND: unknown[] }).AND)).toBe(true);
  });
});
