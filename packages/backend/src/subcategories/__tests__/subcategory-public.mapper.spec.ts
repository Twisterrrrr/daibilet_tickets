import { EventSubcategory, SubcategoryLayer } from '@/prisma-client';
import { describe, expect, it } from 'vitest';

import { resolveEventSubcategoryPresentation } from '../subcategory-public.mapper';

describe('resolveEventSubcategoryPresentation', () => {
  it('fallback to legacy enum when no links', () => {
    const r = resolveEventSubcategoryPresentation(undefined, [EventSubcategory.RIVER]);
    expect(r.primarySubcategory).toBeNull();
    expect(r.secondarySubcategories).toEqual([]);
    expect(r.subcategories).toEqual([EventSubcategory.RIVER]);
  });

  it('new-first: derives primary, secondaries and enum subset from links', () => {
    const r = resolveEventSubcategoryPresentation(
      [
        {
          subcategory: {
            code: 'RIVER',
            nameRu: 'Речная',
            layer: SubcategoryLayer.PRIMARY,
          },
        },
        {
          subcategory: {
            code: 'NIGHT',
            nameRu: 'Ночные',
            layer: SubcategoryLayer.SECONDARY,
          },
        },
      ],
      [EventSubcategory.WALKING],
    );
    expect(r.primarySubcategory).toEqual({ code: 'RIVER', nameRu: 'Речная' });
    expect(r.secondarySubcategories).toEqual([{ code: 'NIGHT', nameRu: 'Ночные' }]);
    expect(r.subcategories).toEqual([EventSubcategory.RIVER]);
  });
});
