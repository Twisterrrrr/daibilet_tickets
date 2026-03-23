import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CACHE_TTL, cacheKeys, CacheService } from '../cache/cache.service';
import { CollectionSelectionService } from '../catalog/collection-selection.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CollectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly selectionService: CollectionSelectionService,
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
          const eventWhere = this.selectionService.buildWhere({
            cityId: c.cityId,
            filterTags: c.filterTags,
            filterCategory: c.filterCategory,
            filterSubcategory: c.filterSubcategory,
            filterAudience: c.filterAudience,
            additionalFilters: c.additionalFilters,
          });
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
   * Для кросс-городской (cityId = null): опционально ?city сужает выдачу по городу.
   * При неизвестном city — 400.
   */
  async getBySlug(slug: string, page = 1, limit = 20, citySlug?: string) {
    const cacheKey = cacheKeys.collections.detail(slug, page, limit, citySlug);
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

      // Для кросс-городской: citySlug из query сужает выдачу; неизвестный город → 400
      let cityOverrideSlug: string | undefined;
      if (collection.cityId === null && citySlug) {
        const city = await this.prisma.city.findFirst({
          where: { slug: citySlug, isActive: true },
          select: { id: true },
        });
        if (!city) {
          throw new BadRequestException(`Город "${citySlug}" не найден`);
        }
        cityOverrideSlug = citySlug;
      }

      // 1) Закреплённые события (pinned) — отдельный запрос
      let pinnedEvents: Awaited<ReturnType<typeof this.prisma.event.findMany>> = [];
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
                id: true,
                source: true,
                purchaseType: true,
                priceFrom: true,
                isPrimary: true,
                deeplink: true,
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

      const resolved = await this.selectionService.resolveSelection({
        cityId: collection.cityId,
        citySlug: cityOverrideSlug,
        filterTags: collection.filterTags,
        filterCategory: collection.filterCategory,
        filterSubcategory: collection.filterSubcategory,
        filterAudience: collection.filterAudience,
        additionalFilters: collection.additionalFilters,
        ranking: (collection.rankingJson as { preset?: 'balanced' | 'availability' | 'popularity' } | null) ?? {
          preset: 'balanced',
        },
        pinnedEventIds: collection.pinnedEventIds,
        excludedEventIds: collection.excludedEventIds,
        page,
        limit,
      });

      const events = resolved.items;
      const total = resolved.total;

      const enrichedEvents = events.map((event) => {
        const ev = event as unknown as { id: string; offers?: unknown[]; sessions?: { startsAt: Date }[]; tags?: { tag: unknown }[]; city?: unknown; slug: string; title: string; imageUrl?: string | null; category: string; priceFrom?: number | null; rating?: number; reviewCount: number; durationMinutes?: number | null };
        const offers = ev.offers ?? [];
        const primaryOffer = offers.length > 0 ? offers[0] : null;
        const sessions = ev.sessions ?? [];
        const nextSessionAt = sessions.length > 0 ? sessions[0].startsAt : null;
        const tags = (ev.tags ?? []).map((t) => t.tag);
        const isPinned = collection.pinnedEventIds.includes(ev.id);

        return {
          id: ev.id,
          slug: ev.slug,
          title: ev.title,
          imageUrl: ev.imageUrl,
          category: ev.category,
          priceFrom: ev.priceFrom,
          rating: ev.rating,
          reviewCount: ev.reviewCount,
          durationMinutes: ev.durationMinutes,
          city: ev.city,
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
          OR: [...(collection.cityId ? [{ cityId: collection.cityId }] : []), { cityId: null }],
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

  async getByCityAndSlug(citySlug: string, slug: string, page = 1, limit = 20) {
    const item = await this.prisma.collection.findFirst({
      where: { slug, city: { slug: citySlug }, isDeleted: false, isActive: true },
    });
    if (!item) throw new NotFoundException(`Подборка "${slug}" не найдена`);
    return this.getBySlug(slug, page, limit, citySlug);
  }
}
