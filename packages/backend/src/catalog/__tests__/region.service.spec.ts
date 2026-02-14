import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { RegionService } from '../region.service';

// ---------------------
// Mock factories
// ---------------------

const mockPrisma = {
  region: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  event: {
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
};

const mockCache = {
  getOrSet: vi.fn().mockImplementation((_key: string, _ttl: number, fn: () => any) => fn()),
};

// ---------------------
// Tests
// ---------------------

describe('RegionService', () => {
  let service: RegionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RegionService(
      mockPrisma as any,
      mockCache as any,
    );
  });

  // =========================================
  // getRegionPreviewByHubCity
  // =========================================

  describe('getRegionPreviewByHubCity', () => {
    it('should return null when no region found for city', async () => {
      mockPrisma.region.findFirst.mockResolvedValue(null);

      const result = await service.getRegionPreviewByHubCity('city-1');

      expect(result).toBeNull();
    });

    it('should return null when region has no non-hub cities', async () => {
      mockPrisma.region.findFirst.mockResolvedValue({
        id: 'r1',
        slug: 'solo-region',
        name: 'Solo Region',
        hubCityId: 'hub-1',
        isActive: true,
        cities: [{ cityId: 'hub-1' }], // only the hub itself
      });

      const result = await service.getRegionPreviewByHubCity('hub-1');

      expect(result).toBeNull();
    });

    it('should return events from non-hub cities', async () => {
      mockPrisma.region.findFirst.mockResolvedValue({
        id: 'r1',
        slug: 'moscow-region',
        name: 'Московская область',
        hubCityId: 'hub-1',
        isActive: true,
        cities: [
          { cityId: 'hub-1' },
          { cityId: 'city-2' },
          { cityId: 'city-3' },
        ],
      });

      const mockEvents = [
        { id: 'e1', title: 'Event 1', rating: 4.5, reviewCount: 10 },
        { id: 'e2', title: 'Event 2', rating: 3.5, reviewCount: 5 },
      ];
      mockPrisma.event.findMany.mockResolvedValue(mockEvents);

      const result = await service.getRegionPreviewByHubCity('hub-1');

      expect(result).not.toBeNull();
      expect(result!.regionSlug).toBe('moscow-region');
      expect(result!.regionName).toBe('Московская область');
      expect(result!.events).toHaveLength(2);
    });

    it('should fallback to any events when quality events are scarce (< 2)', async () => {
      mockPrisma.region.findFirst.mockResolvedValue({
        id: 'r1',
        slug: 'small-region',
        name: 'Small Region',
        hubCityId: 'hub-1',
        isActive: true,
        cities: [
          { cityId: 'hub-1' },
          { cityId: 'city-2' },
        ],
      });

      // First call (quality filter: rating >= 3.0 OR reviewCount > 0) → only 1 event
      mockPrisma.event.findMany
        .mockResolvedValueOnce([{ id: 'e1', rating: 1.0, reviewCount: 0 }])
        // Second call (fallback — any events) → 3 events
        .mockResolvedValueOnce([
          { id: 'e1', rating: 1.0 },
          { id: 'e2', rating: 2.0 },
          { id: 'e3', rating: 0.5 },
        ]);

      const result = await service.getRegionPreviewByHubCity('hub-1');

      expect(result).not.toBeNull();
      expect(result!.events).toHaveLength(3);
      // findMany called twice: quality attempt + fallback
      expect(mockPrisma.event.findMany).toHaveBeenCalledTimes(2);
    });

    it('should return null when no events at all in region', async () => {
      mockPrisma.region.findFirst.mockResolvedValue({
        id: 'r1',
        slug: 'empty-region',
        name: 'Empty Region',
        hubCityId: 'hub-1',
        isActive: true,
        cities: [
          { cityId: 'hub-1' },
          { cityId: 'city-2' },
        ],
      });

      // Quality filter → 0 events, fallback → also 0
      mockPrisma.event.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getRegionPreviewByHubCity('hub-1');

      expect(result).toBeNull();
    });
  });

  // =========================================
  // getRegionBySlug
  // =========================================

  describe('getRegionBySlug', () => {
    it('should return region with cities and event counts', async () => {
      mockPrisma.region.findUnique.mockResolvedValue({
        id: 'r1',
        slug: 'moscow-region',
        name: 'Московская область',
        description: 'Test description',
        heroImage: 'hero.jpg',
        isActive: true,
        hubCity: { id: 'hub-1', slug: 'moscow', name: 'Москва', heroImage: 'moscow.jpg' },
        cities: [
          { cityId: 'hub-1', city: { id: 'hub-1', slug: 'moscow', name: 'Москва' } },
          { cityId: 'city-2', city: { id: 'city-2', slug: 'ramenskoe', name: 'Раменское' } },
        ],
      });

      mockPrisma.event.count
        .mockResolvedValueOnce(20) // excursionCount
        .mockResolvedValueOnce(5)  // museumCount
        .mockResolvedValueOnce(10) // eventCount
        .mockResolvedValueOnce(35); // totalCount

      mockPrisma.event.groupBy.mockResolvedValue([
        { cityId: 'hub-1', _count: { id: 25 } },
        { cityId: 'city-2', _count: { id: 10 } },
      ]);

      const result = await service.getRegionBySlug('moscow-region');

      expect(result.slug).toBe('moscow-region');
      expect(result.name).toBe('Московская область');
      expect(result.cities).toHaveLength(2);
      expect(result.stats.totalCount).toBe(35);
      expect(result.stats.excursionCount).toBe(20);
      expect(result.stats.museumCount).toBe(5);
      // Cities sorted by eventCount descending
      expect(result.cities[0].eventCount).toBeGreaterThanOrEqual(result.cities[1].eventCount);
    });

    it('should use region heroImage when available', async () => {
      mockPrisma.region.findUnique.mockResolvedValue({
        id: 'r1',
        slug: 'test',
        name: 'Test',
        description: null,
        heroImage: 'region-hero.jpg',
        isActive: true,
        hubCity: { id: 'hub-1', slug: 'city', name: 'City', heroImage: 'city-hero.jpg' },
        cities: [
          { cityId: 'hub-1', city: { id: 'hub-1', slug: 'city', name: 'City' } },
        ],
      });
      mockPrisma.event.count.mockResolvedValue(0);
      mockPrisma.event.groupBy.mockResolvedValue([]);

      const result = await service.getRegionBySlug('test');

      expect(result.heroImage).toBe('region-hero.jpg');
    });

    it('should fallback to hubCity heroImage when region heroImage is null', async () => {
      mockPrisma.region.findUnique.mockResolvedValue({
        id: 'r1',
        slug: 'test',
        name: 'Test',
        description: null,
        heroImage: null,
        isActive: true,
        hubCity: { id: 'hub-1', slug: 'city', name: 'City', heroImage: 'city-hero.jpg' },
        cities: [
          { cityId: 'hub-1', city: { id: 'hub-1', slug: 'city', name: 'City' } },
        ],
      });
      mockPrisma.event.count.mockResolvedValue(0);
      mockPrisma.event.groupBy.mockResolvedValue([]);

      const result = await service.getRegionBySlug('test');

      expect(result.heroImage).toBe('city-hero.jpg');
    });

    it('should throw NotFoundException for unknown slug', async () => {
      mockPrisma.region.findUnique.mockResolvedValue(null);

      await expect(service.getRegionBySlug('unknown')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for inactive region', async () => {
      mockPrisma.region.findUnique.mockResolvedValue({
        id: 'r1',
        slug: 'inactive',
        name: 'Inactive',
        isActive: false,
      });

      await expect(service.getRegionBySlug('inactive')).rejects.toThrow(NotFoundException);
    });
  });
});
