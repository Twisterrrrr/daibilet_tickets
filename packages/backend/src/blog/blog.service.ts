import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getArticles(opts?: { city?: string; tag?: string; page?: number; limit?: number }) {
    const { city, tag, page = 1, limit = 12 } = opts || {};

    const where: Prisma.ArticleWhereInput = {
      isPublished: true,
      ...(city && { city: { slug: city } }),
      ...(tag && { articleTags: { some: { tag: { slug: tag } } } }),
    };

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          city: { select: { slug: true, name: true } },
          articleTags: { include: { tag: { select: { slug: true, name: true } } } },
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getArticleBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        city: { select: { slug: true, name: true } },
        articleEvents: {
          include: {
            event: {
              select: {
                id: true,
                slug: true,
                title: true,
                imageUrl: true,
                priceFrom: true,
                category: true,
                rating: true,
              },
            },
          },
        },
        articleTags: { include: { tag: { select: { slug: true, name: true } } } },
      },
    });

    if (!article) throw new NotFoundException(`Статья "${slug}" не найдена`);
    return article;
  }

  /**
   * Генерация SEO-статей для каждого города.
   * Запускается через POST /api/v1/blog/generate
   */
  async generateCityArticles() {
    const cities = await this.prisma.city.findMany({
      where: { isActive: true },
      include: {
        events: {
          where: { isActive: true },
          orderBy: { rating: 'desc' },
          take: 10,
          select: { id: true, title: true, slug: true, category: true, priceFrom: true, address: true, rating: true },
        },
        _count: { select: { events: { where: { isActive: true } } } },
      },
    });

    let created = 0;

    for (const city of cities) {
      if (city._count.events === 0) continue;

      // --- Статья 1: Обзор города ---
      const overviewSlug = `chto-posmotret-v-${city.slug}`;
      const overviewExists = await this.prisma.article.findUnique({ where: { slug: overviewSlug } });

      if (!overviewExists) {
        const excursions = city.events.filter((e: any) => e.category === 'EXCURSION');
        const museums = city.events.filter((e: any) => e.category === 'MUSEUM');
        const events = city.events.filter((e: any) => e.category === 'EVENT');

        const content = this.buildCityOverviewContent(city, excursions, museums, events);

        const article = await this.prisma.article.create({
          data: {
            slug: overviewSlug,
            title: `Что посмотреть в ${city.name}: лучшие экскурсии и мероприятия`,
            content,
            excerpt: `Подборка лучших экскурсий, музеев и мероприятий в ${city.name}. ${city._count.events} событий с онлайн-покупкой билетов.`,
            cityId: city.id,
            coverImage: city.heroImage,
            metaTitle: `Что посмотреть в ${city.name} — топ экскурсий и мероприятий | Дайбилет`,
            metaDescription: `Лучшие экскурсии, музеи и мероприятия в ${city.name}. Покупайте билеты онлайн. ${city._count.events} событий в каталоге.`,
            isPublished: true,
            publishedAt: new Date(),
          },
        });

        // Связать с событиями
        for (const event of city.events.slice(0, 5)) {
          await this.prisma.articleEvent
            .create({
              data: { articleId: article.id, eventId: event.id },
            })
            .catch((e) => this.logger.error('blog link failed: ' + (e as Error).message));
        }

        created++;
      }

      // --- Статья 2: Экскурсии ---
      const excursions = city.events.filter((e: any) => e.category === 'EXCURSION');
      if (excursions.length >= 3) {
        const excSlug = `luchshie-ekskursii-${city.slug}`;
        const excExists = await this.prisma.article.findUnique({ where: { slug: excSlug } });

        if (!excExists) {
          const content = this.buildCategoryContent(city, 'экскурсий', excursions);

          const article = await this.prisma.article.create({
            data: {
              slug: excSlug,
              title: `Лучшие экскурсии в ${city.name}: рейтинг и цены`,
              content,
              excerpt: `Топ-${excursions.length} экскурсий в ${city.name} с рейтингами, ценами и онлайн-бронированием билетов.`,
              cityId: city.id,
              coverImage: city.heroImage,
              metaTitle: `Экскурсии в ${city.name} — рейтинг, цены, купить билеты | Дайбилет`,
              metaDescription: `Лучшие экскурсии в ${city.name}: обзор, цены от ${this.minPrice(excursions)} ₽. Покупка билетов онлайн на Дайбилет.`,
              isPublished: true,
              publishedAt: new Date(),
            },
          });

          for (const event of excursions.slice(0, 5)) {
            await this.prisma.articleEvent
              .create({
                data: { articleId: article.id, eventId: event.id },
              })
              .catch((e) => this.logger.error('blog link failed: ' + (e as Error).message));
          }

          created++;
        }
      }
    }

    return { created, total: await this.prisma.article.count() };
  }

  // --- Content builders ---

  private buildCityOverviewContent(city: any, excursions: any[], museums: any[], events: any[]): string {
    let md = `# Что посмотреть в ${city.name}\n\n`;
    md += `${city.name} — один из самых интересных городов для путешественников. `;
    md += `В нашем каталоге **${city._count.events} событий** с возможностью онлайн-покупки билетов.\n\n`;

    if (excursions.length > 0) {
      md += `## Экскурсии\n\n`;
      md += `В ${city.name} доступно ${excursions.length} экскурсий — от классических обзорных до необычных авторских маршрутов.\n\n`;
      for (const e of excursions.slice(0, 5)) {
        const price = e.priceFrom ? ` — от ${Math.round(e.priceFrom / 100)} ₽` : '';
        md += `- **[${e.title}](/events/${e.slug})**${price}\n`;
      }
      md += `\n[Все экскурсии в ${city.name} →](/events?city=${city.slug}&category=EXCURSION)\n\n`;
    }

    if (museums.length > 0) {
      md += `## Музеи\n\n`;
      for (const e of museums.slice(0, 5)) {
        const price = e.priceFrom ? ` — от ${Math.round(e.priceFrom / 100)} ₽` : '';
        md += `- **[${e.title}](/events/${e.slug})**${price}\n`;
      }
      md += `\n[Все музеи в ${city.name} →](/events?city=${city.slug}&category=MUSEUM)\n\n`;
    }

    if (events.length > 0) {
      md += `## Мероприятия\n\n`;
      for (const e of events.slice(0, 5)) {
        const price = e.priceFrom ? ` — от ${Math.round(e.priceFrom / 100)} ₽` : '';
        md += `- **[${e.title}](/events/${e.slug})**${price}\n`;
      }
      md += `\n[Все мероприятия в ${city.name} →](/events?city=${city.slug}&category=EVENT)\n\n`;
    }

    md += `---\n\n`;
    md += `Покупайте билеты онлайн на [Дайбилет](/) и планируйте идеальную поездку в ${city.name}!\n`;

    return md;
  }

  private buildCategoryContent(city: any, categoryLabel: string, events: any[]): string {
    let md = `# Лучшие ${categoryLabel} в ${city.name}\n\n`;
    md += `Мы собрали **${events.length} ${categoryLabel}** в ${city.name} с рейтингами и онлайн-покупкой билетов.\n\n`;

    for (let i = 0; i < Math.min(events.length, 10); i++) {
      const e = events[i];
      const price = e.priceFrom ? `от ${Math.round(e.priceFrom / 100)} ₽` : 'уточняйте';
      const rating = e.rating ? ` (рейтинг ${e.rating})` : '';
      md += `### ${i + 1}. ${e.title}\n\n`;
      md += `**Цена:** ${price}${rating}\n\n`;
      if (e.address) md += `**Адрес:** ${e.address}\n\n`;
      md += `[Купить билеты →](/events/${e.slug})\n\n`;
    }

    md += `---\n\n`;
    md += `[Все ${categoryLabel} в ${city.name} →](/events?city=${city.slug}&category=EXCURSION)\n`;

    return md;
  }

  private minPrice(events: any[]): string {
    const prices = events.map((e: any) => e.priceFrom).filter(Boolean);
    if (prices.length === 0) return '—';
    return String(Math.round(Math.min(...prices) / 100));
  }
}
