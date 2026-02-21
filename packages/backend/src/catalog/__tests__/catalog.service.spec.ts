import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CatalogService } from '../catalog.service';

// ---------------------
// Mock factories
// ---------------------

const mockPrisma = {
  city: { findMany: vi.fn(), findUnique: vi.fn() },
  event: { findMany: vi.fn(), count: vi.fn() },
  tag: { findMany: vi.fn(), findUnique: vi.fn() },
  $queryRaw: vi.fn(),
};

const mockCache = {
  getOrSet: vi.fn().mockImplementation((_key: string, _ttl: number, fn: () => any) => fn()),
};

const mockOverrideService = {
  applyOverrides: vi.fn().mockImplementation((items: any[]) => items),
};

const mockRegionService = {
  getRegionPreviewByHubCity: vi.fn().mockResolvedValue(null),
};

// ---------------------
// Tests
// ---------------------

describe('CatalogService', () => {
  let service: CatalogService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CatalogService(
      mockPrisma as any,
      mockCache as any,
      mockOverrideService as any,
      mockRegionService as any,
    );
  });

  // =========================================
  // getCities
  // =========================================

  describe('getCities', () => {
    it('should filter out cities with fewer than 2 events', async () => {
      // Both $queryRaw calls return empty arrays (no hidden cities, no region stats)
      mockPrisma.$queryRaw.mockResolvedValue([]);
      mockPrisma.city.findMany.mockResolvedValue([
        { id: '1', name: 'Москва', slug: 'moscow', _count: { events: 10, venues: 5 }, landingPages: [] },
        { id: '2', name: 'Empty', slug: 'empty', _count: { events: 0, venues: 0 }, landingPages: [] },
        { id: '3', name: 'OneEvent', slug: 'one-event', _count: { events: 1, venues: 0 }, landingPages: [] },
      ]);

      const result = await service.getCities();

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('moscow');
    });

    it('should hide non-hub regional cities', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ cityId: 'hidden-1' }]) // hiddenCityIds
        .mockResolvedValueOnce([]); // regionStats
      mockPrisma.city.findMany.mockResolvedValue([
        { id: '1', name: 'Москва', slug: 'moscow', _count: { events: 10, venues: 5 }, landingPages: [] },
        { id: 'hidden-1', name: 'Раменское', slug: 'ramenskoe', _count: { events: 3, venues: 0 }, landingPages: [] },
      ]);

      const result = await service.getCities();

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('moscow');
    });

    it('should sort cities by event count descending', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);
      mockPrisma.city.findMany.mockResolvedValue([
        { id: '1', name: 'Small', slug: 'small', _count: { events: 5, venues: 1 }, landingPages: [] },
        { id: '2', name: 'Big', slug: 'big', _count: { events: 50, venues: 10 }, landingPages: [] },
      ]);

      const result = await service.getCities();

      expect(result[0].slug).toBe('big');
      expect(result[1].slug).toBe('small');
    });

    it('should attach region data to hub cities', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // no hidden cities
        .mockResolvedValueOnce([
          {
            slug: 'moskovskaya-oblast',
            name: 'Московская область',
            hubCityId: '1',
            event_count: BigInt(10),
          },
        ]);
      mockPrisma.city.findMany.mockResolvedValue([
        { id: '1', name: 'Москва', slug: 'moscow', _count: { events: 50, venues: 10 }, landingPages: [] },
      ]);

      const result = await service.getCities();

      expect(result[0].region).toEqual({
        slug: 'moskovskaya-oblast',
        name: 'Московская область',
        eventCount: 10,
      });
    });

    it('should return null region for non-hub cities', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);
      mockPrisma.city.findMany.mockResolvedValue([
        { id: '99', name: 'Казань', slug: 'kazan', _count: { events: 20, venues: 3 }, landingPages: [] },
      ]);

      const result = await service.getCities();

      expect(result[0].region).toBeNull();
    });
  });

  // =========================================
  // getEvents
  // =========================================

  describe('getEvents', () => {
    it('should return paginated events', async () => {
      mockPrisma.event.findMany.mockResolvedValue([
        {
          id: '1',
          title: 'Test Event',
          sessions: [{ startsAt: new Date(), availableTickets: 10 }],
          offers: [{ id: 'o1', priceFrom: 1000, isPrimary: true, priority: 1 }],
          tags: [],
          rating: 4.5,
          priceFrom: 1000,
        },
      ]);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await service.getEvents({ page: 1, limit: 20 } as any);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by city slug', async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      await service.getEvents({ city: 'moscow', page: 1, limit: 20 } as any);

      expect(mockPrisma.event.findMany).toHaveBeenCalled();
      const callArgs = mockPrisma.event.findMany.mock.calls[0][0];
      expect(callArgs.where).toHaveProperty('city');
      expect(callArgs.where.city).toHaveProperty('slug', 'moscow');
    });

    it('should apply overrides to raw events', async () => {
      mockPrisma.event.findMany.mockResolvedValue([
        {
          id: '1',
          title: 'Event',
          sessions: [],
          offers: [],
          tags: [],
          rating: 3.0,
          priceFrom: 500,
        },
      ]);
      mockPrisma.event.count.mockResolvedValue(1);

      await service.getEvents({ page: 1, limit: 20 } as any);

      expect(mockOverrideService.applyOverrides).toHaveBeenCalledTimes(1);
    });

    it('should return empty result for departing_soon with no time matches', async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      const result = await service.getEvents({
        sort: 'departing_soon',
        page: 1,
        limit: 20,
      } as any);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should calculate totalPages correctly', async () => {
      mockPrisma.event.findMany.mockResolvedValue(
        Array.from({ length: 20 }, (_, i) => ({
          id: String(i),
          title: `Event ${i}`,
          sessions: [],
          offers: [],
          tags: [],
          rating: 3.0,
          priceFrom: 100,
        })),
      );
      mockPrisma.event.count.mockResolvedValue(45);

      const result = await service.getEvents({ page: 1, limit: 20 } as any);

      expect(result.totalPages).toBe(3); // ceil(45/20) = 3
    });
  });
});
