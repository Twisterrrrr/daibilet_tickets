import { computeVenueSimilarity } from '../venue-match.utils';
import { describe, expect, it } from 'vitest';

describe('computeVenueSimilarity', () => {
  it('detects same normalized name and address', () => {
    const base = {
      normalizedName: 'экспофорум',
      normalizedAddress: 'санктпетербург набрекифонтанки53',
      rawName: null as string | null,
      rawAddress: null as string | null,
    };
    const other = {
      normalizedName: 'экспофорум',
      normalizedAddress: 'санктпетербург набрекифонтанки53',
      rawName: null as string | null,
      rawAddress: null as string | null,
    };
    const r = computeVenueSimilarity(base, other);
    expect(r.score).toBeGreaterThan(80);
    expect(r.reasons).toContain('same_normalized_name');
    expect(r.reasons).toContain('same_normalized_address');
  });

  it('returns low score for unrelated venues', () => {
    const r = computeVenueSimilarity(
      {
        normalizedName: 'музейа',
        normalizedAddress: 'невский1',
        rawName: null,
        rawAddress: null,
      },
      {
        normalizedName: 'театрб',
        normalizedAddress: 'рубинштейна5',
        rawName: null,
        rawAddress: null,
      },
    );
    expect(r.score).toBe(0);
  });
});
