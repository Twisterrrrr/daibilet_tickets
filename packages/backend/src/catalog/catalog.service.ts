import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService, CACHE_TTL } from '../cache/cache.service';
import { EventsQueryDto } from './dto/events-query.dto';
import { Prisma, DateMode, EventSubcategory, TagCategory } from '@prisma/client';
import { EventOverrideService } from '../admin/event-override.service';
import { RegionService } from './region.service';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly overrideService: EventOverrideService,
    private readonly regionService: RegionService,
  ) {}

  // --- Города ---

  async getCities(featured?: boolean) {
    const cacheKey = `cities:list:${featured ?? 'all'}`;

    return this.cache.getOrSet(cacheKey, CACHE_TTL.CITIES, async () => {
      // ID городов, которые являются не-хабовыми членами регионов
      // (они отображаются внутри карточки хаб-города в блоке «Также в регионе»)
      const regionMembers = await this.prisma.$queryRaw<{ cityId: string }[]>`
        SELECT rc."cityId"
        FROM region_cities rc
        JOIN regions r ON rc."regionId" = r.id
        WHERE r."isActive" = true
          AND rc."cityId" != r."hubCityId"
      `;
      const hiddenCityIds = new Set(regionMembers.map((r) => r.cityId));

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
                  isDeleted: false,
                  OR: [
                    { dateMode: DateMode.SCHEDULED, sessions: { some: { isActive: true, startsAt: { gte: new Date() } } } },
                    { dateMode: DateMode.OPEN_DATE, OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
                  ],
                },
              },
              venues: {
                where: { isActive: true },
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

      // Количество событий в не-хабовых городах каждого региона (один запрос)
      const regionStats = await this.prisma.$queryRaw<
        { slug: string; name: string; hubCityId: string; event_count: bigint }[]
      >`
        SELECT r.slug, r.name, r."hubCityId", COUNT(DISTINCT e.id) as event_count
        FROM regions r
        JOIN region_cities rc ON rc."regionId" = r.id AND rc."cityId" != r."hubCityId"
        JOIN events e ON e."cityId" = rc."cityId" AND e."isActive" = true
          AND (
            (e."dateMode" = 'SCHEDULED' AND EXISTS(
              SELECT 1 FROM event_sessions s
              WHERE s."eventId" = e.id AND s."isActive" = true AND s."startsAt" > NOW()
            ))
            OR
            (e."dateMode" = 'OPEN_DATE' AND (e."endDate" IS NULL OR e."endDate" > NOW()))
          )
        WHERE r."isActive" = true
        GROUP BY r.id
      `;
      const regionByHub = new Map(
        regionStats.map((r) => [r.hubCityId, { slug: r.slug, name: r.name, eventCount: Number(r.event_count) }]),
      );

      return cities
        // Скрываем не-хабовые областные города и города без событий
        .filter((c) => !hiddenCityIds.has(c.id) && c._count.events > 0)
        .sort((a, b) => b._count.events - a._count.events)
        .map((c) => ({
          ...c,
          region: regionByHub.get(c.id) ?? null,
        }));
    });
  }

  async getCityBySlug(slug: string) {
    const cacheKey = `cities:detail:${slug}`;
    return this.cache.getOrSet(cacheKey, CACHE_TTL.CITY_DETAIL, () => this.fetchCityBySlug(slug));
  }

  private async fetchCityBySlug(slug: string) {
    // Активные события: SCHEDULED с будущими сеансами ИЛИ OPEN_DATE (без endDate или не истёк)
    const activeEventFilter: Prisma.EventWhereInput = {
      isActive: true,
      isDeleted: false,
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

    const city = await this.prisma.city.findUnique({
      where: { slug },
      include: {
        events: {
          where: activeEventFilter,
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

    // Статистика по категориям (с поддержкой OPEN_DATE)
    const hasFutureSessions: Prisma.EventWhereInput = {
      OR: [
        { dateMode: DateMode.SCHEDULED, sessions: { some: { isActive: true, startsAt: { gte: new Date() } } } },
        { dateMode: DateMode.OPEN_DATE, OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
      ],
    };
    const [excursionCount, museumCount, eventCount, totalCount] =
      await Promise.all([
        this.prisma.event.count({
          where: { cityId: city.id, isActive: true, isDeleted: false, category: 'EXCURSION', ...hasFutureSessions },
        }),
        this.prisma.event.count({
          where: { cityId: city.id, isActive: true, isDeleted: false, category: 'MUSEUM', ...hasFutureSessions },
        }),
        this.prisma.event.count({
          where: { cityId: city.id, isActive: true, isDeleted: false, category: 'EVENT', ...hasFutureSessions },
        }),
        this.prisma.event.count({
          where: { cityId: city.id, isActive: true, isDeleted: false, ...hasFutureSessions },
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

    // Превью событий региона (если город — хаб)
    const regionPreview = await this.regionService.getRegionPreviewByHubCity(city.id);

    return {
      ...city,
      stats: { excursionCount, museumCount, eventCount, totalCount },
      popularTags: sortedTags,
      regionPreview,
    };
  }

  // --- События ---

  async getEvents(query: EventsQueryDto) {
    const { city, category, subcategory, audience, tag, dateFrom, dateTo, sort, timeOfDay, pier, maxDuration, minDuration, maxMinAge, dateMode, venueId, page = 1, limit = 20 } = query;

    // --- Фильтр сеансов: OPEN_DATE не требуют sessions ---
    // dateMode=OPEN_DATE → нет сеансов, показываем если isActive и не истёк endDate
    // dateMode=SCHEDULED (или без фильтра) → обычный фильтр по sessions
    const isOpenDateOnly = dateMode === 'OPEN_DATE';

    const sessionFilter: Prisma.EventWhereInput = isOpenDateOnly
      ? {
          // OPEN_DATE: нет сеансов, но проверяем что не истёк endDate (если задан)
          dateMode: DateMode.OPEN_DATE,
          OR: [
            { endDate: null },                            // вечная экспозиция
            { endDate: { gte: new Date() } },             // ещё не закончилась
          ],
        }
      : dateMode
        ? {
            // Явный SCHEDULED — только с будущими сеансами
            dateMode: DateMode.SCHEDULED,
            sessions: {
              some: {
                isActive: true,
                startsAt: {
                  ...(sort === 'departing_soon'
                    ? { gte: new Date(), lte: new Date(Date.now() + 2 * 60 * 60 * 1000) }
                    : { gte: dateFrom ? new Date(dateFrom) : new Date(), ...(dateTo && { lte: new Date(dateTo) }) }),
                },
              },
            },
          }
        : {
            // Без фильтра dateMode — показываем ОБА: SCHEDULED с сеансами ИЛИ OPEN_DATE
            OR: [
              {
                dateMode: DateMode.SCHEDULED,
                sessions: {
                  some: {
                    isActive: true,
                    startsAt: {
                      ...(sort === 'departing_soon'
                        ? { gte: new Date(), lte: new Date(Date.now() + 2 * 60 * 60 * 1000) }
                        : { gte: dateFrom ? new Date(dateFrom) : new Date(), ...(dateTo && { lte: new Date(dateTo) }) }),
                    },
                  },
                },
              },
              {
                dateMode: DateMode.OPEN_DATE,
                OR: [
                  { endDate: null },
                  { endDate: { gte: new Date() } },
                ],
              },
            ],
          };

    const where: Prisma.EventWhereInput = {
      isActive: true,
      isDeleted: false,
      canonicalOfId: null, // Не показывать дубли (помеченные как дубликат)
      // Только события из активных городов
      city: {
        isActive: true,
        ...(city && { slug: city }),
      },
      // Фильтр сеансов с поддержкой OPEN_DATE
      ...sessionFilter,
      ...(category && { category }),
      ...(subcategory && { subcategories: { has: subcategory as EventSubcategory } }),
      ...(audience === 'KIDS' ? { audience: { in: ['KIDS', 'FAMILY'] } } : audience ? { audience } : {}),
      ...(tag && { tags: { some: { tag: { slug: tag } } } }),
      ...(pier && { startLocationId: pier }),
      ...(maxDuration || minDuration ? {
        durationMinutes: {
          ...(maxDuration && { lte: maxDuration }),
          ...(minDuration && { gte: minDuration }),
        },
      } : {}),
      ...(maxMinAge !== undefined && maxMinAge !== null ? { minAge: { lte: maxMinAge } } : {}),
      ...(venueId && { venueId }),
    };

    // Time of day filter: restrict events to those with sessions in the given MSK hour range.
    // startsAt stored as timestamp(3) WITHOUT timezone in UTC.
    // Moscow = UTC+3 always (no DST). Instead of heavy AT TIME ZONE conversion in SQL,
    // we pre-compute UTC hour ranges from MSK ranges on the app side.
    if (timeOfDay) {
      // MSK hour ranges → convert to UTC by subtracting 3
      const mskRanges: Record<string, [number, number]> = {
        morning: [6, 10],    // UTC 3–7
        day: [10, 17],       // UTC 7–14
        evening: [17, 22],   // UTC 14–19
        night: [22, 6],      // UTC 19–3
      };
      const mskRange = mskRanges[timeOfDay];
      if (mskRange) {
        const utcStart = (mskRange[0] - 3 + 24) % 24;
        const utcEnd = (mskRange[1] - 3 + 24) % 24;
        const dateStart = dateFrom ? new Date(dateFrom) : new Date();
        const dateEnd = dateTo ? new Date(dateTo) : null;

        let timeEventIds: { eventId: string }[];
        if (utcStart < utcEnd) {
          timeEventIds = dateEnd
            ? await this.prisma.$queryRaw`
                SELECT DISTINCT "eventId" FROM "event_sessions"
                WHERE "isActive" = true
                  AND "startsAt" >= ${dateStart} AND "startsAt" <= ${dateEnd}
                  AND EXTRACT(HOUR FROM "startsAt") >= ${utcStart}
                  AND EXTRACT(HOUR FROM "startsAt") < ${utcEnd}
              `
            : await this.prisma.$queryRaw`
                SELECT DISTINCT "eventId" FROM "event_sessions"
                WHERE "isActive" = true
                  AND "startsAt" > NOW()
                  AND EXTRACT(HOUR FROM "startsAt") >= ${utcStart}
                  AND EXTRACT(HOUR FROM "startsAt") < ${utcEnd}
              `;
        } else {
          // Wraps around midnight in UTC (e.g. night: UTC 19–3)
          timeEventIds = dateEnd
            ? await this.prisma.$queryRaw`
                SELECT DISTINCT "eventId" FROM "event_sessions"
                WHERE "isActive" = true
                  AND "startsAt" >= ${dateStart} AND "startsAt" <= ${dateEnd}
                  AND (EXTRACT(HOUR FROM "startsAt") >= ${utcStart}
                       OR EXTRACT(HOUR FROM "startsAt") < ${utcEnd})
              `
            : await this.prisma.$queryRaw`
                SELECT DISTINCT "eventId" FROM "event_sessions"
                WHERE "isActive" = true
                  AND "startsAt" > NOW()
                  AND (EXTRACT(HOUR FROM "startsAt") >= ${utcStart}
                       OR EXTRACT(HOUR FROM "startsAt") < ${utcEnd})
              `;
        }
        const ids = timeEventIds.map((r) => r.eventId);
        if (ids.length > 0) {
          where.id = { in: ids };
        } else {
          return { items: [], total: 0, page, totalPages: 0 };
        }
      }
    }

    const orderBy = this.getEventsSort(sort);
    const isDepartingSoon = sort === 'departing_soon';

    // Для departing_soon: Prisma не поддерживает orderBy по min(sessions.startsAt),
    // поэтому загружаем все подходящие (макс. 500), сортируем в памяти, затем пагинируем
    const maxTake = isDepartingSoon ? 500 : limit;
    const skip = isDepartingSoon ? 0 : (page - 1) * limit;

    const [rawItems, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy,
        skip,
        take: maxTake,
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
              externalEventId: true,
              metaEventId: true,
              deeplink: true,
              priceFrom: true,
              isPrimary: true,
            },
          },
          sessions: {
            where: { isActive: true, startsAt: { gte: new Date() } },
            orderBy: { startsAt: 'asc' },
            take: 5,
            select: { startsAt: true, availableTickets: true },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    // Применяем overrides (мерж данных, фильтрация скрытых)
    const overridden = await this.overrideService.applyOverrides(rawItems);

    // Вычисляем смарт-бейджи: ближайший сеанс, свободные места, optimal score
    let items = this.enrichWithBadges(overridden);

    if (isDepartingSoon && items.length > 0) {
      items = items
        .sort((a, b) => {
          const aAt = a.nextSessionAt ? new Date(a.nextSessionAt).getTime() : Infinity;
          const bAt = b.nextSessionAt ? new Date(b.nextSessionAt).getTime() : Infinity;
          return aAt - bAt;
        })
        .slice((page - 1) * limit, page * limit);
    }

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
    const event = await this.prisma.event.findFirst({
      where: { slug, isDeleted: false },
      include: {
        city: true,
        venue: { select: { id: true, slug: true, title: true, shortTitle: true, venueType: true } },
        sessions: {
          where: { isActive: true, startsAt: { gte: new Date() } },
          orderBy: { startsAt: 'asc' },
          take: 20,
        },
        offers: {
          where: { status: 'ACTIVE', isDeleted: false },
          orderBy: [{ isPrimary: 'desc' }, { priority: 'desc' }],
          include: {
            sessions: {
              where: { isActive: true, startsAt: { gte: new Date() } },
              orderBy: { startsAt: 'asc' },
              take: 20,
            },
          },
        },
        tags: { include: { tag: true } },
      },
    });

    if (!event) throw new NotFoundException(`Событие "${slug}" не найдено`);

    // Primary offer для удобства фронтенда
    const primaryOffer = event.offers.length > 0 ? event.offers[0] : null;

    // Похожие события (тот же город + категория, только с будущими сеансами)
    const relatedEvents = await this.prisma.event.findMany({
      where: {
        cityId: event.cityId,
        category: event.category,
        isActive: true,
        isDeleted: false,
        canonicalOfId: null,
        id: { not: event.id },
        sessions: {
          some: { isActive: true, startsAt: { gte: new Date() } },
        },
      },
      orderBy: { rating: 'desc' },
      take: 6,
    });

    return { ...event, primaryOffer, relatedEvents };
  }

  // --- Теги ---

  async getTags(category?: string) {
    return this.prisma.tag.findMany({
      where: {
        isActive: true,
        ...(category && { category: category as TagCategory }),
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
      isDeleted: false,
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
      isDeleted: false,
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
      case 'departing_soon':
        // Prisma relation orderBy doesn't support _min; we sort in memory in getEvents
        return { rating: 'desc' };
      case 'popular':
      default:
        return { reviewCount: 'desc' };
    }
  }

  /**
   * Обогатить события смарт-бейджами:
   * - nextSessionAt: дата ближайшего сеанса
   * - totalAvailableTickets: сумма свободных мест по ближайшим сеансам
   * - isOptimalChoice: лучшее событие по scoring-алгоритму
   *
   * Scoring: rating 40% + price-efficiency 30% + occupancy 30%
   */
  private enrichWithBadges(events: any[]): any[] {
    if (events.length === 0) return events;

    // Вычисляем метрики для каждого события
    const enriched = events.map((event) => {
      const sessions: { startsAt: Date; availableTickets: number }[] = event.sessions || [];
      const nextSessionAt = sessions.length > 0 ? sessions[0].startsAt : null;
      const now = new Date();
      const minutesUntilNext = nextSessionAt
        ? Math.round((new Date(nextSessionAt).getTime() - now.getTime()) / 60000)
        : null;
      const departingSoonMinutes = minutesUntilNext !== null && minutesUntilNext > 0 && minutesUntilNext <= 120
        ? minutesUntilNext
        : null;
      const totalAvailableTickets = sessions.reduce(
        (sum, s) => sum + (s.availableTickets || 0),
        0,
      );

      // Primary offer — первый из отсортированных (isPrimary desc, priority desc)
      const offers: any[] = event.offers || [];
      const primaryOffer = offers.length > 0 ? offers[0] : null;

      // Извлекаем slug-и тегов для бейджей на фронтенде
      const tags: { tag: { slug: string; name: string } }[] = event.tags || [];
      const tagSlugs: string[] = tags.map((t) => t.tag.slug);

      return {
        ...event,
        nextSessionAt,
        departingSoonMinutes,
        totalAvailableTickets,
        primaryOffer,
        offersCount: offers.length,
        tagSlugs,
        // sessions и offers — убираем из ответа каталога (детали — на странице события)
        sessions: undefined,
        offers: undefined,
      };
    });

    // Нормализация для scoring
    const prices = enriched
      .map((e) => e.priceFrom || 0)
      .filter((p) => p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 1;
    const priceRange = maxPrice - minPrice || 1;

    const tickets = enriched.map((e) => e.totalAvailableTickets);
    const maxTickets = Math.max(...tickets, 1);

    // Вычисляем score
    let bestIdx = -1;
    let bestScore = -1;

    for (let i = 0; i < enriched.length; i++) {
      const e = enriched[i];
      const rating = Number(e.rating) || 0;
      const price = e.priceFrom || 0;

      const ratingScore = (rating / 5) * 0.4;
      const priceScore = price > 0 ? ((maxPrice - price) / priceRange) * 0.3 : 0;
      const occupancyScore = (e.totalAvailableTickets / maxTickets) * 0.3;

      const score = ratingScore + priceScore + occupancyScore;

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    // Пометить лучшее событие
    return enriched.map((e, i) => ({
      ...e,
      isOptimalChoice: i === bestIdx && bestScore > 0.3,
    }));
  }
}
