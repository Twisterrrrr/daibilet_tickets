import { BadRequestException } from '@nestjs/common';
import { SubcategoryType } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { SubcategoryPolicyService } from '../subcategory-policy.service';

describe('SubcategoryPolicyService', () => {
  const service = new SubcategoryPolicyService();

  it('builds new-first + legacy-fallback filter for legacy enum value', () => {
    const where = service.buildEventSubcategoryFilter('RIVER');
    const or = where.OR as unknown[];
    expect(Array.isArray(or)).toBe(true);
    expect(or.length).toBe(2);
  });

  it('builds new-only filter for non-legacy slug', () => {
    const where = service.buildEventSubcategoryFilter('river-excursion');
    const or = where.OR as unknown[];
    expect(Array.isArray(or)).toBe(true);
    expect(or.length).toBe(1);
  });

  it('throws on event links overflow', () => {
    expect(() => service.assertEventLimit(SubcategoryPolicyService.MAX_EVENT_SUBCATEGORIES + 1)).toThrow(
      BadRequestException,
    );
  });

  it('throws on venue links overflow', () => {
    expect(() => service.assertVenueLimit(SubcategoryPolicyService.MAX_VENUE_SUBCATEGORIES + 1)).toThrow(
      BadRequestException,
    );
  });

  it('allows universal parent for specialized child', () => {
    expect(() =>
      service.assertParentTypeCompatibility(SubcategoryType.EVENT_ONLY, SubcategoryType.UNIVERSAL),
    ).not.toThrow();
  });

  it('rejects incompatible specialized parent-child mix', () => {
    expect(() =>
      service.assertParentTypeCompatibility(SubcategoryType.EVENT_ONLY, SubcategoryType.VENUE_ONLY),
    ).toThrow(BadRequestException);
  });
});

