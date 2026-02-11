import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService, CACHE_TTL } from '../cache/cache.service';
import { EventsQueryDto } from './dto/events-query.dto';
import { Prisma } from '@prisma/client';
import { EventOverrideService } from '../admin/event-override.service';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly overrideService: EventOverrideService,
  ) {}

  // --- Города ---

  async getCities(featured?: boolean) {
    const cacheKey = `cities:list:${featured ?? 'all'}`;

    return this.cache.getOrSet(cacheKey, CACHE_TTL.CITIES, async () => {
      const cities = await this.prisma.city.findMany({
        where: {
          isActive: true,
          ...(featured !== undefined && { isFeatured: featured }),
        },
        include: {
          _count: {
            select: {
              events: {
                where: {
                  isActive: true,
                  sessions: {
                    some: { isActive: true, startsAt: { gte: new Date() } },
                  },
                },
              },
            },
          },
          landingPages: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: { slug: true, title: true },
          },
        },
      });
      return cities.sort((a, b) => b._count.events - a._count.events);
    });
  }

  async getCityBySlug(slug: string) {
    const cacheKey = `cities:detail:${slug}`;
    return this.cache.getOrSet(cacheKey, CACHE_TTL.CITY_DETAIL, () => this.fetchCityBySlug(slug));
  }

  private async fetchCityBySlug(slug: string) {
    const city = await this.prisma.city.findUnique({
      where: { slug },
      include: {
        events: {
          where: {
            isActive: true,
            sessions: {
              some: { isActive: true, startsAt: { gte: new Date() } },
            },
          },
          orderBy: { rating: 'desc' },
          take: 20,
          include: {
            tags: { include: { tag: true } },
            sessions: {
              where: { isActive: true, startsAt: { gte: new Date() } },
              orderBy: { startsAt: 'asc' },
              take: 1,
            },
          },
        },
        landingPages: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: { slug: true, title: true, subtitle: true },
        },
      },
    });

    if (!city) throw new NotFoundException(`Город "${slug}" не найден`);

    // Статистика по категориям (только события с будущими сеансами)
    const hasFutureSessions = {
      sessions: { some: { isActive: true, startsAt: { gte: new Date() } } },
    };
    const [excursionCount, museumCount, eventCount, totalCount] =
      await Promise.all([
        this.prisma.event.count({
          where: { cityId: city.id, isActive: true, category: 'EXCURSION', ...hasFutureSessions },
        }),
        this.prisma.event.count({
          where: { cityId: city.id, isActive: true, category: 'MUSEUM', ...hasFutureSessions },
        }),
        this.prisma.event.count({
          where: { cityId: city.id, isActive: true, category: 'EVENT', ...hasFutureSessions },
        }),
        this.prisma.event.count({
          where: { cityId: city.id, isActive: true, ...hasFutureSessions },
        }),
      ]);

    // Популярные теги в городе
    const popularTags = await this.prisma.tag.findMany({
      where: {
        isActive: true,
        events: {
          some: { event: { cityId: city.id, isActive: true } },
        },
      },
      include: {
        _count: {
          select: {
            events: { where: { event: { cityId: city.id, isActive: true } } },
          },
        },
      },
      orderBy: { name: 'asc' },
      take: 12,
    });

    // Сортируем теги по количеству событий
    const sortedTags = popularTags.sort(
      (a, b) => b._count.events - a._count.events,
    );

    return {
      ...city,
      stats: { excursionCount, museumCount, eventCount, totalCount },
      popularTags: sortedTags,
    };
  }

  // --- События ---

  async getEvents(query: EventsQueryDto) {
    const { city, category, subcategory, tag, dateFrom, dateTo, sort, page = 1, limit = 20 } = query;

    const where: Prisma.EventWhereInput = {
      isActive: true,
      // Только события из активных городов
      city: {
        isActive: true,
        ...(city && { slug: city }),
      },
      // Показываем только события с будущими активными сеансами
      sessions: {
        some: {
          isActive: true,
          startsAt: {
            gte: dateFrom ? new Date(dateFrom) : new Date(),
            ...(dateTo && { lte: new Date(dateTo) }),
          },
        },
      },
      ...(category && { category }),
      ...(subcategory && { subcategory }),
      ...(tag && { tags: { some: { tag: { slug: tag } } } }),
    };

    const orderBy = this.getEventsSort(sort);

    const [rawItems, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          city: { select: { slug: true, name: true } },
          tags: { include: { tag: true } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    // Применяем overrides (мерж данных, фильтрация скрытых)
    const items = await this.overrideService.applyOverrides(rawItems);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getEventBySlug(slug: string) {
    const cacheKey = `events:detail:${slug}`;
    return this.cache.getOrSet(cacheKey, CACHE_TTL.EVENT_DETAIL, () => this.fetchEventBySlug(slug));
  }

  private async fetchEventBySlug(slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      include: {
        city: true,
        sessions: {
          where: { isActive: true, startsAt: { gte: new Date() } },
          orderBy: { startsAt: 'asc' },
          take: 20,
        },
        tags: { include: { tag: true } },
      },
    });

    if (!event) throw new NotFoundException(`Событие "${slug}" не найдено`);

    // Похожие события (тот же город + категория, только с будущими сеансами)
    const relatedEvents = await this.prisma.event.findMany({
      where: {
        cityId: event.cityId,
        category: event.category,
        isActive: true,
        id: { not: event.id },
        sessions: {
          some: { isActive: true, startsAt: { gte: new Date() } },
        },
      },
      orderBy: { rating: 'desc' },
      take: 6,
    });

    return { ...event, relatedEvents };
  }

  // --- Теги ---

  async getTags(category?: string) {
    return this.prisma.tag.findMany({
      where: {
        isActive: true,
        ...(category && { category: category as any }),
      },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { events: true } },
      },
    });
  }

  async getTagBySlug(slug: string, city?: string, page?: number | string) {
    const tag = await this.prisma.tag.findUnique({
      where: { slug },
    });

    if (!tag) throw new NotFoundException(`Тег "${slug}" не найден`);

    const limit = 20;
    const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const where: Prisma.EventWhereInput = {
      isActive: true,
      tags: { some: { tagId: tag.id } },
      ...(city && { city: { slug: city } }),
    };

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: { rating: 'desc' },
        skip: (pageNum - 1) * limit,
        take: limit,
        include: {
          city: { select: { slug: true, name: true } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return { tag, events, total, page: pageNum, totalPages: Math.ceil(total / limit) };
  }

  // --- Поиск ---

  async search(q: string, city?: string) {
    const cacheKey = `search:${q}:${city || 'all'}`;
    return this.cache.getOrSet(cacheKey, CACHE_TTL.SEARCH, () => this.fetchSearch(q, city));
  }

  private async fetchSearch(q: string, city?: string) {
    const where: Prisma.EventWhereInput = {
      isActive: true,
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
      ...(city && { city: { slug: city } }),
    };

    const events = await this.prisma.event.findMany({
      where,
      take: 20,
      include: { city: { select: { slug: true, name: true } } },
    });

    const cities = await this.prisma.city.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 5,
    });

    return { events, cities };
  }

  // --- Helpers ---

  private getEventsSort(sort?: string): Prisma.EventOrderByWithRelationInput {
    switch (sort) {
      case 'price_asc':
        return { priceFrom: 'asc' };
      case 'price_desc':
        return { priceFrom: 'desc' };
      case 'rating':
        return { rating: 'desc' };
      case 'popular':
      default:
        return { reviewCount: 'desc' };
    }
  }
}
