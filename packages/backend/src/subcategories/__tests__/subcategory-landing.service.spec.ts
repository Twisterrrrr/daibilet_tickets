import { NotFoundException } from '@nestjs/common';
import { SubcategoryLandingMode, SubcategoryType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CacheService } from '../../cache/cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SubcategoryCollectionsService } from '../subcategory-collections.service';
import { SubcategoryLandingService } from '../subcategory-landing.service';

describe('SubcategoryLandingService', () => {
  let prisma: {
    city: { findFirst: ReturnType<typeof vi.fn> };
    subcategory: { findFirst: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  };
  const baseSub = {
    id: 's1',
    code: 'NIGHT',
    slug: 'night',
    nameRu: 'Ночные экскурсии',
    type: SubcategoryType.UNIVERSAL,
    isActive: true,
    isLandingEnabled: true,
    landingMode: SubcategoryLandingMode.AUTO,
    landingTopicKey: null as string | null,
    parentId: null,
  };
  let collections: { getEventCollectionBySubcategory: ReturnType<typeof vi.fn> };
  let cache: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };
  let service: SubcategoryLandingService;

  beforeEach(() => {
    prisma = {
      city: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'c1',
          slug: 'spb',
          name: 'Санкт-Петербург',
          isActive: true,
        }),
      },
      subcategory: {
        findFirst: vi.fn().mockResolvedValue({ ...baseSub }),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    collections = {
      getEventCollectionBySubcategory: vi.fn().mockResolvedValue({
        total: 1,
        items: [],
        totalPages: 0,
      }),
    };
    cache = { get: vi.fn().mockResolvedValue(null), set: vi.fn() };
    service = new SubcategoryLandingService(
      prisma as unknown as PrismaService,
      collections as unknown as SubcategoryCollectionsService,
      cache as unknown as CacheService,
    );
  });

  it('buildLandingPayload: below threshold → not published', async () => {
    const p = await service.buildLandingPayload('spb', 'night', { nocache: true });
    expect(p.published).toBe(false);
    expect(p.unpublishedReasons).toContain('BELOW_CONTENT_THRESHOLD');
    expect(collections.getEventCollectionBySubcategory).toHaveBeenCalled();
  });

  it('buildLandingPayload: uses collections engine for items (no duplicate filter)', async () => {
    collections.getEventCollectionBySubcategory.mockResolvedValue({
      total: 10,
      items: [{ id: 'e1' }],
      totalPages: 1,
    });
    const p = await service.buildLandingPayload('spb', 'night', { nocache: true });
    expect(p.published).toBe(true);
    expect(p.collection.total).toBe(10);
    expect(p.collection.items).toEqual([{ id: 'e1' }]);
  });

  it('getPublishedLandingOrThrow throws when not published', async () => {
    await expect(service.getPublishedLandingOrThrow('spb', 'night')).rejects.toThrow(NotFoundException);
  });

  it('buildLandingPayload: TOPIC_HUB → not published + topicHubRedirect', async () => {
    prisma.subcategory.findFirst.mockResolvedValue({
      ...baseSub,
      code: 'RIVER',
      landingMode: SubcategoryLandingMode.TOPIC_HUB,
      landingTopicKey: 'river-cruises',
    });
    const p = await service.buildLandingPayload('spb', 'river-excursion', { nocache: true });
    expect(p.published).toBe(false);
    expect(p.unpublishedReasons).toContain('TOPIC_HUB_CANONICAL');
    expect(p.topicHubRedirect).toBe('/river-cruises/spb');
    expect(collections.getEventCollectionBySubcategory).not.toHaveBeenCalled();
  });

  it('resolvePublicRoute: TOPIC_HUB', async () => {
    prisma.subcategory.findFirst.mockResolvedValue({
      landingMode: SubcategoryLandingMode.TOPIC_HUB,
      landingTopicKey: 'river-cruises',
      isActive: true,
    });
    const r = await service.resolvePublicRoute('spb', 'river-excursion');
    expect(r).toEqual({ kind: 'TOPIC_HUB', redirectPath: '/river-cruises/spb' });
  });

  it('resolvePublicRoute: AUTO', async () => {
    prisma.subcategory.findFirst.mockResolvedValue({
      landingMode: SubcategoryLandingMode.AUTO,
      landingTopicKey: null,
      isActive: true,
    });
    const r = await service.resolvePublicRoute('spb', 'night');
    expect(r).toEqual({ kind: 'AUTO' });
  });

  it('cache: stores only published payloads', async () => {
    collections.getEventCollectionBySubcategory.mockResolvedValue({
      total: 10,
      items: [],
      totalPages: 0,
    });
    cache.get.mockResolvedValue(null);
    await service.buildLandingPayload('spb', 'night', { nocache: false });
    expect(cache.set).toHaveBeenCalled();
  });
});
