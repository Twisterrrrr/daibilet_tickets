import { calendarDayFromIso, getFirstPriceKopecks, getCityTimezone } from '@daibilet/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DateMode, LandingStatus, Prisma } from '@/prisma-client';

import { PrismaService } from '../prisma/prisma.service';
import { SubcategoryPolicyService } from '../subcategories/subcategory-policy.service';
import { buildLandingEventsWhere } from './landing-event-filter.helper';

type LandingWithCity = Prisma.LandingPageGetPayload<{
  include: { city: { select: { slug: true; name: true; id: true } } };
}>;

@Injectable()
export class LandingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subcategoryPolicy: SubcategoryPolicyService,
  ) {}

  /** Список активных лендингов (для меню/перелинковки) */
  async getAll() {
    return this.prisma.landingPage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        city: { select: { slug: true, name: true } },
      },
    });
  }

  /** Список лендингов для конкретного города */
  async getByCitySlug(citySlug: string) {
    return this.prisma.landingPage.findMany({
      where: {
        isActive: true,
        city: { slug: citySlug },
      },
      orderBy: { sortOrder: 'asc' },
      select: {
        slug: true,
        title: true,
        subtitle: true,
        metaTitle: true,
      },
    });
  }

  /**
   * Legacy: GET /landings/:slug без города.
   * При нескольких лендингах с одним slug выбирается самая ранняя запись по createdAt (обычно Москва для rechnye-progulki).
   */
  async getBySlug(slug: string) {
    const landing = await this.prisma.landingPage.findFirst({
      where: { slug, isDeleted: false },
      orderBy: { createdAt: 'asc' },
      include: {
        city: { select: { slug: true, name: true, id: true } },
      },
    });

    if (!landing || !landing.isActive) {
      throw new NotFoundException(`Лендинг "${slug}" не найден`);
    }

    return this.buildLandingPayload(landing);
  }

  private async buildLandingPayload(landing: LandingWithCity) {
    if (!landing.city) {
      throw new NotFoundException(`Лендинг "${landing.slug}" не привязан к городу`);
    }

    // Находим тег для фильтрации
    const tag = await this.prisma.tag.findFirst({
      where: { slug: landing.filterTag, isActive: true },
    });

    // Получаем события с сессиями
    const now = new Date();

    const eventsWhere = buildLandingEventsWhere({
      cityId: landing.cityId!,
      now,
      tag,
      additionalFilters: landing.additionalFilters,
      subcategoryPolicy: this.subcategoryPolicy,
    });

    const events = eventsWhere
      ? await this.prisma.event.findMany({
          where: eventsWhere,
          include: {
            sessions: {
              where: { isActive: true, startsAt: { gte: now } },
              orderBy: { startsAt: 'asc' },
            },
          },
          orderBy: { rating: 'desc' },
        })
      : [];

    // Строим "варианты" — плоский список сессий + OPEN_DATE события без сессий
    interface LandingVariant {
      sessionId: string | null;
      startsAt: Date | null;
      endsAt: Date | null;
      availableTickets: number | null;
      prices: Prisma.JsonValue;
      isOpenDate: boolean;
      event: {
        id: string;
        title: string;
        slug: string;
        address: string | null;
        durationMinutes: number | null;
        imageUrl: string | null;
        tcEventId: string;
        source: string;
        rating: unknown;
        reviewCount: number;
        priceFrom: number | null;
      };
    }

    const variants: LandingVariant[] = events.flatMap((event) => {
      // OPEN_DATE события без сессий — выводим как один "вариант" без привязки к сеансу
      if (event.dateMode === DateMode.OPEN_DATE && event.sessions.length === 0) {
        return [
          {
            sessionId: null as string | null,
            startsAt: null as Date | null,
            endsAt: null as Date | null,
            availableTickets: null as number | null,
            prices: null as Prisma.JsonValue,
            isOpenDate: true as boolean,
            event: {
              id: event.id,
              title: event.title,
              slug: event.slug,
              address: event.address,
              durationMinutes: event.durationMinutes,
              imageUrl: event.imageUrl,
              tcEventId: event.tcEventId ?? '',
              source: event.source,
              rating: event.rating,
              reviewCount: event.reviewCount,
              priceFrom: event.priceFrom,
            },
          },
        ];
      }
      return event.sessions.map((session) => ({
        sessionId: session.id as string | null,
        startsAt: session.startsAt as Date | null,
        endsAt: session.endsAt as Date | null,
        availableTickets: session.availableTickets as number | null,
        prices: session.prices as Prisma.JsonValue,
        isOpenDate: false,
        event: {
          id: event.id,
          title: event.title,
          slug: event.slug,
          address: event.address,
          durationMinutes: event.durationMinutes,
          imageUrl: event.imageUrl,
          tcEventId: event.tcEventId ?? '',
          source: event.source,
          rating: event.rating,
          reviewCount: event.reviewCount,
          priceFrom: event.priceFrom,
        },
      }));
    });

    // Сортировка по времени (OPEN_DATE — в конец)
    variants.sort((a, b) => {
      if (!a.startsAt && !b.startsAt) return 0;
      if (!a.startsAt) return 1;
      if (!b.startsAt) return -1;
      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    });

    // Формируем фильтры для фронтенда
    const piers = [...new Set(events.map((e) => e.address).filter(Boolean) as string[])];

    const allPrices = variants
      .map((v) => getFirstPriceKopecks(v.prices))
      .filter((p): p is number => p !== null && p > 0);

    const landingTz = getCityTimezone(landing.city.slug);
    const allDates = variants
      .filter((v) => v.startsAt != null)
      .map((v) => calendarDayFromIso((v.startsAt as Date).toISOString(), landingTz));
    const uniqueDates = [...new Set(allDates)].filter((d): d is string => Boolean(d)).sort();

    const filters = {
      piers,
      priceRange: allPrices.length ? [Math.min(...allPrices), Math.max(...allPrices)] : [0, 0],
      dateRange: uniqueDates.length ? [uniqueDates[0], uniqueDates[uniqueDates.length - 1]] : [],
      dates: uniqueDates,
    };

    return {
      landing: {
        id: landing.id,
        slug: landing.slug,
        templateType: landing.templateType,
        title: landing.title,
        subtitle: landing.subtitle,
        /** Для перелинковки в публичный каталог `/events` (канон query-string). */
        filterTag: landing.filterTag,
        additionalFilters: landing.additionalFilters,
        heroText: landing.heroText,
        seasonalPayload: landing.seasonalPayload,
        howToChoose: landing.howToChoose,
        infoBlocks: landing.infoBlocks,
        faq: landing.faq,
        reviews: landing.reviews,
        stats: landing.stats,
        relatedLinks: landing.relatedLinks,
        legalText: landing.legalText,
        metaTitle: landing.metaTitle,
        metaDescription: landing.metaDescription,
        city: landing.city,
      },
      variants,
      filters,
      total: variants.length,
    };
  }

  async resolveAdminResolvedEvents(landingId: string) {
    const landing = await this.prisma.landingPage.findUnique({
      where: { id: landingId },
      include: { city: { select: { id: true, slug: true, name: true } } },
    });
    if (!landing || landing.isDeleted) throw new NotFoundException('Лендинг не найден');

    type ResolvedEventItem = {
      id: string;
      slug: string | null;
      title: string;
      city: { id: string; slug: string; name: string } | null;
      isActive: boolean;
      priceFrom: string | null;
      nextSessionAt: string | null;
    };

    const resolveCityLanding = async (lp: typeof landing): Promise<{ ids: string[]; items: ResolvedEventItem[] }> => {
      if (!lp.cityId || !lp.city) return { ids: [], items: [] };
      const tag = await this.prisma.tag.findFirst({ where: { slug: lp.filterTag, isActive: true } });
      const now = new Date();
      const where = buildLandingEventsWhere({
        cityId: lp.cityId,
        now,
        tag,
        additionalFilters: lp.additionalFilters,
        subcategoryPolicy: this.subcategoryPolicy,
      });
      if (!where) return { ids: [], items: [] };

      const events = await this.prisma.event.findMany({
        where,
        orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }, { createdAt: 'desc' }],
        take: 60,
        select: {
          id: true,
          slug: true,
          title: true,
          isActive: true,
          priceFrom: true,
          city: { select: { id: true, slug: true, name: true } },
          sessions: {
            where: { isActive: true, startsAt: { gte: now } },
            orderBy: { startsAt: 'asc' },
            take: 1,
            select: { startsAt: true },
          },
        },
      });

      const items = events.map((e) => ({
        id: e.id,
        slug: e.slug,
        title: e.title,
        city: e.city,
        isActive: e.isActive,
        priceFrom: e.priceFrom != null ? String(e.priceFrom) : null,
        nextSessionAt: e.sessions[0]?.startsAt ? e.sessions[0].startsAt.toISOString() : null,
      }));

      return { ids: events.map((e) => e.id), items };
    };

    if (landing.landingType === 'CITY') {
      const { ids, items } = await resolveCityLanding(landing);
      return { items, total: ids.length };
    }

    const children = await this.prisma.landingPage.findMany({
      where: { parentLandingId: landing.id, isDeleted: false, landingType: 'CITY' },
      include: { city: { select: { id: true, slug: true, name: true } } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take: 50,
    });

    const parts = await Promise.all(children.map((c) => resolveCityLanding(c)));
    const idSet = new Set<string>();
    const items: Array<{
      id: string;
      slug: string | null;
      title: string;
      city: { id: string; slug: string; name: string } | null;
      isActive: boolean;
      priceFrom: string | null;
      nextSessionAt: string | null;
    }> = [];

    for (const p of parts) {
      for (const id of p.ids) idSet.add(id);
      for (const it of p.items) {
        if (items.length >= 80) break;
        items.push(it);
      }
    }

    return { items, total: idSet.size };
  }

  async getCatalogByCityAndSlug(citySlug: string, slug: string) {
    const landing = await this.prisma.landingPage.findFirst({
      where: {
        slug,
        city: { slug: citySlug },
        isDeleted: false,
        OR: [{ status: LandingStatus.ACTIVE }, { isActive: true }],
      },
      include: { city: { select: { slug: true, name: true, id: true } } },
    });
    if (!landing) throw new NotFoundException(`Лендинг "${slug}" не найден`);
    return this.buildLandingPayload(landing);
  }

  async getCatalogHubBySlug(slug: string) {
    const landing = await this.prisma.landingPage.findFirst({
      where: {
        slug,
        isDeleted: false,
        landingType: { in: ['HUB', 'MULTI_CITY'] },
        OR: [{ status: LandingStatus.ACTIVE }, { isActive: true }],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        heroText: true,
        landingType: true,
        metaTitle: true,
        metaDescription: true,
        canonicalUrl: true,
        status: true,
        isIndexable: true,
        isActive: true,
        childLandings: {
          where: { isDeleted: false, landingType: 'CITY' },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          take: 200,
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            isIndexable: true,
            isActive: true,
            city: { select: { id: true, slug: true, name: true } },
          },
        },
      },
    });

    if (!landing) throw new NotFoundException(`Лендинг "${slug}" не найден`);

    const variants = (landing.childLandings ?? [])
      .map((c) => {
        if (!c.city) return null;
        return {
          id: c.id,
          slug: c.slug,
          title: c.title,
          status: c.status,
          isIndexable: c.isIndexable,
          isActive: c.isActive,
          city: c.city,
          canonicalPath: `/cities/${c.city.slug}/${c.slug}`,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);

    return {
      landing: {
        id: landing.id,
        slug: landing.slug,
        title: landing.title,
        subtitle: landing.subtitle,
        heroText: landing.heroText,
        landingType: landing.landingType,
        metaTitle: landing.metaTitle,
        metaDescription: landing.metaDescription,
        canonicalUrl: landing.canonicalUrl,
        status: landing.status,
        isIndexable: landing.isIndexable,
        isActive: landing.isActive,
      },
      variants,
      total: variants.length,
    };
  }

  async getFeaturedForCollections(citySlug: string) {
    const rows = await this.prisma.landingPage.findMany({
      where: {
        isDeleted: false,
        showInCollections: true,
        OR: [{ status: LandingStatus.ACTIVE }, { isActive: true }],
        city: { slug: citySlug },
        cityId: { not: null },
      },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        templateType: true,
        heroText: true,
        city: { select: { slug: true, name: true } },
      },
    });
    return rows
      .filter((row) => row.city != null)
      .map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle,
      templateType: row.templateType,
      hero: row.heroText,
      city: row.city,
      cta: { label: 'Открыть', href: `/cities/${row.city!.slug}/${row.slug}` },
      }));
  }

  async trackFeaturedEvent(
    landingId: string,
    event: 'landing_impression' | 'landing_click' | 'landing_conversion',
    bucket?: 'A' | 'B',
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId: 'system',
        action: 'UPDATE',
        entity: 'LandingAnalytics',
        entityId: landingId,
        after: { event, bucket, at: new Date().toISOString() } as Prisma.InputJsonValue,
      },
    });
    return { success: true };
  }
}
