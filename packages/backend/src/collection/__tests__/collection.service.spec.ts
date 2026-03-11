import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CollectionService } from '../collection.service';

const mockPrisma = {
  collection: {
    findFirst: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
  },
  city: {
    findFirst: vi.fn(),
  },
  event: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
};

const mockCache = {
  getOrSet: vi.fn(async (_key, _ttl, fn) => fn()),
};

describe('CollectionService', () => {
  let service: CollectionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CollectionService(mockPrisma as any, mockCache as any);
  });

  describe('getBySlug - cross-city (cityId=null)', () => {
    it('should return cross-city events without city filter', async () => {
      const salyutCollection = {
        id: 'c1',
        slug: 'salyut',
        cityId: null,
        filterTags: ['salyut-s-vody'],
        filterCategory: null,
        filterSubcategory: null,
        filterAudience: null,
        excludedEventIds: [],
        pinnedEventIds: [],
        additionalFilters: null,
        city: null,
        title: 'Салют с воды',
        subtitle: 'Речные прогулки',
        heroImage: null,
        description: null,
        infoBlocks: null,
        faq: null,
        metaTitle: null,
        metaDescription: null,
      };

      mockPrisma.collection.findFirst.mockResolvedValue(salyutCollection);
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      const result = await service.getBySlug('salyut', 1, 20);

      expect(mockPrisma.collection.findFirst).toHaveBeenCalledWith({
        where: { slug: 'salyut', isActive: true, isDeleted: false },
        include: { city: { select: { id: true, slug: true, name: true } } },
      });
      expect(mockPrisma.city.findFirst).not.toHaveBeenCalled();
      expect(result.collection.slug).toBe('salyut');
    });

    it('should filter by city when citySlug provided for cross-city collection', async () => {
      const salyutCollection = {
        id: 'c1',
        slug: 'salyut',
        cityId: null,
        filterTags: ['salyut-s-vody'],
        filterCategory: null,
        filterSubcategory: null,
        filterAudience: null,
        excludedEventIds: [],
        pinnedEventIds: [],
        additionalFilters: null,
        city: null,
        title: 'Салют с воды',
        subtitle: 'Речные прогулки',
        heroImage: null,
        description: null,
        infoBlocks: null,
        faq: null,
        metaTitle: null,
        metaDescription: null,
      };

      mockPrisma.collection.findFirst.mockResolvedValue(salyutCollection);
      mockPrisma.city.findFirst.mockResolvedValue({ id: 'city-spb' });
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      await service.getBySlug('salyut', 1, 20, 'saint-petersburg');

      expect(mockPrisma.city.findFirst).toHaveBeenCalledWith({
        where: { slug: 'saint-petersburg', isActive: true },
        select: { id: true },
      });
      expect(mockPrisma.event.findMany).toHaveBeenCalled();
      const where = mockPrisma.event.findMany.mock.calls[0][0].where;
      expect(where.city).toEqual({ slug: 'saint-petersburg', isActive: true });
    });

    it('should throw BadRequestException for unknown city', async () => {
      const salyutCollection = {
        id: 'c1',
        slug: 'salyut',
        cityId: null,
        filterTags: ['salyut-s-vody'],
        city: null,
        pinnedEventIds: [],
        excludedEventIds: [],
      };

      mockPrisma.collection.findFirst.mockResolvedValue(salyutCollection);
      mockPrisma.city.findFirst.mockResolvedValue(null);

      await expect(service.getBySlug('salyut', 1, 20, 'invalid-city')).rejects.toThrow(BadRequestException);
      await expect(service.getBySlug('salyut', 1, 20, 'invalid-city')).rejects.toThrow('Город "invalid-city" не найден');
    });
  });

  describe('getBySlug - city-bound collection', () => {
    it('should ignore city query for city-bound collection', async () => {
      const cityCollection = {
        id: 'c2',
        slug: 'nochnye-ekskursii-spb',
        cityId: 'city-spb',
        filterTags: ['night'],
        filterCategory: null,
        filterSubcategory: null,
        filterAudience: null,
        excludedEventIds: [],
        pinnedEventIds: [],
        additionalFilters: null,
        city: { id: 'city-spb', slug: 'saint-petersburg', name: 'Санкт-Петербург' },
        title: 'Ночные экскурсии',
        subtitle: null,
        heroImage: null,
        description: null,
        infoBlocks: null,
        faq: null,
        metaTitle: null,
        metaDescription: null,
      };

      mockPrisma.collection.findFirst.mockResolvedValue(cityCollection);
      mockPrisma.city.findFirst.mockResolvedValue(null); // не должен вызываться с city query для city-bound
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      await service.getBySlug('nochnye-ekskursii-spb', 1, 20, 'moscow');

      expect(mockPrisma.city.findFirst).not.toHaveBeenCalled();
      const where = mockPrisma.event.findMany.mock.calls[0][0].where;
      expect(where.cityId).toBe('city-spb');
    });
  });

  describe('getBySlug - not found', () => {
    it('should throw NotFoundException for unknown slug', async () => {
      mockPrisma.collection.findFirst.mockResolvedValue(null);

      await expect(service.getBySlug('unknown-slug')).rejects.toThrow(NotFoundException);
      await expect(service.getBySlug('unknown-slug')).rejects.toThrow('Подборка "unknown-slug" не найдена');
    });
  });
});
