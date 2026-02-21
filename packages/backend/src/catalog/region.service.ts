import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService, CACHE_TTL } from '../cache/cache.service';
import { Prisma, DateMode, EventCategory } from '@prisma/client';

@Injectable()
export class RegionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /** Фильтр активных событий: SCHEDULED с будущими сеансами ИЛИ OPEN_DATE */
  private get activeEventFilter(): Prisma.EventWhereInput {
    return {
      isActive: true,
      canonicalOfId: null,
      OR: [
        {
          dateMode: DateMode.SCHEDULED,
          sessions: { some: { isActive: true, startsAt: { gte: new Date() } } },
        },
        {
          dateMode: DateMode.OPEN_DATE,
          OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
        },
      ],
    };
  }

  /**
   * Получить превью событий региона для страницы хаб-города.
   * Возвращает 6 лучших событий из соседних городов (исключая сам хаб).
   * Возвращает null если город не является хабом региона.
   */
  async getRegionPreviewByHubCity(cityId: string): Promise<{
    regionSlug: string;
    regionName: string;
    events: any[];
  } | null> {
    const cacheKey = `regions:preview:hub:${cityId}`;
    return this.cache.getOrSet(cacheKey, CACHE_TTL.CITY_DETAIL, async () => {
      // Найти регион, где этот город — хаб
      const region = await this.prisma.region.findFirst({
        where: { hubCityId: cityId, isActive: true },
        include: {
          cities: { select: { cityId: true } },
        },
      });

      if (!region) return null;

      // Города региона, исключая хаб
      const otherCityIds = region.cities
        .map((rc) => rc.cityId)
        .filter((id) => id !== cityId);

      if (otherCityIds.length === 0) return null;

      // 6 лучших событий из соседних городов
      // Сначала пробуем с качественным фильтром (рейтинг >= 3.0 ИЛИ есть отзывы)
      const eventInclude = {
        city: { select: { slug: true, name: true } },
        tags: { include: { tag: true } },
        sessions: {
          where: { isActive: true, startsAt: { gte: new Date() } },
          orderBy: { startsAt: 'asc' as const },
          take: 1,
        },
      };

      let events = await this.prisma.event.findMany({
        where: {
          ...this.activeEventFilter,
          cityId: { in: otherCityIds },
          AND: [
            { OR: [{ rating: { gte: 3.0 } }, { reviewCount: { gt: 0 } }] },
          ],
        },
        orderBy: { rating: 'desc' },
        take: 6,
        include: eventInclude,
      });

      // Если качественных событий мало — берём любые доступные (fallback)
      if (events.length < 2) {
        events = await this.prisma.event.findMany({
          where: {
            ...this.activeEventFilter,
            cityId: { in: otherCityIds },
          },
          orderBy: { rating: 'desc' },
          take: 6,
          include: eventInclude,
        });
      }

      // Если событий совсем нет — не показывать блок
      if (events.length === 0) return null;

      return {
        regionSlug: region.slug,
        regionName: region.name,
        events,
      };
    });
  }

  /**
   * Данные региона по slug: для страницы /regions/[slug]
   */
  async getRegionBySlug(slug: string) {
    const cacheKey = `regions:detail:${slug}`;
    return this.cache.getOrSet(cacheKey, CACHE_TTL.CITY_DETAIL, async () => {
      const region = await this.prisma.region.findUnique({
        where: { slug },
        include: {
          hubCity: { select: { id: true, slug: true, name: true, heroImage: true } },
          cities: {
            include: {
              city: { select: { id: true, slug: true, name: true } },
            },
          },
        },
      });

      if (!region || !region.isActive) {
        throw new NotFoundException(`Регион "${slug}" не найден`);
      }

      const cityIds = region.cities.map((rc) => rc.cityId);

      // Статистика по категориям
      const [excursionCount, museumCount, eventCount, totalCount] =
        await Promise.all([
          this.prisma.event.count({
            where: { ...this.activeEventFilter, cityId: { in: cityIds }, category: 'EXCURSION' },
          }),
          this.prisma.event.count({
            where: { ...this.activeEventFilter, cityId: { in: cityIds }, category: 'MUSEUM' },
          }),
          this.prisma.event.count({
            where: { ...this.activeEventFilter, cityId: { in: cityIds }, category: 'EVENT' },
          }),
          this.prisma.event.count({
            where: { ...this.activeEventFilter, cityId: { in: cityIds } },
          }),
        ]);

      // Количество событий на город — один groupBy вместо N запросов
      const countsByCity = await this.prisma.event.groupBy({
        by: ['cityId'],
        where: { ...this.activeEventFilter, cityId: { in: cityIds } },
        _count: { id: true },
      });
      const countMap = new Map(countsByCity.map((c) => [c.cityId, c._count.id]));

      const citiesWithCounts = region.cities.map((rc) => ({
        id: rc.city.id,
        slug: rc.city.slug,
        name: rc.city.name,
        eventCount: countMap.get(rc.cityId) ?? 0,
      }));

      return {
        id: region.id,
        slug: region.slug,
        name: region.name,
        description: region.description,
        heroImage: region.heroImage || region.hubCity.heroImage,
        hubCity: region.hubCity,
        cities: citiesWithCounts.sort((a, b) => b.eventCount - a.eventCount),
        stats: { excursionCount, museumCount, eventCount, totalCount },
      };
    });
  }

  /**
   * События региона с пагинацией и фильтрами.
   */
  async getRegionEvents(
    slug: string,
    query: {
      city?: string;
      category?: string;
      page?: number;
      limit?: number;
      sort?: string;
    },
  ) {
    const { city, category, page = 1, limit = 20, sort } = query;

    // Загрузить регион и его города
    const region = await this.prisma.region.findUnique({
      where: { slug },
      include: { cities: { include: { city: { select: { id: true, slug: true } } } } },
    });

    if (!region || !region.isActive) {
      throw new NotFoundException(`Регион "${slug}" не найден`);
    }

    let cityIds = region.cities.map((rc) => rc.cityId);

    // Если передан фильтр по городу (slug) — только его события
    if (city) {
      const matchCity = region.cities.find((rc) => rc.city.slug === city);
      if (matchCity) {
        cityIds = [matchCity.cityId];
      }
    }

    const where: Prisma.EventWhereInput = {
      ...this.activeEventFilter,
      cityId: { in: cityIds },
      ...(category && { category: category as EventCategory }),
    };

    const orderBy = this.getSort(sort);

    const [rawItems, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          city: { select: { slug: true, name: true } },
          tags: { include: { tag: true } },
          sessions: {
            where: { isActive: true, startsAt: { gte: new Date() } },
            orderBy: { startsAt: 'asc' },
            take: 1,
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    const items = this.moveNoPhotoToEnd(rawItems);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** События без фото — в конец списка */
  private moveNoPhotoToEnd<T extends { imageUrl?: string | null }>(items: T[]): T[] {
    const withPhoto: T[] = [];
    const withoutPhoto: T[] = [];
    for (const e of items) {
      if (e.imageUrl?.trim()) withPhoto.push(e);
      else withoutPhoto.push(e);
    }
    return [...withPhoto, ...withoutPhoto];
  }

  private getSort(sort?: string): Prisma.EventOrderByWithRelationInput {
    switch (sort) {
      case 'price_asc': return { priceFrom: 'asc' };
      case 'price_desc': return { priceFrom: 'desc' };
      case 'rating': return { rating: 'desc' };
      default: return { rating: 'desc' };
    }
  }
}
