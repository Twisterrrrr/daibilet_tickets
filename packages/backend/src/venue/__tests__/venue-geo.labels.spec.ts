import { describe, expect, it } from 'vitest';

import { resolveDistrictLabel, resolveMetroLabel } from '../venue-geo.labels';

describe('venue geo labels (dual-read)', () => {
  it('prefers FK relation name over legacy string', () => {
    expect(resolveMetroLabel({ legacyMetro: 'старое', stationName: 'Новое метро' })).toBe('Новое метро');
    expect(resolveDistrictLabel({ legacyDistrict: 'старое', districtName: 'Новый район' })).toBe('Новый район');
  });

  it('falls back to legacy string when FK missing', () => {
    expect(resolveMetroLabel({ legacyMetro: 'старое', stationName: null })).toBe('старое');
    expect(resolveDistrictLabel({ legacyDistrict: 'старое', districtName: null })).toBe('старое');
  });

  it('returns null when both empty', () => {
    expect(resolveMetroLabel({ legacyMetro: null, stationName: null })).toBeNull();
    expect(resolveDistrictLabel({ legacyDistrict: null, districtName: null })).toBeNull();
  });
});
