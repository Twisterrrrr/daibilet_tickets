/**
 * Интеграционные сценарии Step B: подборки/лендинги без обязательных structural tags,
 * listing health, диагностика пустой выдачи, сигнал по избытку подкатегорий.
 * База не поднимается — Prisma мокируется по месту вызовов.
 */

import { EventCategory, EventSubcategory } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { buildLandingEventsWhere } from '../../landing/landing-event-filter.helper';
import { LandingMaterializerService } from '../../landing/landing-materializer.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SubcategoryPolicyService } from '../../subcategories/subcategory-policy.service';
import { CatalogConsistencyService } from '../catalog-consistency.service';
import { CollectionSelectionService } from '../collection-selection.service';
import { ListingHealthService } from '../listing-health.service';

vi.mock('../../landing/topic-definition.config', () => ({
  TOPIC_DEFINITIONS_CITY: [
    { citySlug: 'int-city', slug: 'int-landing', filterTag: 'ghost-tag', minEvents: 2 },
  ],
}));

describe('Step B catalog eligibility (integration)', () => {
  const subPolicy = new SubcategoryPolicyService();

  it('событие с category + subcategory: коллекция buildWhere без filterTags (structural tags не обязательны)', () => {
    const prisma = {} as unknown as PrismaService;
    const selection = new CollectionSelectionService(prisma, subPolicy);
    const where = selection.buildWhere({
      cityId: 'city-exc',
      filterCategory: EventCategory.EXCURSION,
      filterSubcategory: EventSubcategory.RIVER,
      filterTags: [],
    });
    expect(where.category).toBe(EventCategory.EXCURSION);
    expect(where.tags).toBeUndefined();
    const and = where.AND as object[] | undefined;
    expect(and?.length).toBeGreaterThanOrEqual(1);
    expect(and?.[0]).toMatchObject({ OR: expect.any(Array) });
  });

  it('resolveSelection: count/findMany where без tags при только subcategory', async () => {
    const prisma = {
      event: {
        count: vi.fn().mockResolvedValue(3),
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaService;
    const selection = new CollectionSelectionService(prisma, subPolicy);
    await selection.resolveSelection({
      cityId: 'city-1',
      filterCategory: EventCategory.EXCURSION,
      filterSubcategory: 'river-excursion',
      filterTags: [],
      page: 1,
      limit: 20,
    });
    expect(prisma.event.count).toHaveBeenCalled();
    const countArg = vi.mocked(prisma.event.count).mock.calls[0]![0];
    expect(countArg.where.tags).toBeUndefined();
    const findArg = vi.mocked(prisma.event.findMany).mock.calls[0]![0];
    expect(findArg.where.tags).toBeUndefined();
  });

  it('лендинг: eligibility только по subcategory при tag = null (без обязательного structural tag)', () => {
    const now = new Date('2030-01-01T12:00:00Z');
    const w = buildLandingEventsWhere({
      cityId: 'city-land',
      now,
      tag: null,
      additionalFilters: { subcategories: ['river-excursion'] },
      subcategoryPolicy: subPolicy,
    });
    expect(w).not.toBeNull();
    expect(w!.cityId).toBe('city-land');
    expect(JSON.stringify(w)).not.toContain('tagId');
    const eligibility = (w!.AND as object[])[0];
    expect(eligibility).toEqual(expect.objectContaining({ OR: expect.any(Array) }));
  });

  it('LandingMaterializerService: при отсутствии тега в БД считает по additionalFilters.subcategories', async () => {
    const prisma = {
      landingPage: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'l1',
          cityId: 'c-mat',
          filterTag: 'ghost-tag',
          additionalFilters: { subcategories: ['bus-excursion'] },
          isActive: true,
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      tag: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      event: {
        count: vi.fn().mockResolvedValue(4),
      },
    } as unknown as PrismaService;

    const materializer = new LandingMaterializerService(prisma, subPolicy);
    const r = await materializer.materialize();

    expect(r.processed).toBe(1);
    expect(prisma.event.count).toHaveBeenCalledTimes(1);
    const where = vi.mocked(prisma.event.count).mock.calls[0]![0].where as Record<string, unknown>;
    expect(JSON.stringify(where)).not.toContain('tagId');
    expect(where.AND).toBeDefined();
  });

  it('listing health: нет блокеров по отсутствию тегов; только мягкие коды по контенту', () => {
    const svc = new ListingHealthService({} as unknown as PrismaService);
    const base = {
      id: 'e1',
      title: 'T',
      description: 'x'.repeat(250),
      imageUrl: 'https://ex/img.jpg',
      galleryUrls: [] as string[],
      priceFrom: 100,
      dateMode: 'OPEN_DATE' as const,
      venueId: null as string | null,
      subcategories: [] as EventSubcategory[],
      offers: [{ id: 'o1', priceFrom: 500 }],
      sessions: [] as { id: string; startsAt: Date; canceledAt: Date | null; capacityTotal: number | null; isActive: boolean }[],
      subcategoryLinks: [{ subcategoryId: 'sc-1' }],
    };
    const h = svc.computeEventHealth(base as Parameters<ListingHealthService['computeEventHealth']>[0]);
    const codes = h.issues.map((i) => i.code);
    expect(codes.every((c) => !c.includes('TAG') && c !== 'MISSING_TAGS')).toBe(true);
  });

  it('listing health: SUBCATEGORY_LEGACY_ONLY — не дублирует publish BLOCKED, но сигналит о миграции', () => {
    const svc = new ListingHealthService({} as unknown as PrismaService);
    const h = svc.computeEventHealth({
      id: 'e2',
      title: 'Legacy',
      description: 'x'.repeat(250),
      imageUrl: 'https://ex/img.jpg',
      galleryUrls: [],
      priceFrom: 100,
      dateMode: 'OPEN_DATE',
      venueId: null,
      subcategories: [EventSubcategory.RIVER],
      offers: [{ id: 'o1', priceFrom: 500 }],
      sessions: [],
      subcategoryLinks: [],
    } as Parameters<ListingHealthService['computeEventHealth']>[0]);
    expect(h.issues.some((i) => i.code === 'SUBCATEGORY_LEGACY_ONLY')).toBe(true);
  });

  it('CatalogConsistencyService: нулевая выдача подборок/лендингов считается в selection.*', async () => {
    const prisma = {
      event: {
        count: vi.fn(async ({ where }) => {
          const w = where as Record<string, unknown>;
          const keys = Object.keys(w);
          if (
            keys.length === 3 &&
            w.isActive === true &&
            w.isDeleted === false &&
            w.canonicalOfId === null
          ) {
            return 2000;
          }
          if (
            w.OR &&
            Array.isArray(w.OR) &&
            (w.OR as { imageUrl?: unknown }[]).some((o) => o.imageUrl === null) &&
            (w.OR as { imageUrl?: unknown }[]).some((o) => o.imageUrl === '')
          ) {
            return 90;
          }
          if (
            w.subcategoryLinks &&
            typeof w.subcategoryLinks === 'object' &&
            'none' in (w.subcategoryLinks as object) &&
            w.subcategories &&
            typeof w.subcategories === 'object' &&
            'isEmpty' in (w.subcategories as object)
          ) {
            return 12;
          }
          if (w.offers && typeof w.offers === 'object' && 'none' in (w.offers as object)) return 3;
          if (w.dateMode === 'SCHEDULED' && w.sessions && typeof w.sessions === 'object' && 'none' in (w.sessions as object)) {
            return 1;
          }
          if (w.venueId === null && w.startLocationId === null && w.lat === null) return 2;
          if (w.cityId === 'col-zero') return 0;
          if (w.cityId === 'land-zero') return 0;
          return 99;
        }),
      },
      eventOverride: {
        count: vi.fn().mockResolvedValue(8),
      },
      collection: {
        findMany: vi.fn().mockResolvedValue([
          {
            cityId: 'col-zero',
            filterTags: [],
            filterCategory: EventCategory.EXCURSION,
            filterSubcategory: 'river-excursion',
            filterAudience: null,
            additionalFilters: null,
          },
        ]),
      },
      landingPage: {
        findMany: vi.fn().mockResolvedValue([
          { cityId: 'land-zero', filterTag: 'only-structural', additionalFilters: null },
        ]),
      },
      tag: {
        findFirst: vi.fn().mockResolvedValue({ id: 't1' }),
      },
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([{ count: 3n }])
        .mockResolvedValueOnce([{ count: 11n }]),
    } as unknown as PrismaService;

    const mockCache = {
      getOrSet: async (_k: string, _ttl: number, fn: () => Promise<unknown>) => fn(),
    };

    const selection = new CollectionSelectionService(prisma, subPolicy);
    const consistency = new CatalogConsistencyService(prisma, selection, subPolicy, mockCache as any);

    const snap = await consistency.getSnapshot();

    expect(snap).toMatchObject({ degraded: false });
    expect(snap.events.listableTotal).toBe(2000);
    expect(snap.events.noPrimaryImage).toBe(90);
    expect(snap.events.noEffectiveSubcategory).toBe(12);
    expect(snap.events.excessSubcategoryLinksOver3).toBe(3);
    expect(snap.events.atSubcategoryCap3Links).toBe(11);
    expect(snap.events.weakLocationNoVenueNoPoint).toBe(2);
    expect(snap.events.noOffers).toBe(3);
    expect(snap.events.scheduledNoUpcomingSessions).toBe(1);
    expect(snap.quality.eventOverridesBlocked).toBe(8);
    expect(snap.selection.activeCollectionsTotal).toBe(1);
    expect(snap.selection.activeCollectionsWithZeroEligibleEvents).toBe(1);
    expect(snap.selection.activeLandingsTotal).toBe(1);
    expect(snap.selection.activeLandingsWithZeroEligibleEvents).toBe(1);
  });

  it('CatalogConsistencyService: избыток связей subcategory (>3) отражается в excessSubcategoryLinksOver3', async () => {
    const prisma = {
      event: { count: vi.fn().mockResolvedValue(0) },
      eventOverride: { count: vi.fn().mockResolvedValue(0) },
      collection: { findMany: vi.fn().mockResolvedValue([]) },
      landingPage: { findMany: vi.fn().mockResolvedValue([]) },
      tag: { findFirst: vi.fn().mockResolvedValue(null) },
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([{ count: 42n }])
        .mockResolvedValueOnce([{ count: 0n }]),
    } as unknown as PrismaService;
    const mockCache = {
      getOrSet: async (_k: string, _ttl: number, fn: () => Promise<unknown>) => fn(),
    };
    const selection = new CollectionSelectionService(prisma, subPolicy);
    const consistency = new CatalogConsistencyService(prisma, selection, subPolicy, mockCache as any);
    const snap = await consistency.getSnapshot();
    expect(snap).toMatchObject({ degraded: false });
    expect(snap.events.excessSubcategoryLinksOver3).toBe(42);
  });
});
