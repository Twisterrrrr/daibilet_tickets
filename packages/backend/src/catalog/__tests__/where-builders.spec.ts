import { DateMode, EventSource } from '@/prisma-client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildEventWhere } from '../where-builders';

describe('buildEventWhere', () => {
  const sessionOr: import('@prisma/client').Prisma.EventWhereInput = {
    OR: [
      {
        dateMode: DateMode.SCHEDULED,
        sessions: { some: { isActive: true, startsAt: { gte: new Date('2030-01-01') } } },
      },
      { dateMode: DateMode.OPEN_DATE, OR: [{ endDate: null }] },
    ],
  };

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.NODE_ENV;
  });

  it('merges sessionFilter into AND so production source OR is not overwritten by subcategory', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('IMPORT_SOURCES_ENABLED', '1');

    const w = buildEventWhere(
      {
        city: 'spb',
        subcategory: 'RIVER',
      },
      sessionOr,
    );

    expect(w.OR).toEqual(
      expect.arrayContaining([
        { source: EventSource.MANUAL },
        expect.objectContaining({ source: { in: [EventSource.TC, EventSource.TEPLOHOD] } }),
      ]),
    );
    const and = w.AND as object[];
    expect(Array.isArray(and)).toBe(true);
    expect(and.some((x) => 'OR' in x && Array.isArray((x as { OR: unknown }).OR))).toBe(true);
    expect(and).toContainEqual(sessionOr);
  });

  it('OR between subcategory and single tag when both set', () => {
    const w = buildEventWhere(
      {
        subcategory: 'river-excursion',
        tag: 'night',
      },
      sessionOr,
    );

    const and = w.AND as Array<{ OR?: unknown[] }>;
    const orWrap = and.find((x) => x.OR && Array.isArray(x.OR));
    expect(orWrap?.OR).toHaveLength(2);
    expect(orWrap?.OR?.[0]).toMatchObject({ OR: expect.any(Array) });
    expect(orWrap?.OR?.[1]).toEqual({ tags: { some: { tag: { slug: 'night' } } } });
  });

  it('AND structural tag slugs; OR with subcategory when both', () => {
    const w = buildEventWhere(
      {
        subcategory: 'bus-excursion',
        structuralTags: ['a', 'b'],
      },
      sessionOr,
    );

    const and = w.AND as Array<{ OR?: unknown[] }>;
    const orWrap = and.find((x) => x.OR && Array.isArray(x.OR));
    expect(orWrap?.OR).toHaveLength(2);
    const tagBranch = orWrap?.OR?.[1] as { AND?: unknown[] };
    expect(tagBranch?.AND).toHaveLength(2);
  });

  it('only tag: single clause in AND', () => {
    const w = buildEventWhere({ tag: 'romantic' }, sessionOr);
    const and = w.AND as object[];
    expect(and).toContainEqual({ tags: { some: { tag: { slug: 'romantic' } } } });
    expect(and).toContainEqual(sessionOr);
  });
});
