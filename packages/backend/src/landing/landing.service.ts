import { getFirstPriceKopecks } from '@daibilet/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DateMode, EventCategory, EventSource, EventSubcategory, LandingStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LandingService {
  constructor(private readonly prisma: PrismaService) {}

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

  /** Полный лендинг + варианты (сессии событий) + фильтры */
  async getBySlug(slug: string) {
    const landing = await this.prisma.landingPage.findUnique({
      where: { slug },
      include: {
        city: { select: { slug: true, name: true, id: true } },
      },
    });

    if (!landing || !landing.isActive) {
      throw new NotFoundException(`Лендинг "${slug}" не найден`);
    }

    // Находим тег для фильтрации
    const tag = await this.prisma.tag.findFirst({
      where: { slug: landing.filterTag, isActive: true },
    });

    // Получаем события с сессиями
    const now = new Date();

    // Применяем additionalFilters из настроек лендинга (JSON из БД)
    const af = (landing.additionalFilters ?? {}) as Record<string, unknown>;
    const extraWhere: Prisma.EventWhereInput = {};
    if (typeof af.category === 'string') extraWhere.category = af.category as EventCategory;
    if (Array.isArray(af.subcategories) && af.subcategories.length > 0) {
      extraWhere.subcategories = { hasSome: af.subcategories as EventSubcategory[] };
    }
    if (typeof af.source === 'string') extraWhere.source = af.source as EventSource;
    const minD = typeof af.minDuration === 'number' ? af.minDuration : undefined;
    const maxD = typeof af.maxDuration === 'number' ? af.maxDuration : undefined;
    if (minD !== undefined || maxD !== undefined) {
      extraWhere.durationMinutes = { ...(minD !== undefined && { gte: minD }), ...(maxD !== undefined && { lte: maxD }) };
    }

    const events = tag
      ? await this.prisma.event.findMany({
          where: {
            isActive: true,
            isDeleted: false,
            cityId: landing.cityId,
            tags: { some: { tagId: tag.id } },
            // Поддержка OPEN_DATE: показываем и без сеансов
            OR: [
              { dateMode: DateMode.SCHEDULED, sessions: { some: { isActive: true, startsAt: { gte: now } } } },
              { dateMode: DateMode.OPEN_DATE, OR: [{ endDate: null }, { endDate: { gte: now } }] },
            ],
            ...extraWhere,
          },
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

    const allDates = variants
      .filter((v) => v.startsAt != null)
      .map((v) => new Date(v.startsAt!).toISOString().slice(0, 10));
    const uniqueDates = [...new Set(allDates)].sort();

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
        title: landing.title,
        subtitle: landing.subtitle,
        heroText: landing.heroText,
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
    return this.getBySlug(landing.slug);
  }

  async getFeaturedForCollections(citySlug: string) {
    const rows = await this.prisma.landingPage.findMany({
      where: {
        isDeleted: false,
        showInCollections: true,
        OR: [{ status: LandingStatus.ACTIVE }, { isActive: true }],
        city: { slug: citySlug },
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
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle,
      templateType: row.templateType,
      hero: row.heroText,
      city: row.city,
      cta: { label: 'Открыть', href: `/cities/${row.city.slug}/${row.slug}` },
    }));
  }
}
