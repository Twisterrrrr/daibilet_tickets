import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../prisma/prisma.service';
import { SubcategoryPolicyService } from '../../subcategories/subcategory-policy.service';
import { CatalogClassificationNormalizerService } from '../catalog-classification-normalizer.service';

describe('CatalogClassificationNormalizerService', () => {
  const policy = new SubcategoryPolicyService();

  it('returns ordered unique rows and respects max 4', async () => {
    const findMany = vi.fn().mockResolvedValue([
      { id: 'a', slug: 'alpha' },
      { id: 'b', slug: 'beta' },
      { id: 'c', slug: 'gamma' },
    ]);
    const prisma = { subcategory: { findMany } } as unknown as PrismaService;
    const svc = new CatalogClassificationNormalizerService(prisma, policy);
    const rows = await svc.resolveActiveEventSubcategories(['a', 'b'], ['gamma']);
    expect(rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(findMany).toHaveBeenCalled();
  });

  it('throws when more than 4 unique subcategories', async () => {
    const findMany = vi.fn().mockResolvedValue([
      { id: 'a', slug: 'a' },
      { id: 'b', slug: 'b' },
      { id: 'c', slug: 'c' },
      { id: 'd', slug: 'd' },
      { id: 'e', slug: 'e' },
    ]);
    const prisma = { subcategory: { findMany } } as unknown as PrismaService;
    const svc = new CatalogClassificationNormalizerService(prisma, policy);
    await expect(svc.resolveActiveEventSubcategories(['a', 'b', 'c', 'd', 'e'], [])).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws when id missing in DB', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'a', slug: 'a' }]);
    const prisma = { subcategory: { findMany } } as unknown as PrismaService;
    const svc = new CatalogClassificationNormalizerService(prisma, policy);
    await expect(svc.resolveActiveEventSubcategories(['a', 'missing'], [])).rejects.toThrow(BadRequestException);
  });
});
