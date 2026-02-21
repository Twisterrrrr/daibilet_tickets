import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService, CACHE_TTL, cacheKeys } from '../cache/cache.service';
import { Prisma, DateMode, EventSubcategory } from '@prisma/client';

@Injectable()
export class CollectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Список активных подборок (опционально фильтр по городу).
   */
  async getCollections(citySlug?: string) {
    const cacheKey = cacheKeys.collections.list(citySlug);
    return this.cache.getOrSet(cacheKey, CACHE_TTL.CITIES, async () => {
      const where: Prisma.CollectionWhereInput = {
        isActive: true,
        isDeleted: false,
        ...(citySlug && { city: { slug: citySlug } }),
      };

      const collections = await this.prisma.collection.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          city: { select: { id: true, slug: true, name: true } },
        },
      });

      // Для каждой подборки — количество подходящих событий
      const result = await Promise.all(
        collections.map(async (c) => {
          const eventWhere = this.buildEventFilter(c);
          const eventCount = await this.prisma.event.count({ where: eventWhere });
          return {
            id: c.id,
            slug: c.slug,
            title: c.title,
            subtitle: c.subtitle,
            heroImage: c.heroImage,
            city: c.city,
            eventCount,
          };
        }),
      );

      return result;
    });
  }

  /**
   * Подборка по slug + события (с пагинацией).
   */
  async getBySlug(slug: string, page = 1, limit = 20) {
    const cacheKey = cacheKeys.collections.detail(slug, page, limit);
    return this.cache.getOrSet(cacheKey, CACHE_TTL.EVENT_DETAIL, async () => {
      const collection = await this.prisma.collection.findFirst({
        where: { slug, isActive: true, isDeleted: false },
        include: {
          city: { select: { id: true, slug: true, name: true } },
        },
      });

      if (!collection) {
        throw new NotFoundException(`Подборка "${slug}" не найдена`);
      }

      // 1) Закреплённые события (pinned) — отдельный запрос
      let pinnedEvents: any[] = [];
      if (collection.pinnedEventIds.length > 0) {
        pinnedEvents = await this.prisma.event.findMany({
          where: {
            id: { in: collection.pinnedEventIds },
            isActive: true,
            isDeleted: false,
          },
          include: {
            city: { select: { slug: true, name: true } },
            tags: { include: { tag: true } },
            offers: {
              where: { status: 'ACTIVE', isDeleted: false },
              orderBy: [{ isPrimary: 'desc' }, { priority: 'desc' }],
              select: {
                id: true, source: true, purchaseType: true,
                priceFrom: true, isPrimary: true, deeplink: true,
              },
            },
            sessions: {
              where: { isActive: true, startsAt: { gte: new Date() } },
              orderBy: { startsAt: 'asc' },
              take: 3,
              select: { startsAt: true, availableTickets: true },
            },
          },
        });
        // Сохранить порядок pinnedEventIds
        const orderMap = new Map(collection.pinnedEventIds.map((id, i) => [id, i]));
        pinnedEvents.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
      }

      // 2) Фильтрованные события
      const eventWhere = this.buildEventFilter(collection);
      // Исключаем уже отображённые pinned-события
      const pinnedIds = new Set(pinnedEvents.map((e) => e.id));

      const skip = (page - 1) * limit;
      // На первой странице вычитаем слоты для pinned
      const adjustedLimit = page === 1 ? Math.max(1, limit - pinnedEvents.length) : limit;
      const adjustedSkip = page === 1 ? 0 : skip - pinnedEvents.length;

      const [filteredEvents, filteredTotal] = await Promise.all([
        this.prisma.event.findMany({
          where: {
            ...eventWhere,
            id: { notIn: [...(collection.excludedEventIds || []), ...Array.from(pinnedIds)] },
          },
          orderBy: { rating: 'desc' },
          skip: Math.max(0, adjustedSkip),
          take: adjustedLimit,
          include: {
            city: { select: { slug: true, name: true } },
            tags: { include: { tag: true } },
            offers: {
              where: { status: 'ACTIVE', isDeleted: false },
              orderBy: [{ isPrimary: 'desc' }, { priority: 'desc' }],
              select: {
                id: true, source: true, purchaseType: true,
                priceFrom: true, isPrimary: true, deeplink: true,
              },
            },
            sessions: {
              where: { isActive: true, startsAt: { gte: new Date() } },
              orderBy: { startsAt: 'asc' },
              take: 3,
              select: { startsAt: true, availableTickets: true },
            },
          },
        }),
        this.prisma.event.count({
          where: {
            ...eventWhere,
            id: { notIn: [...(collection.excludedEventIds || []), ...Array.from(pinnedIds)] },
          },
        }),
      ]);

      // Объединяем: pinned first (только на первой странице), затем filtered
      const events = page === 1
        ? [...pinnedEvents, ...filteredEvents]
        : filteredEvents;

      const total = filteredTotal + pinnedEvents.length;

      // Обогащаем события (primary offer, tags)
      const enrichedEvents = events.map((event) => {
        const offers = event.offers || [];
        const primaryOffer = offers.length > 0 ? offers[0] : null;
        const sessions = event.sessions || [];
        const nextSessionAt = sessions.length > 0 ? sessions[0].startsAt : null;
        const tags = (event.tags || []).map((t: any) => t.tag);
        const isPinned = pinnedIds.has(event.id);

        return {
          id: event.id,
          slug: event.slug,
          title: event.title,
          imageUrl: event.imageUrl,
          category: event.category,
          priceFrom: event.priceFrom,
          rating: event.rating,
          reviewCount: event.reviewCount,
          durationMinutes: event.durationMinutes,
          city: event.city,
          primaryOffer,
          nextSessionAt,
          tags,
          isPinned,
          // Убираем лишние поля
          sessions: undefined,
          offers: undefined,
        };
      });

      // Похожие подборки (тот же город или кросс-городские)
      const relatedCollections = await this.prisma.collection.findMany({
        where: {
          isActive: true,
          isDeleted: false,
          id: { not: collection.id },
          OR: [
            ...(collection.cityId ? [{ cityId: collection.cityId }] : []),
            { cityId: null },
          ],
        },
        orderBy: { sortOrder: 'asc' },
        take: 4,
        select: { slug: true, title: true, subtitle: true, heroImage: true },
      });

      return {
        collection: {
          id: collection.id,
          slug: collection.slug,
          title: collection.title,
          subtitle: collection.subtitle,
          heroImage: collection.heroImage,
          description: collection.description,
          infoBlocks: collection.infoBlocks,
          faq: collection.faq,
          metaTitle: collection.metaTitle,
          metaDescription: collection.metaDescription,
          city: collection.city,
        },
        events: enrichedEvents,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        relatedCollections,
      };
    });
  }

  /**
   * Построить Prisma where-фильтр из полей подборки.
   * Переиспользует логику, аналогичную CatalogService.getEvents.
   */
  private buildEventFilter(collection: {
    cityId: string | null;
    filterTags: string[];
    filterCategory: string | null;
    filterSubcategory: string | null;
    filterAudience: string | null;
    excludedEventIds: string[];
    additionalFilters: any;
  }): Prisma.EventWhereInput {
    // Базовый фильтр: активные, не удалённые, не дубли
    const where: Prisma.EventWhereInput = {
      isActive: true,
      isDeleted: false,
      canonicalOfId: null,
      // Активные: SCHEDULED с будущими сеансами ИЛИ OPEN_DATE (не истёк)
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

    // Фильтр по городу
    if (collection.cityId) {
      where.cityId = collection.cityId;
    }

    // Фильтр по тегам (OR-логика)
    if (collection.filterTags && collection.filterTags.length > 0) {
      where.tags = {
        some: { tag: { slug: { in: collection.filterTags } } },
      };
    }

    // Фильтр по категории
    if (collection.filterCategory) {
      where.category = collection.filterCategory as any;
    }

    // Фильтр по подкатегории
    if (collection.filterSubcategory) {
      where.subcategories = { has: collection.filterSubcategory as EventSubcategory };
    }

    // Фильтр по аудитории
    if (collection.filterAudience) {
      if (collection.filterAudience === 'KIDS') {
        where.audience = { in: ['KIDS', 'FAMILY'] as any };
      } else {
        where.audience = collection.filterAudience as any;
      }
    }

    // Дополнительные фильтры из JSON
    const additional = collection.additionalFilters as any;
    if (additional) {
      // Мульти-городской фильтр (slug-и городов)
      if (Array.isArray(additional.citySlugs) && additional.citySlugs.length > 0) {
        where.city = { slug: { in: additional.citySlugs }, isActive: true };
      }
      if (additional.maxDuration) {
        where.durationMinutes = { ...(where.durationMinutes as any || {}), lte: additional.maxDuration };
      }
      if (additional.minDuration) {
        where.durationMinutes = { ...(where.durationMinutes as any || {}), gte: additional.minDuration };
      }
      if (additional.dateMode) {
        // Переопределяем OR-фильтр на конкретный dateMode
        delete where.OR;
        if (additional.dateMode === 'OPEN_DATE') {
          where.dateMode = DateMode.OPEN_DATE;
        } else {
          where.dateMode = DateMode.SCHEDULED;
          where.sessions = { some: { isActive: true, startsAt: { gte: new Date() } } };
        }
      }
    }

    // Исключённые события
    if (collection.excludedEventIds && collection.excludedEventIds.length > 0) {
      where.id = { notIn: collection.excludedEventIds };
    }

    return where;
  }
}
