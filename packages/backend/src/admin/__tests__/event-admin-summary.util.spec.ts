import { describe, expect, it } from 'vitest';

import { mapManualBoostToTier } from '../event-admin-summary.util';

describe('mapManualBoostToTier', () => {
  it('returns NONE for 0..30', () => {
    expect(mapManualBoostToTier(0)).toBe('NONE');
    expect(mapManualBoostToTier(30)).toBe('NONE');
  });

  it('returns POPULAR for 31..80', () => {
    expect(mapManualBoostToTier(31)).toBe('POPULAR');
    expect(mapManualBoostToTier(80)).toBe('POPULAR');
  });

  it('returns TOP for >80', () => {
    expect(mapManualBoostToTier(81)).toBe('TOP');
    expect(mapManualBoostToTier(100)).toBe('TOP');
  });
});
