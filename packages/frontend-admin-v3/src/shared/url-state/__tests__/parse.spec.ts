import { describe, expect, it } from 'vitest';
import { normalizeCsvValues, readBool01, readCsv, readInt, readSortAndOrder } from '../parse';

describe('url-state/parse', () => {
  it('readInt: falls back for invalid', () => {
    const sp = new URLSearchParams('page=0');
    expect(readInt(sp, 'page', 1)).toBe(1);
  });

  it('readBool01: parses 1/0/true/false', () => {
    expect(readBool01(new URLSearchParams('x=1'), 'x')).toBe(true);
    expect(readBool01(new URLSearchParams('x=0'), 'x')).toBe(false);
    expect(readBool01(new URLSearchParams('x=true'), 'x')).toBe(true);
    expect(readBool01(new URLSearchParams('x=false'), 'x')).toBe(false);
  });

  it('readCsv: trims/dedupes/sorts', () => {
    const sp = new URLSearchParams('status=B, a,,A');
    expect(readCsv(sp, 'status', { lower: true })).toEqual(['a', 'b']);
  });

  it('normalizeCsvValues: stable sort + dedupe', () => {
    expect(normalizeCsvValues([' b ', 'a', 'a', ''])).toEqual(['a', 'b']);
  });

  it('readSortAndOrder: supports legacy sort=field:dir', () => {
    const sp = new URLSearchParams('sort=title:asc');
    expect(readSortAndOrder(sp, ['updatedAt', 'title'], { sort: 'updatedAt', order: 'desc' })).toEqual({
      sort: 'title',
      order: 'asc',
    });
  });
});

