import { describe, expect, it } from 'vitest';

import { computeVenueAdminReadiness, venueDisplayAddress } from '../venue-admin-readiness.util';

describe('venueDisplayAddress', () => {
  it('предпочитает address, затем raw, затем normalized', () => {
    expect(
      venueDisplayAddress({
        address: '  A  ',
        rawAddress: 'B',
        normalizedAddress: 'C',
      }),
    ).toBe('A');
    expect(
      venueDisplayAddress({
        address: null,
        rawAddress: ' raw ',
        normalizedAddress: 'C',
      }),
    ).toBe('raw');
  });
});

describe('computeVenueAdminReadiness', () => {
  const base = {
    title: 'Музей',
    displayAddress: 'Невский 1',
    imageUrl: 'https://x/img.jpg',
    shortDescription: 'Кратко',
    description: null,
    lat: 59.9,
    lng: 30.3,
    isVenuePageWhitelisted: true,
    isPublished: true,
    confidenceScore: 0.9 as number | null,
    mergeTargetId: null,
    needsReview: false,
  };

  it('ACTIVE без проблем → READY', () => {
    const r = computeVenueAdminReadiness({
      ...base,
      lifecycleStatus: 'ACTIVE',
    });
    expect(r.status).toBe('READY');
    expect(r.score).toBeGreaterThanOrEqual(80);
  });

  it('MERGED → BLOCKED', () => {
    const r = computeVenueAdminReadiness({
      ...base,
      lifecycleStatus: 'MERGED',
    });
    expect(r.status).toBe('BLOCKED');
    expect(r.blockers.length).toBeGreaterThan(0);
  });

  it('needsReview → NEEDS_REVIEW', () => {
    const r = computeVenueAdminReadiness({
      ...base,
      lifecycleStatus: 'DRAFT',
      needsReview: true,
    });
    expect(r.status).toBe('NEEDS_REVIEW');
  });

  it('без адреса и обложки → NEEDS_WORK и сигналы', () => {
    const r = computeVenueAdminReadiness({
      ...base,
      lifecycleStatus: 'ACTIVE',
      displayAddress: null,
      imageUrl: null,
      shortDescription: null,
      description: null,
    });
    expect(r.status).toBe('NEEDS_WORK');
    expect(r.blockers.some((b) => b.includes('адрес'))).toBe(true);
    expect(r.keySignals.length).toBeGreaterThan(0);
  });
});
