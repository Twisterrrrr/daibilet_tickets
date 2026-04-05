import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CatalogService } from '../../catalog/catalog.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { SubcategoryCollectionsService } from '../subcategory-collections.service';
import { SubcategoryPolicyService } from '../subcategory-policy.service';

describe('SubcategoryCollectionsService', () => {
  let catalog: { getEvents: ReturnType<typeof vi.fn> };
  let prisma: {
    subcategory: { findMany: ReturnType<typeof vi.fn> };
    venue: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  };
  let cache: { getOrSet: ReturnType<typeof vi.fn> };
  let service: SubcategoryCollectionsService;

  beforeEach(() => {
    catalog = { getEvents: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, totalPages: 0 }) };
    prisma = {
      subcategory: { findMany: vi.fn().mockResolvedValue([]) },
      venue: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    };
    cache = { getOrSet: vi.fn((_k: string, _t: number, f: () => Promise<unknown>) => f()) };
    service = new SubcategoryCollectionsService(
      catalog as unknown as CatalogService,
      prisma as unknown as PrismaService,
      cache as unknown as CacheService,
      new SubcategoryPolicyService(),
    );
  });

  it('getEventCollectionBySubcategory delegates to CatalogService.getEvents', async () => {
    await service.getEventCollectionBySubcategory({
      subcategoryCode: 'NIGHT',
      citySlug: 'spb',
      page: 2,
      limit: 12,
      nocache: true,
    });
    expect(catalog.getEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        subcategory: 'NIGHT',
        city: 'spb',
        page: 2,
        limit: 12,
        sort: 'popular',
        fields: 'card',
      }),
    );
  });

  it('getVenueCollectionBySubcategory uses subcategoryLinks filter', async () => {
    await service.getVenueCollectionBySubcategory({
      subcategoryCode: 'MUSEUM',
      citySlug: 'spb',
      nocache: true,
    });
    expect(prisma.venue.findMany).toHaveBeenCalled();
    const arg = prisma.venue.findMany.mock.calls[0]![0];
    expect(arg.where).toMatchObject({
      subcategoryLinks: { some: { subcategory: { code: 'MUSEUM', isActive: true } } },
    });
  });

  it('different citySlug yields different getEvents params', async () => {
    await service.getEventCollectionBySubcategory({
      subcategoryCode: 'RIVER',
      citySlug: 'msk',
      nocache: true,
    });
    await service.getEventCollectionBySubcategory({
      subcategoryCode: 'RIVER',
      citySlug: 'spb',
      nocache: true,
    });
    expect(catalog.getEvents.mock.calls[0]![0].city).toBe('msk');
    expect(catalog.getEvents.mock.calls[1]![0].city).toBe('spb');
  });
});
