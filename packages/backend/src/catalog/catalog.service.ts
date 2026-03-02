import { createHash } from 'crypto';
import { SUBCATEGORY_LABELS } from '@daibilet/shared';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DateMode, EventCategory, EventSubcategory, LocationType, Prisma, TagCategory } from '@prisma/client';

import { asCatalogEntityLite, asCityLite, toDateSafe } from '../common/typing';
import { EventOverrideService } from '../admin/event-override.service';
import { CACHE_TTL, cacheKeys, CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import { EventsQueryDto } from './dto/events-query.dto';
import { RegionService } from './region.service';
import { buildEventWhere, buildVenueWhere } from './where-builders';

/** Сократить адрес до улицы и номера: "Дворцовая наб., 18, Санкт-Петербург" → "Дворцовая наб., 18" */
function shortenAddressToStreet(addr: string | null | undefined): string {
  if (!addr || typeof addr !== 'string') return '';
  const parts = addr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length <= 2 ? addr.trim() : parts.slice(0, 2).join(', ');
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly overrideService: EventOverrideService,
    private readonly regionService: RegionService,
  ) {}

  private readonly logger = new Logger(CatalogService.name);

  // --- Города ---

  async getCities(featured?: boolean) {
    const cacheKey = cacheKeys.cities.list(featured ?? 'all');

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
                    {
                      dateMode: DateMode.SCHEDULED,
                      sessions: { some: { isActive: true, startsAt: { gte: new Date() } } },
                    },
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

      // Отфильтрованные города, которые реально отображаются в каталоге
      const visibleCities = cities.filter(
        (c) =>
          !hiddenCityIds.has(c.id) && c._count.events >= 2 && c.description != null && c.description.trim().length > 0,
      );

      // Счётчик «Музеи и арт» для списка городов:
      // museumCount = активные площадки (venues) + активные события с привязкой к площадке (venueId) в этом городе.
      let eventsAtVenuesByCity = new Map<string, number>();
      if (visibleCities.length > 0) {
        const cityIds = visibleCities.map((c) => c.id);

        const hasFutureSessions: Prisma.EventWhereInput = {
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

        const eventsAtVenues = await this.prisma.event.groupBy({
          by: ['cityId'],
          where: {
            cityId: { in: cityIds },
            isActive: true,
            isDeleted: false,
            venueId: { not: null },
            ...hasFutureSessions,
          },
          _count: { _all: true },
        });

        eventsAtVenuesByCity = new Map(
          eventsAtVenues.map((row: { cityId: string; _count: { _all: number | bigint } }) => [
          row.cityId,
          Number(row._count._all),
        ]),
        );
      }

      return visibleCities
        .sort((a, b) => b._count.events - a._count.events)
        .map((c) => {
          const eventsAtVenues = eventsAtVenuesByCity.get(c.id) ?? 0;
          const museumCount = (c._count.venues ?? 0) + eventsAtVenues;

          return {
            ...c,
            region: regionByHub.get(c.id) ?? null,
            museumCount,
          };
        });
    });
  }

  async getCityBySlug(slug: string) {
    const cacheKey = cacheKeys.cities.detail(slug);
    return this.cache.getOrSet(cacheKey, CACHE_TTL.CITY_DETAIL, () => this.fetchCityBySlug(slug));
  }

  // --- Локации (причалы, площадки, точки встречи) ---

  async getLocations(city?: string, type?: string) {
    const where: Prisma.LocationWhereInput = { isActive: true };
    if (city) {
      const c = await this.prisma.city.findUnique({ where: { slug: city }, select: { id: true } });
      if (!c) return [];
      where.cityId = c.id;
    }
    if (type && Object.values(LocationType).includes(type as LocationType)) {
      where.type = type as LocationType;
    }
    return this.prisma.location.findMany({
      where,
      orderBy: [{ title: 'asc' }],
      select: {
        id: true,
        type: true,
        title: true,
        shortTitle: true,
        address: true,
        lat: true,
        lng: true,
        metro: true,
        district: true,
        city: { select: { id: true, slug: true, name: true } },
      },
    });
  }

  async getNearestLocations(lat: number, lng: number, type?: string, limit = 10) {
    const where: Prisma.LocationWhereInput = { isActive: true, lat: { not: null }, lng: { not: null } };
    if (type && Object.values(LocationType).includes(type as LocationType)) {
      where.type = type as LocationType;
    }
    const list = await this.prisma.location.findMany({
      where,
      take: limit * 3,
      select: {
        id: true,
        type: true,
        title: true,
        shortTitle: true,
        address: true,
        lat: true,
        lng: true,
        metro: true,
        district: true,
        city: { select: { id: true, slug: true, name: true } },
      },
    });
    const withDist = list
      .filter((l) => l.lat != null && l.lng != null)
      .map((l) => ({
        ...l,
        _dist: (l.lat! - lat) ** 2 + (l.lng! - lng) ** 2,
      }))
      .sort((a, b) => a._dist - b._dist)
      .slice(0, limit);
    return withDist.map(({ _dist: _, ...r }) => r);
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

    // Статистика по категориям (с поддержкой OPEN_DATE).
    // Музеи и арт = площадки (venues) + события в них (events с venueId).
    const hasFutureSessions: Prisma.EventWhereInput = {
      OR: [
        { dateMode: DateMode.SCHEDULED, sessions: { some: { isActive: true, startsAt: { gte: new Date() } } } },
        { dateMode: DateMode.OPEN_DATE, OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
      ],
    };
    const [excursionCount, eventCount, totalCount, venueCount, eventsAtVenuesCount] = await Promise.all([
      this.prisma.event.count({
        where: { cityId: city.id, isActive: true, isDeleted: false, category: 'EXCURSION', ...hasFutureSessions },
      }),
      this.prisma.event.count({
        where: { cityId: city.id, isActive: true, isDeleted: false, category: 'EVENT', ...hasFutureSessions },
      }),
      this.prisma.event.count({
        where: { cityId: city.id, isActive: true, isDeleted: false, ...hasFutureSessions },
      }),
      this.prisma.venue.count({
        where: { cityId: city.id, isActive: true, isDeleted: false },
      }),
      this.prisma.event.count({
        where: {
          cityId: city.id,
          isActive: true,
          isDeleted: false,
          venueId: { not: null },
          ...hasFutureSessions,
        },
      }),
    ]);
    const museumCount = venueCount + eventsAtVenuesCount;

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
    const sortedTags = popularTags.sort((a, b) => b._count.events - a._count.events);

    // Превью событий региона (если город — хаб)
    const regionPreview = await this.regionService.getRegionPreviewByHubCity(city.id);

    return {
      ...city,
      stats: { excursionCount, museumCount, eventCount, totalCount },
      popularTags: sortedTags,
      regionPreview,
    };
  }

  // --- Unified Catalog (CatalogItem: Event | Venue) ---

  /**
   * GET /catalog — единый каталог.
   * category=MUSEUM → Venue + MUSEUM Events (оба как юниты)
   * category=EXCURSION | EVENT → Event
   */
  async getCatalog(query: CatalogQueryDto) {
    const { category, city, region, q, sort = 'popular', page = 1, limit = 20, qf } = query;

    if (category === 'MUSEUM') {
      return this.getCatalogMuseumAndVenues({ city, region, q, sort, page, limit, qf });
    }
    // EXCURSION | EVENT | пусто → Events
    const eventsDto: EventsQueryDto = {
      category: category === 'EXCURSION' || category === 'EVENT' ? category : undefined,
      city,
      sort: sort === 'departing_soon' ? 'departing_soon' : sort,
      page,
      limit,
    };
    const res = await this.getEvents(eventsDto);
    return {
      items: res.items.map((e) => this.eventToCatalogItem(e)),
      total: res.total,
      page: res.page,
      totalPages: res.totalPages,
    };
  }

  private eventToCatalogItem(e: Record<string, unknown>) {
    const d = toDateSafe(e.nextSessionAt);
    const nextSessionAt = d ? d.toISOString() : null;
    let dateLabel: string;
    if (e.dateMode === 'OPEN_DATE') {
      dateLabel = 'Открытая дата';
    } else if (nextSessionAt) {
      const d = new Date(nextSessionAt);
      dateLabel =
        d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) +
        ', ' +
        d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else {
      dateLabel = '';
    }
    return {
      type: 'event' as const,
      id: e.id,
      slug: e.slug,
      title: e.title,
      cityId: e.cityId,
      citySlug: asCityLite(e.city).slug,
      cityName: asCityLite(e.city).name,
      imageUrl: e.imageUrl,
      priceFrom: e.priceFrom,
      rating: Number(e.rating) || 0,
      badges: this.collectEventBadges(e),
      location:
        e.address || asCityLite(e.city).name
          ? { address: shortenAddressToStreet(String(e.address ?? '')), metro: null }
          : undefined,
      dateLabel,
      // event-only
      startsAt: nextSessionAt,
      durationMinutes: e.durationMinutes,
      category: e.category,
      // для EventCard
      ...e,
    };
  }

  private collectEventBadges(e: Record<string, unknown>): string[] {
    const badges: string[] = [];
    if (e.departingSoonMinutes) badges.push(`Через ${e.departingSoonMinutes} мин`);
    if (e.isOptimalChoice) badges.push('Лучший выбор');
    if (e.dateMode === 'OPEN_DATE') badges.push('Открытая дата');
    return badges;
  }

  /**
   * «Музеи и арт»: Venue + Events (category=MUSEUM), каждый как юнит.
   * qf: center | kids | short | modern | free — быстрые фильтры
   */
  private async getCatalogMuseumAndVenues(params: {
    city?: string;
    region?: string;
    q?: string;
    sort?: string;
    page: number;
    limit: number;
    qf?: string;
  }) {
    const { city, region, q, sort = 'popular', page, limit, qf } = params;

    // region: города региона (hub + members) — для областных музеев (Выборг, Пушкин и др.)
    let regionCityIds: string[] | undefined;
    if (region) {
      const r = await this.prisma.region.findUnique({
        where: { slug: region, isActive: true },
        include: { cities: { select: { cityId: true } } },
      });
      if (r) regionCityIds = r.cities.map((c) => c.cityId);
    }
    const FETCH_LIMIT = 500;

    // Маппинг qf → параметры getEvents
    const eventsDto: Partial<Parameters<typeof this.getEvents>[0]> = {
      category: 'MUSEUM',
      city: city || undefined,
      sort: sort === 'departing_soon' ? 'departing_soon' : sort,
      page: 1,
      limit: FETCH_LIMIT,
    };
    if (qf === 'kids') eventsDto.audience = 'KIDS' as const;
    if (qf === 'short') eventsDto.maxDuration = 60;
    if (qf === 'modern') eventsDto.subcategory = 'CONTEMPORARY' as const;
    if (qf === 'free') {
      eventsDto.priceMin = 0;
      eventsDto.priceMax = 0;
    }

    const venueWhere: Prisma.VenueWhereInput = {
      isActive: true,
      isDeleted: false,
      ...(regionCityIds?.length ? { cityId: { in: regionCityIds } } : city ? { city: { slug: city } } : {}),
      ...(q?.trim() && {
        OR: [
          { title: { contains: q.trim(), mode: 'insensitive' } },
          { shortTitle: { contains: q.trim(), mode: 'insensitive' } },
        ],
      }),
      ...(qf === 'center' && {
        OR: [
          { district: { contains: 'центр', mode: 'insensitive' } },
          { district: { contains: 'центре', mode: 'insensitive' } },
        ],
      }),
      ...(qf === 'kids' && { features: { has: 'kids_friendly' } }),
      ...(qf === 'modern' && { venueType: { in: ['GALLERY', 'ART_SPACE', 'EXHIBITION_HALL'] } }),
      ...(qf === 'free' && { OR: [{ priceFrom: 0 }, { priceFrom: null }] }),
    };

    const eventsDtoWithRegion = regionCityIds?.length
      ? { ...eventsDto, city: undefined, cityIds: regionCityIds }
      : eventsDto;

    const [eventsRes, venuesRaw] = await Promise.all([
      this.getEvents(eventsDtoWithRegion as EventsQueryDto),
      this.prisma.venue.findMany({
        where: venueWhere,
        include: { city: { select: { slug: true, name: true } } },
        take: FETCH_LIMIT,
      }),
    ]);

    const qLower = q?.trim().toLowerCase();
    const matchesQ = (title: string, desc?: string) =>
      !qLower || title.toLowerCase().includes(qLower) || (desc && desc.toLowerCase().includes(qLower));

    const eventItems = eventsRes.items
      .filter((e: { title?: string | null; description?: string | null }) =>
        matchesQ(String(e.title ?? ''), e.description ? String(e.description) : undefined),
      )
      .map((e) => this.eventToCatalogItem(e));
    const venueItems = venuesRaw.map((v) => this.venueToCatalogItem(v));

    const combined = [...eventItems, ...venueItems];

    // Регион для каждого города (для группировки «Списком»)
    const combinedCityIds = [
      ...new Set(combined.map((i) => asCatalogEntityLite(i)?.cityId).filter((id): id is string => !!id)),
    ];
    if (combinedCityIds.length > 0) {
      const regionCities = await this.prisma.regionCity.findMany({
        where: { cityId: { in: combinedCityIds } },
        include: { region: { select: { name: true, slug: true } } },
      });
      const regionByCityId = new Map(regionCities.map((rc) => [rc.cityId, rc.region]));
      combined.forEach((item) => {
        const entity = asCatalogEntityLite(item);
        const cityId = entity?.cityId;
        if (cityId) {
          (item as { regionName?: string | null; regionSlug?: string | null }).regionName =
            regionByCityId.get(cityId)?.name ?? null;
          (item as { regionName?: string | null; regionSlug?: string | null }).regionSlug =
            regionByCityId.get(cityId)?.slug ?? null;
        }
      });
    }

    const orderByRating = (a: { rating?: number }, b: { rating?: number }) =>
      (Number(b.rating) || 0) - (Number(a.rating) || 0);
    const orderByPriceAsc = (a: { priceFrom?: number | null }, b: { priceFrom?: number | null }) =>
      (a.priceFrom ?? Infinity) - (b.priceFrom ?? Infinity);
    const orderByPriceDesc = (a: { priceFrom?: number | null }, b: { priceFrom?: number | null }) =>
      (b.priceFrom ?? 0) - (a.priceFrom ?? 0);

    const compare =
      sort === 'price_asc'
        ? (a: unknown, b: unknown) => orderByPriceAsc(a as { priceFrom?: number | null }, b as { priceFrom?: number | null })
        : sort === 'price_desc'
          ? (a: unknown, b: unknown) => orderByPriceDesc(a as { priceFrom?: number | null }, b as { priceFrom?: number | null })
          : (a: unknown, b: unknown) => orderByRating(a as { rating?: number }, b as { rating?: number });
    combined.sort(compare);

    const total = combined.length;
    const start = (page - 1) * limit;
    const items = combined.slice(start, start + limit);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async getCatalogVenues(params: { city?: string; q?: string; sort?: string; page: number; limit: number }) {
    const { city, q, sort = 'popular', page, limit } = params;

    const where = buildVenueWhere({ city, q });

    const orderBy: Prisma.VenueOrderByWithRelationInput =
      sort === 'price_asc'
        ? { priceFrom: 'asc' }
        : sort === 'price_desc'
          ? { priceFrom: 'desc' }
          : sort === 'rating'
            ? { rating: 'desc' }
            : { rating: 'desc' }; // popular = rating

    const [raw, total] = await Promise.all([
      this.prisma.venue.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { city: { select: { slug: true, name: true } } },
      }),
      this.prisma.venue.count({ where }),
    ]);

    const items = raw.map((v) => this.venueToCatalogItem(v));

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  private venueToCatalogItem(v: Record<string, unknown>) {
    const openingHours = v.openingHours as Record<string, string | null> | null;
    const openingHoursSummary = openingHours ? this.formatOpeningHoursSummary(openingHours) : 'Открытая дата';

    return {
      type: 'venue' as const,
      id: v.id,
      slug: v.slug,
      title: v.title,
      cityId: v.cityId,
      citySlug: asCityLite(v.city).slug,
      cityName: asCityLite(v.city).name,
      imageUrl: v.imageUrl,
      priceFrom: v.priceFrom,
      rating: Number(v.rating) || 0,
      reviewCount: v.reviewCount ?? 0,
      badges: v.isFeatured ? ['Популярное'] : [],
      location:
        v.address || v.metro
          ? { address: v.address ? shortenAddressToStreet(String(v.address)) : String(v.address ?? ''), metro: v.metro }
          : undefined,
      dateLabel: openingHoursSummary,
      // venue-only
      venueType: v.venueType,
      openingHoursSummary,
    };
  }

  private formatOpeningHoursSummary(oh: Record<string, string | null>): string {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const withHours = days.filter((d) => oh[d]);
    if (withHours.length === 0) return 'Открытая дата';
    if (withHours.length === 7 && new Set(withHours.map((d) => oh[d])).size === 1) {
      return oh[withHours[0]] || 'Открытая дата';
    }
    return 'Открытая дата'; // упрощённо
  }

  // --- События ---

  async getEvents(query: EventsQueryDto & { cityIds?: string[] }) {
    const nocache = query.nocache === '1' || query.nocache === 'true';
    const paramsHash = createHash('sha256')
      .update(JSON.stringify({ ...query, nocache: undefined }))
      .digest('hex')
      .slice(0, 16);
    const cacheKey = cacheKeys.catalog.list(`${query.city || 'all'}:${paramsHash}`);

    if (!nocache) {
      const cached = await this.cache.getOrSet(cacheKey, CACHE_TTL.EVENT_LIST, () => this.fetchEvents(query));
      return cached;
    }
    return this.fetchEvents(query);
  }

  private async fetchEvents(query: EventsQueryDto & { cityIds?: string[] }) {
    const {
      city,
      cityIds,
      category,
      subcategory,
      audience,
      tag,
      dateFrom,
      dateTo,
      sort,
      timeOfDay,
      pier,
      maxDuration,
      minDuration,
      maxMinAge,
      dateMode,
      venueId,
      priceMin,
      priceMax,
      page = 1,
      limit = 20,
      hasPhoto,
      slugs: slugsParam,
    } = query;

    // --- Фильтр сеансов: OPEN_DATE не требуют sessions ---
    // dateMode=OPEN_DATE → нет сеансов, показываем если isActive и не истёк endDate
    // dateMode=SCHEDULED (или без фильтра) → обычный фильтр по sessions
    const isOpenDateOnly = dateMode === 'OPEN_DATE';

    const sessionFilter: Prisma.EventWhereInput = isOpenDateOnly
      ? {
          // OPEN_DATE: нет сеансов, но проверяем что не истёк endDate (если задан)
          dateMode: DateMode.OPEN_DATE,
          OR: [
            { endDate: null }, // вечная экспозиция
            { endDate: { gte: new Date() } }, // ещё не закончилась
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
                        : {
                            gte: dateFrom ? new Date(dateFrom) : new Date(),
                            ...(dateTo && { lte: new Date(dateTo) }),
                          }),
                    },
                  },
                },
              },
              {
                dateMode: DateMode.OPEN_DATE,
                OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
              },
            ],
          };

    const where = buildEventWhere(
      {
        city,
        cityIds,
        category,
        subcategory,
        audience,
        tag,
        pier,
        maxDuration,
        minDuration,
        maxMinAge,
        venueId,
        priceMin,
        priceMax,
        hasPhoto,
        slugs: slugsParam,
        dateMode,
        isOpenDateOnly,
      },
      sessionFilter,
    );

    // Time of day filter: restrict events to those with sessions in the given MSK hour range.
    // startsAt stored as timestamp(3) WITHOUT timezone in UTC.
    // Moscow = UTC+3 always (no DST). Instead of heavy AT TIME ZONE conversion in SQL,
    // we pre-compute UTC hour ranges from MSK ranges on the app side.
    if (timeOfDay) {
      // MSK hour ranges → convert to UTC by subtracting 3
      const mskRanges: Record<string, [number, number]> = {
        morning: [6, 10], // UTC 3–7
        day: [10, 17], // UTC 7–14
        evening: [17, 22], // UTC 14–19
        night: [22, 6], // UTC 19–3
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

    const fields = query.fields ?? 'full';

    const t0 = Date.now();
    const tDb0 = Date.now();

    const findManyPromise =
      fields === 'card'
        ? this.prisma.event.findMany({
            where,
            orderBy,
            skip,
            take: maxTake,
            select: {
              id: true,
              slug: true,
              title: true,
              shortDescription: true,
              category: true,
              subcategories: true,
              audience: true,
              imageUrl: true,
              galleryUrls: true,
              priceFrom: true,
              rating: true,
              reviewCount: true,
              city: { select: { slug: true, name: true } },
              venue: { select: { title: true, shortTitle: true } },
              tags: { include: { tag: true } },
              sessions: {
                where: { isActive: true, startsAt: { gte: new Date() } },
                orderBy: { startsAt: 'asc' },
                take: 20,
                select: { startsAt: true, availableTickets: true },
              },
            },
          })
        : this.prisma.event.findMany({
            where,
            orderBy,
            skip,
            take: maxTake,
            include: {
              city: { select: { slug: true, name: true } },
              venue: { select: { title: true, shortTitle: true } },
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
                take: 20,
                select: { startsAt: true, availableTickets: true },
              },
            },
          });

    const [rawItems, total] = await Promise.all([findManyPromise, this.prisma.event.count({ where })]);

    const dbMs = Date.now() - tDb0;

    const tOv0 = Date.now();
    const overridden = await this.overrideService.applyOverrides(rawItems);
    const overrideMs = Date.now() - tOv0;

    const tBadges0 = Date.now();
    // Вычисляем смарт-бейджи: ближайший сеанс, свободные места, optimal score
    let items = this.enrichWithBadges(overridden);
    const badgesMs = Date.now() - tBadges0;

    // События без фото — в конец каталога
    items = this.moveNoPhotoToEnd(items);

    // Спец-режим "Начнутся скоро": показываем только события с ближайшими сеансами,
    // сортируем по времени ближайшего сеанса, пагинируем уже отсортированный список.
    if (isDepartingSoon && items.length > 0) {
      const withSessions = items.filter((e) => e.nextSessionAt);
      const departingTotal = withSessions.length;

      const sorted = this.moveNoPhotoToEnd(
        withSessions.sort((a, b) => {
          const aAt = a.nextSessionAt ? toDateSafe(a.nextSessionAt)?.getTime() ?? Infinity : Infinity;
          const bAt = b.nextSessionAt ? toDateSafe(b.nextSessionAt)?.getTime() ?? Infinity : Infinity;
          return aAt - bAt;
        }),
      );

      const paged = sorted.slice((page - 1) * limit, page * limit);

      const payloadItems = fields === 'card' ? paged.map((e) => this.toEventCard(e)) : paged;

      const totalMs = Date.now() - t0;
      this.logger.log({
        msg: 'fetchEvents timings',
        fields,
        sort,
        dbMs,
        overrideMs,
        badgesMs,
        totalMs,
        total: departingTotal,
      });

      return {
        items: payloadItems,
        total: departingTotal,
        page,
        totalPages: Math.ceil(departingTotal / limit),
      };
    }

    const payloadItems = fields === 'card' ? items.map((e) => this.toEventCard(e)) : items;

    const totalMs = Date.now() - t0;
    this.logger.log({
      msg: 'fetchEvents timings',
      fields,
      sort,
      dbMs,
      overrideMs,
      badgesMs,
      totalMs,
      total,
    });

    return {
      items: payloadItems,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Облегчённая DTO для листингов: только данные, нужные карточке события.
   * Не включает tcData, сырые JSON из интеграций и тяжёлые поля.
   */
  private toEventCard(event: any) {
    return {
      id: event.id,
      slug: event.slug,
      title: event.title,
      shortDescription: event.shortDescription ?? null,
      category: event.category ?? null,
      subcategories: event.subcategories ?? [],
      audience: event.audience ?? null,
      city: event.city ?? null,
      venue: event.venue ?? null,
      imageUrl: event.imageUrl ?? null,
      galleryUrls: event.galleryUrls ?? [],
      priceFrom: event.priceFrom ?? null,
      rating: event.rating ?? null,
      reviewCount: event.reviewCount ?? 0,
      nextSessionAt: event.nextSessionAt ?? null,
      totalAvailableTickets: event.totalAvailableTickets ?? null,
      tagSlugs: event.tagSlugs ?? [],
      highlights: event.highlights ?? [],
      isOptimalChoice: event.isOptimalChoice ?? false,
    };
  }

  async getEventBySlug(slug: string, nocache = false) {
    if (nocache) return this.fetchEventBySlug(slug);
    const cacheKey = cacheKeys.events.detail(slug);
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

    // Применяем override (мерж title, description, templateData и т.д., фильтр isHidden)
    const [overridden] = await this.overrideService.applyOverrides([event]);
    if (!overridden) throw new NotFoundException(`Событие "${slug}" не найдено`);

    // SCHEDULED без активных слотов — показываем страницу (с пустыми сеансами), не 404.
    // В каталоге такие события не выводятся; но по прямой ссылке — даём контекст («нет сеансов на данный момент»).
    // OPEN_DATE с истёкшей endDate — не показывать
    if (overridden.dateMode === 'OPEN_DATE' && overridden.endDate && new Date(overridden.endDate) < new Date()) {
      throw new NotFoundException(`Событие "${slug}" не найдено`);
    }

    // Primary offer для удобства фронтенда
    const primaryOffer = overridden.offers?.length > 0 ? overridden.offers[0] : null;

    // Похожие события: город + категория + скоринг по тегам, подкатегории, priceFrom
    const relatedEvents = await this.fetchRelatedEvents(overridden);

    // Рейтинг: до 10 отзывов — псевдослучайный. Салюты: 4.8–5, остальные: 4.5–5
    const rc = Number(overridden.reviewCount ?? 0) | 0;
    const rawR = Number(overridden.rating) || 0;
    const h = String(overridden.id || overridden.slug || '')
      .split('')
      .reduce((a, c) => (a << 5) - a + c.charCodeAt(0), 0);
    const ovTags = (overridden.tags || []).map((t: { tag?: { slug?: string } | null }) => t?.tag?.slug).filter((s): s is string => !!s);
    const ovHasSalute = ovTags.some((s) => s === 'salute' || s === 'salyut-s-vody');
    const displayRating =
      rc >= 10 ? rawR : ovHasSalute ? 4.8 + (Math.abs(h) % 21) / 100 : 4.5 + (Math.abs(h) % 51) / 100;

    return {
      ...overridden,
      rating: displayRating,
      address: overridden.address ? shortenAddressToStreet(overridden.address) : overridden.address,
      primaryOffer,
      relatedEvents: relatedEvents.map((r: Record<string, unknown>) => ({
        ...r,
        rating:
          Number(r.reviewCount ?? 0) >= 10
            ? Number(r.rating) || 0
            : 4.5 +
              (Math.abs(
                String(r.id || r.slug || '')
                  .split('')
                  .reduce((a: number, c: string) => (a << 5) - a + c.charCodeAt(0), 0),
              ) %
                51) /
                100,
        address: r.address ? shortenAddressToStreet(String(r.address)) : r.address,
      })),
    };
  }

  /**
   * Похожие события: город + категория + скоринг по тегам, подкатегории, priceFrom.
   * Выбираем до 30 кандидатов, считаем score, возвращаем топ-6.
   */
  private async fetchRelatedEvents(event: {
    id: string;
    cityId: string;
    category: string;
    subcategories: EventSubcategory[];
    priceFrom: number | null;
    tags?: Array<{ tagId: string }>;
  }) {
    const eventTagIds = new Set((event.tags ?? []).map((t: { tagId: string }) => t.tagId));
    const eventSubIds = new Set(event.subcategories);
    const priceFrom = event.priceFrom ?? 0;
    const priceTolerance = Math.max(50000, Math.floor(priceFrom * 0.5)); // 500₽ или ±50%

    const candidates = await this.prisma.event.findMany({
      where: {
        cityId: event.cityId,
        category: event.category as EventCategory,
        isActive: true,
        isDeleted: false,
        canonicalOfId: null,
        id: { not: event.id },
        sessions: {
          some: { isActive: true, startsAt: { gte: new Date() } },
        },
      },
      include: {
        tags: { select: { tagId: true } },
        city: { select: { slug: true, name: true } },
      },
      take: 30,
    });

    const scored = candidates.map((c) => {
      let score = 0;
      // Теги: +3 за каждый общий
      const cTags = (c as { tags?: { tagId: string }[] }).tags ?? [];
      const cTagIds = new Set(cTags.map((t) => t.tagId));
      for (const tid of eventTagIds) {
        if (cTagIds.has(tid)) score += 3;
      }
      // Подкатегория: +5 за совпадение
      for (const sub of c.subcategories) {
        if (eventSubIds.has(sub)) {
          score += 5;
          break;
        }
      }
      // Цена: +2 если в допустимом диапазоне
      const cp = c.priceFrom ?? 0;
      if (cp > 0 && priceFrom > 0 && Math.abs(cp - priceFrom) <= priceTolerance) {
        score += 2;
      }
      return { event: c, score };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Number((b.event.rating as unknown as number) ?? 0) - Number((a.event.rating as unknown as number) ?? 0);
    });

    return scored.slice(0, 6).map((s) => {
      const { event: e } = s;
      const { tags: _t, ...rest } = e as typeof e & { tags?: unknown };
      return rest;
    });
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
    const cacheKey = cacheKeys.search.query(q, city || 'all');
    return this.cache.getOrSet(cacheKey, CACHE_TTL.SEARCH, () => this.fetchSearch(q, city));
  }

  private async fetchSearch(q: string, city?: string) {
    const where: Prisma.EventWhereInput = {
      isActive: true,
      isDeleted: false,
      OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }],
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
        OR: [{ name: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }],
      },
      take: 5,
    });

    return { events, cities };
  }

  // --- Helpers ---

  /** Экранировать спецсимволы для RegExp */
  private escapeRe(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** События без фото — в конец списка */
  private moveNoPhotoToEnd<T extends { imageUrl?: string | null }>(items: T[]): T[] {
    const withPhoto: T[] = [];
    const withoutPhoto: T[] = [];
    for (const e of items) {
      const url = e?.imageUrl;
      const hasPhoto = typeof url === 'string' && url.trim().length > 0;
      if (hasPhoto) withPhoto.push(e);
      else withoutPhoto.push(e);
    }
    return [...withPhoto, ...withoutPhoto];
  }

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
   * - groupSize, sessionTimes, highlights — для карточек EventCard
   *
   * Scoring: rating 40% + price-efficiency 30% + occupancy 30%
   */
  private enrichWithBadges(events: Record<string, unknown>[]): Record<string, unknown>[] {
    if (events.length === 0) return events;

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

    // Вычисляем метрики для каждого события
    const enriched = events.map((event) => {
      const sessions: { startsAt: Date; availableTickets: number }[] = (event.sessions ?? []) as { startsAt: Date; availableTickets: number }[];
      const nextSessionAt = sessions.length > 0 ? sessions[0].startsAt : null;
      const now = new Date();
      const minutesUntilNext = nextSessionAt
        ? Math.round((new Date(nextSessionAt).getTime() - now.getTime()) / 60000)
        : null;
      const departingSoonMinutes =
        minutesUntilNext !== null && minutesUntilNext > 0 && minutesUntilNext <= 120 ? minutesUntilNext : null;
      const totalAvailableTickets = sessions.reduce((sum, s) => sum + (s.availableTickets || 0), 0);

      // sessionTimes: слоты времени на сегодня (HH:mm)
      const sessionTimes: string[] = [];
      if (nextSessionAt) {
        const firstAt = new Date(nextSessionAt);
        const firstDayStart = new Date(firstAt);
        firstDayStart.setUTCHours(0, 0, 0, 0);
        const firstDayEnd = new Date(firstDayStart);
        firstDayEnd.setUTCDate(firstDayEnd.getUTCDate() + 1);
        for (const s of sessions) {
          const t = new Date(s.startsAt).getTime();
          if (t >= firstDayStart.getTime() && t < firstDayEnd.getTime()) {
            const d = new Date(s.startsAt);
            const timeStr = d.toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Europe/Moscow',
            });
            sessionTimes.push(timeStr);
          }
        }
      }

      // groupSize из templateData
      const templateData = (event.templateData || {}) as Record<string, unknown>;
      const groupSize = (
        typeof templateData.groupSize === 'string' && templateData.groupSize.trim()
          ? templateData.groupSize.trim()
          : null
      ) as string | null;

      // highlights: 1) локация (очищенная), 2) маршрут, 3) подкатегории/теги
      const highlights: string[] = [];
      const venue = event.venue as { title?: string; shortTitle?: string } | null;
      const cityName = (event.city as { name?: string } | null)?.name;
      const rawAddress = (typeof event.address === 'string' ? event.address.trim() : null) || venue?.shortTitle || venue?.title || '';
      // Для точки отправления: только улица и номер дома
      const locStr = rawAddress ? shortenAddressToStreet(rawAddress) : '';
      if (locStr) highlights.push(locStr);
      const route = typeof templateData.route === 'string' ? templateData.route.trim() : null;
      if (route && !highlights.includes(route)) highlights.push(route);
      const subs: EventSubcategory[] = (event.subcategories ?? []) as EventSubcategory[];
      const tagsArr = Array.isArray(event.tags) ? event.tags : [];
      const tagSlugsForFilter = (tagsArr as Array<{ tag?: { slug?: string } | null }>).map((t) => t?.tag?.slug).filter((s: string | undefined): s is string => !!s);
      const hasNightTag = tagSlugsForFilter.includes('night');
      const hasSaluteTag = tagSlugsForFilter.some((s: string) => s === 'salute' || s === 'salyut-s-vody');
      for (const sub of subs) {
        // Экстрим не показывать на ночных прогулках и салютах — это не экстрим
        if (sub === 'EXTREME' && (hasNightTag || hasSaluteTag)) continue;
        const label = SUBCATEGORY_LABELS[sub as EventSubcategory];
        if (label && !highlights.includes(label)) highlights.push(label);
      }
      const tags: { tag?: { slug?: string; name?: string } | null }[] = (event.tags ?? []) as { tag?: { slug?: string; name?: string } | null }[];
      const tagLabelMap: Record<string, string> = {
        'with-guide': 'Экскурсия от гида',
        audioguide: 'Аудиогид',
        night: 'Ночная',
        water: 'На воде',
        romantic: 'Романтика',
        'first-time-city': 'Для первого визита',
        'bad-weather-ok': 'В любую погоду',
        'no-queue': 'Без очереди',
        interactive: 'Интерактив',
      };
      for (const t of tags) {
        const slug = t?.tag?.slug;
        const name = t?.tag?.name;
        const label = (slug && tagLabelMap[slug]) || name;
        if (label && !highlights.includes(label)) highlights.push(label);
      }
      const displayHighlights = highlights.slice(0, 3);

      // Primary offer — первый из отсортированных (isPrimary desc, priority desc)
      const offers: Record<string, unknown>[] = (event.offers || []) as Record<string, unknown>[];
      const primaryOffer = offers.length > 0 ? offers[0] : null;

      // Извлекаем slug-и тегов для бейджей на фронтенде (защита от null tag)
      const tagSlugs: string[] = tags.map((t) => t?.tag?.slug).filter((s): s is string => !!s);

      // Рейтинг: до 10 отзывов — псевдослучайный. Салюты: 4.8–5, остальные: 4.5–5
      const reviewCount = Number(event.reviewCount ?? 0) | 0;
      const rawRating = Number(event.rating) || 0;
      const hash = String(event.id || event.slug || '')
        .split('')
        .reduce((a: number, c: string) => (a << 5) - a + c.charCodeAt(0), 0);
      const displayRating =
        reviewCount >= 10
          ? rawRating
          : hasSaluteTag
            ? 4.8 + (Math.abs(hash) % 21) / 100 // 4.80–5.00
            : 4.5 + (Math.abs(hash) % 51) / 100; // 4.50–5.00

      const shortAddr = event.address ? shortenAddressToStreet(String(event.address)) : '';
      return {
        ...event,
        rating: displayRating,
        address: shortAddr || event.address,
        location: event.address ? { address: shortAddr, metro: null } : undefined,
        nextSessionAt,
        departingSoonMinutes,
        totalAvailableTickets,
        primaryOffer,
        offersCount: offers.length,
        tagSlugs,
        groupSize,
        sessionTimes,
        highlights: displayHighlights,
        // sessions и offers — убираем из ответа каталога (детали — на странице события)
        sessions: undefined,
        offers: undefined,
      };
    });

    // Нормализация для scoring
    const prices = enriched.map((e) => Number((e as { priceFrom?: number }).priceFrom) || 0).filter((p) => p > 0);
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
      const price = Number((e as { priceFrom?: number }).priceFrom) || 0;

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
