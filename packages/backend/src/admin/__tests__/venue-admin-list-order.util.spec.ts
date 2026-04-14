import { describe, expect, it } from 'vitest';

import { buildVenueAdminListOrderBy, parseVenueListSortQuery } from '../venue-admin-list-order.util';

describe('parseVenueListSortQuery', () => {
  it('defaults to updatedAt desc', () => {
    expect(parseVenueListSortQuery(undefined, undefined)).toEqual({ sort: 'updatedAt', order: 'desc' });
    expect(parseVenueListSortQuery('', 'invalid')).toEqual({ sort: 'updatedAt', order: 'desc' });
  });

  it('parses confidenceScore and asc', () => {
    expect(parseVenueListSortQuery('confidenceScore', 'asc')).toEqual({
      sort: 'confidenceScore',
      order: 'asc',
    });
  });

  it('parses needsReview', () => {
    expect(parseVenueListSortQuery('needsReview', 'desc')).toEqual({ sort: 'needsReview', order: 'desc' });
  });
});

describe('buildVenueAdminListOrderBy', () => {
  it('puts confidenceScore with nulls last and tie-breaker', () => {
    expect(buildVenueAdminListOrderBy('confidenceScore', 'desc')).toEqual([
      { confidenceScore: { sort: 'desc', nulls: 'last' } },
      { updatedAt: 'desc' },
    ]);
    expect(buildVenueAdminListOrderBy('confidenceScore', 'asc')).toEqual([
      { confidenceScore: { sort: 'asc', nulls: 'last' } },
      { updatedAt: 'desc' },
    ]);
  });

  it('uses updatedAt', () => {
    expect(buildVenueAdminListOrderBy('updatedAt', 'desc')).toEqual([{ updatedAt: 'desc' }]);
  });

  it('uses needsReview then updatedAt', () => {
    expect(buildVenueAdminListOrderBy('needsReview', 'desc')).toEqual([
      { needsReview: 'desc' },
      { updatedAt: 'desc' },
    ]);
  });
});
