import { Injectable, NotFoundException } from '@nestjs/common';
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
    const events = tag
      ? await this.prisma.event.findMany({
          where: {
            isActive: true,
            cityId: landing.cityId,
            tags: { some: { tagId: tag.id } },
            sessions: {
              some: { isActive: true, startsAt: { gte: now } },
            },
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

    // Строим "варианты" — плоский список сессий
    const variants = events.flatMap((event) =>
      event.sessions.map((session) => ({
        sessionId: session.id,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        availableTickets: session.availableTickets,
        prices: session.prices,
        event: {
          id: event.id,
          title: event.title,
          slug: event.slug,
          address: event.address,
          durationMinutes: event.durationMinutes,
          imageUrl: event.imageUrl,
          tcEventId: event.tcEventId,
          source: event.source,
          rating: event.rating,
          reviewCount: event.reviewCount,
          priceFrom: event.priceFrom,
        },
      })),
    );

    // Сортировка по времени
    variants.sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );

    // Формируем фильтры для фронтенда
    const piers = [
      ...new Set(
        events
          .map((e) => e.address)
          .filter(Boolean) as string[],
      ),
    ];

    const allPrices = variants
      .map((v) => {
        const prices = v.prices as Array<{ type: string; amount?: number; price?: number }>;
        return prices?.[0]?.amount ?? prices?.[0]?.price ?? null;
      })
      .filter((p): p is number => p !== null);

    const allDates = variants.map((v) =>
      new Date(v.startsAt).toISOString().slice(0, 10),
    );
    const uniqueDates = [...new Set(allDates)].sort();

    const filters = {
      piers,
      priceRange: allPrices.length
        ? [Math.min(...allPrices), Math.max(...allPrices)]
        : [0, 0],
      dateRange: uniqueDates.length
        ? [uniqueDates[0], uniqueDates[uniqueDates.length - 1]]
        : [],
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
}
