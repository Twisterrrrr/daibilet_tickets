import { DateMode, EventAudience, EventCategory } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { SubcategoryPolicyService } from '../../subcategories/subcategory-policy.service';
import { CollectionSelectionService } from '../collection-selection.service';

describe('CollectionSelectionService.buildWhere', () => {
  const prisma = {} as never;
  const sub = new SubcategoryPolicyService();
  const svc = new CollectionSelectionService(prisma, sub);

  it('combines filterTags and filterSubcategory with OR (not AND)', () => {
    const w = svc.buildWhere({
      cityId: 'city-1',
      filterTags: ['night'],
      filterSubcategory: 'RIVER',
      filterCategory: EventCategory.EXCURSION,
    });
    expect(w.category).toBe(EventCategory.EXCURSION);
    expect(w.tags).toBeUndefined();
    const and = w.AND;
    expect(Array.isArray(and)).toBe(true);
    const flat = and as object[];
    const orWrap = flat.find((x) => 'OR' in x && Array.isArray((x as { OR: unknown[] }).OR));
    expect(orWrap).toBeDefined();
    const branches = (orWrap as { OR: object[] }).OR;
    expect(branches).toHaveLength(2);
    expect(branches[0]).toMatchObject({
      tags: { some: { tag: { slug: { in: ['night'] } } } },
    });
    expect(branches[1]).toMatchObject({
      OR: expect.any(Array),
    });
  });

  it('keeps tag-only filter on where.tags', () => {
    const w = svc.buildWhere({
      cityId: 'city-1',
      filterTags: ['romantic'],
    });
    expect(w.tags).toEqual({ some: { tag: { slug: { in: ['romantic'] } } } });
    expect(w.AND).toBeUndefined();
  });

  it('keeps subcategory-only filter in AND', () => {
    const w = svc.buildWhere({
      cityId: 'city-1',
      filterSubcategory: 'BUS',
    });
    expect(w.tags).toBeUndefined();
    const and = w.AND as object[];
    expect(and?.length).toBeGreaterThanOrEqual(1);
    expect(and[0]).toMatchObject({ OR: expect.any(Array) });
  });

  it('does not break date OR on collection when additional dateMode is absent', () => {
    const w = svc.buildWhere({ cityId: 'x' });
    expect(w.OR).toHaveLength(2);
    expect((w.OR as object[])[0]).toMatchObject({ dateMode: DateMode.SCHEDULED });
  });

  it('applies KIDS audience expansion', () => {
    const w = svc.buildWhere({
      cityId: 'c',
      filterAudience: 'KIDS',
    });
    expect(w.audience).toEqual({ in: [EventAudience.KIDS, EventAudience.FAMILY] });
  });
});
