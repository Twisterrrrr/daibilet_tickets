import { describe, expect, it } from 'vitest';

import { computeCityAdminReadiness } from '../city-admin-readiness.util';

const base = {
  name: 'Санкт-Петербург',
  slug: 'spb',
  description: 'Описание города для SEO.',
  heroImage: 'https://example.com/cover.jpg',
  metaTitle: 'Title',
  metaDescription: 'Desc',
  eventsCount: 3,
  activeEventsCount: 2,
  futureEventsCount: 1,
  venuesCount: 2,
  activeVenuesCount: 2,
  landingPagesCount: 1,
  activeLandingsCount: 1,
  comboPagesCount: 0,
  collectionsCount: 1,
  hasRegionLink: true,
};

describe('computeCityAdminReadiness', () => {
  it('BLOCKED when city inactive', () => {
    const r = computeCityAdminReadiness({ ...base, isActive: false });
    expect(r.status).toBe('BLOCKED');
    expect(r.blockers.length).toBeGreaterThan(0);
  });

  it('NEEDS_WORK when missing description', () => {
    const r = computeCityAdminReadiness({ ...base, isActive: true, description: null });
    expect(r.status).toBe('NEEDS_WORK');
    expect(r.warnings.some((w) => w.includes('описан'))).toBe(true);
  });

  it('NEEDS_WORK when missing SEO meta', () => {
    const r = computeCityAdminReadiness({ ...base, isActive: true, metaTitle: null, metaDescription: null });
    expect(r.warnings.some((w) => w.includes('meta'))).toBe(true);
  });

  it('exposes keySignals for list row', () => {
    const r = computeCityAdminReadiness({
      ...base,
      isActive: true,
      heroImage: null,
      description: 'x',
    });
    expect(r.keySignals.length).toBeGreaterThan(0);
    expect(r.keySignals.length).toBeLessThanOrEqual(3);
  });
});
