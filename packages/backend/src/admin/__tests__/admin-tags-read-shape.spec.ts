import { describe, expect, it, vi } from 'vitest';

import { AdminCollectionsController } from '../admin-collections.controller';
import { AdminLandingsController } from '../admin-landings.controller';
import type { PrismaService } from '../../prisma/prisma.service';

describe('Admin controllers read-shape: tag refs include isActive', () => {
  it('AdminLandingsController.list includes filterTagRef.isActive', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const prisma = {
      landingPage: { findMany, count },
    } as unknown as PrismaService;

    const c = new AdminLandingsController(
      prisma,
      {} as any, // audit
      {} as any, // writeValidation
      {} as any, // materializer
      { resolveAdminResolvedEvents: vi.fn() } as any, // landings
    );

    await c.list(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      '1',
      '20',
    );

    expect(findMany).toHaveBeenCalledTimes(1);
    const arg = findMany.mock.calls[0]![0] as any;
    expect(arg.include?.filterTagRef?.select?.isActive).toBe(true);
  });

  it('AdminLandingsController.get includes filterTagRef.isActive', async () => {
    const findUniqueOrThrow = vi.fn().mockResolvedValue({
      id: 'lp1',
      slug: 'x',
      title: 't',
      landingType: 'CITY',
      status: 'DRAFT',
      isDeleted: false,
      isActive: true,
      isIndexable: true,
      cityId: null,
      parentLandingId: null,
      metaTitle: null,
      metaDescription: null,
      heroText: null,
      subtitle: null,
      collectionId: null,
      relatedArticleIds: [],
      relatedCollectionIds: [],
      canonicalUrl: null,
      childLandings: [],
      city: null,
      filterTagRef: null,
    });
    const prisma = {
      landingPage: { findUniqueOrThrow },
    } as unknown as PrismaService;

    const c = new AdminLandingsController(
      prisma,
      {} as any, // audit
      {} as any, // writeValidation
      {} as any, // materializer
      { resolveAdminResolvedEvents: vi.fn().mockResolvedValue({ items: [], total: 0 }) } as any, // landings
    );

    await c.get('lp1');

    expect(findUniqueOrThrow).toHaveBeenCalledTimes(1);
    const arg = findUniqueOrThrow.mock.calls[0]![0] as any;
    expect(arg.include?.filterTagRef?.select?.isActive).toBe(true);
  });

  it('AdminCollectionsController.list includes tagFilters.tag.isActive', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const prisma = {
      collection: { findMany, count },
      collectionItem: { groupBy: vi.fn().mockResolvedValue([]) },
    } as any;

    const c = new AdminCollectionsController(
      prisma,
      {} as any, // suggestionService
      {} as any, // selectionService
      {} as any, // materializer
      {} as any, // writeValidation
    );

    await c.list(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined);

    expect(findMany).toHaveBeenCalledTimes(1);
    const arg = findMany.mock.calls[0]![0] as any;
    expect(arg.include?.tagFilters?.include?.tag?.select?.isActive).toBe(true);
  });

  it('AdminCollectionsController.get includes tagFilters.tag.isActive', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 'c1',
      slug: 's',
      title: 't',
      subtitle: null,
      cityId: null,
      city: null,
      sourceType: 'MANUAL',
      status: 'DRAFT',
      selectionBasis: 'MANUAL',
      isActive: true,
      metaTitle: null,
      metaDescription: null,
      publishedAt: null,
      updatedAt: new Date(),
      version: 1,
      pinnedEventIds: [],
      excludedEventIds: [],
      queryConfig: null,
      items: [],
      filterTags: [],
      tagFilters: [],
    });
    const prisma = {
      collection: { findUnique },
    } as any;

    const c = new AdminCollectionsController(
      prisma,
      {} as any, // suggestionService
      {} as any, // selectionService
      {} as any, // materializer
      {} as any, // writeValidation
    );

    await c.get('c1');

    expect(findUnique).toHaveBeenCalledTimes(1);
    const arg = findUnique.mock.calls[0]![0] as any;
    expect(arg.include?.tagFilters?.include?.tag?.select?.isActive).toBe(true);
  });
});

