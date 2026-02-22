/**
 * SEO-генератор: anti-thin-content, шаблоны, related links.
 * См. docs/sitemap-seo-spec.md
 */
import { cityToPrepositional } from '@daibilet/shared';
import { Injectable, Logger } from '@nestjs/common';
import { DateMode, EventAudience, EventCategory, EventSubcategory, Prisma } from '@prisma/client';

import { applyQFToEventParams, applyQFToVenueParams, CatalogType } from '../catalog/query-filter-map';
import { PrismaService } from '../prisma/prisma.service';

export type SeoCatalogType = 'excursion' | 'venue' | 'event';

type SeoContext = {
  city: string;
  city_gen: string;
  type_title: string;
  type_title_plural: string;
  filter_title?: string;
  filter_title2?: string;
  count: number;
  price_from: number | string;
  price_to: number | string;
  season_hint: string;
  year: number;
};

type RelatedLink = { title: string; url: string };

const SITE_URL = 'https://daibilet.ru';
const BASE_FILTERS_KEY = '';

@Injectable()
export class SeoGeneratorService {
  private readonly logger = new Logger(SeoGeneratorService.name);

  private readonly THRESHOLD_L0 = 6;
  private readonly THRESHOLD_L1 = 6;
  private readonly THRESHOLD_L2 = 10;

  private readonly LEVEL2_WHITELIST = new Set<string>([
    'walking|history',
    'boat|night',
    'walking|with-children',
    'art|with-guide',
    'history|with-guide',
    'concert|rock',
    'theatre|classical',
  ]);

  constructor(private readonly prisma: PrismaService) {}

  async upsertSeoForPage(params: { citySlug: string; type: SeoCatalogType; filterSlugs?: string[] }) {
    const filterSlugs = (params.filterSlugs ?? []).filter(Boolean).slice(0, 2);
    const level = filterSlugs.length;

    if (level === 2 && !this.isLevel2Allowed(filterSlugs[0]!, filterSlugs[1]!)) {
      const canonical = this.buildCanonical(params.citySlug, params.type, [filterSlugs[0]!]);
      return this.upsertNoindexStub(params.citySlug, params.type, filterSlugs, canonical);
    }

    const city = await this.prisma.city.findUnique({
      where: { slug: params.citySlug },
      select: { id: true, name: true, slug: true },
    });

    if (!city) throw new Error(`City not found: ${params.citySlug}`);

    const filters =
      filterSlugs.length > 0
        ? await this.prisma.queryFilter.findMany({
            where: { type: params.type, slug: { in: filterSlugs } },
            select: { id: true, slug: true, title: true, group: true, isSeo: true },
          })
        : [];

    if (filters.length !== filterSlugs.length) {
      return this.upsertNoindexStub(
        params.citySlug,
        params.type,
        filterSlugs,
        this.buildCanonical(params.citySlug, params.type),
      );
    }

    const filtersKey = filterSlugs.length ? filterSlugs.join('-') : BASE_FILTERS_KEY;

    const stats = await this.getOfferStats({
      cityId: city.id,
      type: params.type,
      filterSlugs,
    });

    const threshold = this.getThreshold(level);
    if (stats.count < threshold) {
      const canonical =
        level === 0
          ? this.buildCanonical(city.slug, params.type)
          : this.buildCanonical(city.slug, params.type, [filterSlugs[0]!]);
      return this.upsertNoindexStub(city.slug, params.type, filterSlugs, canonical);
    }

    const cityGen = cityToPrepositional(city.name);
    const ctx = this.buildContext({
      cityTitle: city.name,
      cityGen,
      type: params.type,
      count: stats.count,
      priceFrom: stats.priceFrom,
      priceTo: stats.priceTo,
      filter1Title: filters[0]?.title,
      filter2Title: filters[1]?.title,
    });

    const template = await this.pickTemplate(params.type, level);
    const content = this.renderSeo(template, ctx);

    const related = await this.buildRelatedLinks({
      citySlug: city.slug,
      type: params.type,
      currentFilters: filters.map((f) => ({ slug: f.slug, group: f.group, title: f.title })),
      limit: 9,
    });

    const uniqueKey = filtersKey === BASE_FILTERS_KEY ? '' : filtersKey;

    return this.prisma.seoContent.upsert({
      where: {
        cityId_type_filtersKey: {
          cityId: city.id,
          type: params.type,
          filtersKey: uniqueKey,
        },
      },
      update: {
        title: content.title,
        h1: content.h1,
        description: content.description,
        body: content.body,
        noindex: false,
        canonicalUrl: null,
        relatedLinksJson: related as object,
      },
      create: {
        cityId: city.id,
        type: params.type,
        filtersKey: uniqueKey,
        title: content.title,
        h1: content.h1,
        description: content.description,
        body: content.body,
        noindex: false,
        canonicalUrl: null,
        relatedLinksJson: related as object,
      },
    });
  }

  async regenerateAllForCity(citySlug: string) {
    const city = await this.prisma.city.findUnique({ where: { slug: citySlug }, select: { slug: true } });
    if (!city) throw new Error(`City not found: ${citySlug}`);

    const types: SeoCatalogType[] = ['excursion', 'venue', 'event'];

    for (const type of types) {
      await this.upsertSeoForPage({ citySlug, type, filterSlugs: [] });
    }

    for (const type of types) {
      const seoFilters = await this.prisma.queryFilter.findMany({
        where: { type, isSeo: true },
        select: { slug: true },
        orderBy: { priority: 'desc' },
      });

      for (const f of seoFilters) {
        await this.upsertSeoForPage({ citySlug, type, filterSlugs: [f.slug] });
      }

      const slugs = seoFilters.map((x) => x.slug);
      for (let i = 0; i < slugs.length; i++) {
        for (let j = i + 1; j < slugs.length; j++) {
          if (!this.isLevel2Allowed(slugs[i]!, slugs[j]!)) continue;
          await this.upsertSeoForPage({ citySlug, type, filterSlugs: [slugs[i]!, slugs[j]!] });
        }
      }
    }

    return { ok: true };
  }

  private async getOfferStats(params: { cityId: string; type: SeoCatalogType; filterSlugs: string[] }) {
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

    if (params.type === 'venue') {
      const where = this.buildVenueWhere(params.cityId, params.filterSlugs);
      const [count, agg] = await Promise.all([
        this.prisma.venue.count({ where }),
        this.prisma.venue.aggregate({
          where,
          _min: { priceFrom: true },
          _max: { priceFrom: true },
        }),
      ]);
      return {
        count,
        priceFrom: agg._min.priceFrom ?? 0,
        priceTo: agg._max.priceFrom ?? 0,
      };
    }

    const category = params.type === 'excursion' ? EventCategory.EXCURSION : EventCategory.EVENT;
    const where = this.buildEventWhere(params.cityId, category, params.filterSlugs, hasFutureSessions);

    const [count, agg] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.aggregate({
        where,
        _min: { priceFrom: true },
        _max: { priceFrom: true },
      }),
    ]);

    return {
      count,
      priceFrom: agg._min.priceFrom ?? 0,
      priceTo: agg._max.priceFrom ?? 0,
    };
  }

  private buildEventWhere(
    cityId: string,
    category: EventCategory,
    filterSlugs: string[],
    sessionFilter: Prisma.EventWhereInput,
  ): Prisma.EventWhereInput {
    const type: CatalogType = category === EventCategory.EXCURSION ? 'excursion' : 'event';
    const conditions: Prisma.EventWhereInput[] = [];

    for (const slug of filterSlugs) {
      const p = applyQFToEventParams(type, slug);
      if (p.subcategory) {
        conditions.push({ subcategories: { has: p.subcategory as EventSubcategory } });
      }
      if (p.subcategories?.length) {
        conditions.push({ subcategories: { hasSome: p.subcategories as EventSubcategory[] } });
      }
      if (p.tag) {
        conditions.push({ tags: { some: { tag: { slug: p.tag } } } });
      }
      if (p.audience) {
        const audienceFilter: EventAudience | { in: EventAudience[] } =
          p.audience === 'KIDS' ? { in: ['KIDS', 'FAMILY'] } : (p.audience as EventAudience);
        conditions.push({ audience: audienceFilter });
      }
      if (p.maxDuration != null) conditions.push({ durationMinutes: { lte: p.maxDuration } });
      if (p.minDuration != null) conditions.push({ durationMinutes: { gte: p.minDuration } });
      if (p.maxMinAge != null) conditions.push({ minAge: { lte: p.maxMinAge } });
    }

    return {
      cityId,
      category,
      isActive: true,
      isDeleted: false,
      canonicalOfId: null,
      ...sessionFilter,
      ...(conditions.length > 0 && { AND: conditions }),
    };
  }

  private buildVenueWhere(cityId: string, filterSlugs: string[]): Prisma.VenueWhereInput {
    const conditions: Prisma.VenueWhereInput[] = [];

    for (const slug of filterSlugs) {
      const p = applyQFToVenueParams(slug);
      if (p.venueType) {
        conditions.push({ venueType: p.venueType });
      }
      if (p.venueTypes?.length) {
        conditions.push({ venueType: { in: p.venueTypes } });
      }
      if (p.features?.length) {
        conditions.push({ features: { hasSome: p.features } });
      }
    }

    return {
      cityId,
      isActive: true,
      isDeleted: false,
      ...(conditions.length > 0 && { AND: conditions }),
    };
  }

  private getThreshold(level: number) {
    if (level === 0) return this.THRESHOLD_L0;
    if (level === 1) return this.THRESHOLD_L1;
    return this.THRESHOLD_L2;
  }

  private isLevel2Allowed(a: string, b: string) {
    return this.LEVEL2_WHITELIST.has(`${a}|${b}`) || this.LEVEL2_WHITELIST.has(`${b}|${a}`);
  }

  private async pickTemplate(type: SeoCatalogType, level: number) {
    const tpl = await this.prisma.seoTemplate.findFirst({
      where: { type, level, isActive: true },
      orderBy: { priority: 'desc' },
    });
    if (!tpl) throw new Error(`SeoTemplate not found for type=${type} level=${level}`);
    return tpl;
  }

  private renderSeo(
    tpl: { titleTpl: string; h1Tpl: string; descriptionTpl: string; bodyTpl: string },
    ctx: SeoContext,
  ) {
    const title = this.render(tpl.titleTpl, ctx).trim();
    const h1 = this.render(tpl.h1Tpl, ctx).trim();
    const description = this.render(tpl.descriptionTpl, ctx).trim();
    const body = this.render(tpl.bodyTpl, ctx).trim();

    return {
      title: title === h1 ? `${title} — билеты онлайн` : title,
      h1,
      description: this.trimToMeta(description, 160),
      body:
        body.length >= 600
          ? body
          : body +
            '\n\nВыберите подходящий вариант по времени, программе и стоимости — после оплаты вы получите электронное подтверждение.',
    };
  }

  private render(template: string, ctx: Record<string, string | number | undefined>) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, rawKey) => {
      const key = String(rawKey).trim();
      const val = ctx[key];
      return val === undefined || val === null ? '' : String(val);
    });
  }

  private trimToMeta(s: string, max: number) {
    const t = s.replace(/\s+/g, ' ').trim();
    if (t.length <= max) return t;
    return t.slice(0, max - 1).trimEnd() + '…';
  }

  private buildCanonical(citySlug: string, type: SeoCatalogType, filters?: string[]) {
    const path = this.typeToPath(type);
    const base = `${SITE_URL}/${citySlug}/${path}`;
    if (!filters?.length) return base;
    return `${base}/${filters.join('/')}`;
  }

  private async upsertNoindexStub(citySlug: string, type: SeoCatalogType, filterSlugs: string[], canonicalUrl: string) {
    const city = await this.prisma.city.findUnique({ where: { slug: citySlug }, select: { id: true, name: true } });
    if (!city) throw new Error(`City not found: ${citySlug}`);

    const filtersKey = filterSlugs.length ? filterSlugs.join('-') : BASE_FILTERS_KEY;
    const uniqueKey = filtersKey === BASE_FILTERS_KEY ? '' : filtersKey;

    return this.prisma.seoContent.upsert({
      where: {
        cityId_type_filtersKey: {
          cityId: city.id,
          type,
          filtersKey: uniqueKey,
        },
      },
      update: { noindex: true, canonicalUrl },
      create: {
        cityId: city.id,
        type,
        filtersKey,
        title: `${this.typeTitle(type)} в ${city.name}`,
        h1: `${this.typeTitle(type)} в ${city.name}`,
        description: 'Подборка доступна на основной странице раздела.',
        body: 'Перейдите на основную страницу раздела, чтобы увидеть актуальные предложения.',
        noindex: true,
        canonicalUrl,
        relatedLinksJson: [],
      },
    });
  }

  private buildContext(params: {
    cityTitle: string;
    cityGen: string;
    type: SeoCatalogType;
    count: number;
    priceFrom: number;
    priceTo: number;
    filter1Title?: string;
    filter2Title?: string;
  }): SeoContext {
    const year = new Date().getFullYear();
    const { type_title, type_title_plural } = this.typeTitles(params.type);
    const seasonHint = this.seasonHint(params.type);
    const priceFrom = params.priceFrom ? Math.round(params.priceFrom / 100) : 0;
    const priceTo = params.priceTo ? Math.round(params.priceTo / 100) : 0;

    return {
      city: params.cityTitle,
      city_gen: params.cityGen,
      type_title,
      type_title_plural,
      filter_title: params.filter1Title,
      filter_title2: params.filter2Title,
      count: params.count,
      price_from: priceFrom,
      price_to: priceTo,
      season_hint: seasonHint,
      year,
    };
  }

  private typeToPath(type: SeoCatalogType) {
    if (type === 'excursion') return 'excursions';
    if (type === 'venue') return 'museums';
    return 'events';
  }

  private typeTitle(type: SeoCatalogType) {
    return this.typeTitles(type).type_title_plural;
  }

  private typeTitles(type: SeoCatalogType) {
    if (type === 'excursion') return { type_title: 'Экскурсия', type_title_plural: 'Экскурсии' };
    if (type === 'venue') return { type_title: 'Музей', type_title_plural: 'Музеи' };
    return { type_title: 'Мероприятие', type_title_plural: 'Мероприятия' };
  }

  private seasonHint(type: SeoCatalogType) {
    const m = new Date().getMonth();
    const isWinter = [11, 0, 1].includes(m);
    const isSummer = [5, 6, 7].includes(m);
    if (type === 'excursion') {
      if (isSummer) return 'Летом особенно популярны водные маршруты и вечерние прогулки.';
      if (isWinter) return 'Зимой чаще выбирают тёплые форматы и насыщенные маршруты в центре.';
      return 'Сезон влияет на расписание и доступность некоторых маршрутов.';
    }
    if (type === 'venue') {
      if (isWinter) return 'В холодный сезон музеи — самый стабильный и удобный вариант досуга.';
      return 'В выходные и праздничные дни лучше бронировать заранее.';
    }
    if (isSummer) return 'Летом больше open-air форматов и фестивалей.';
    return 'Актуальность афиши меняется ежедневно — проверяйте даты и наличие билетов.';
  }

  private async buildRelatedLinks(params: {
    citySlug: string;
    type: SeoCatalogType;
    currentFilters: { slug: string; group: string; title: string }[];
    limit: number;
  }): Promise<RelatedLink[]> {
    const baseUrl = `${SITE_URL}/${params.citySlug}/${this.typeToPath(params.type)}`;
    const links: RelatedLink[] = [];

    if (params.currentFilters.length > 0) {
      links.push({
        title: `Все ${this.typeTitle(params.type).toLowerCase()} в ${params.citySlug}`,
        url: baseUrl,
      });
    }

    const primary = params.currentFilters[0];
    if (primary) {
      const siblings = await this.prisma.queryFilter.findMany({
        where: {
          type: params.type,
          group: primary.group,
          isSeo: true,
          slug: { not: primary.slug },
        },
        select: { slug: true, title: true },
        orderBy: { priority: 'desc' },
        take: 6,
      });
      for (const s of siblings) {
        links.push({ title: s.title, url: `${baseUrl}/${s.slug}` });
      }
    }

    const curated = this.curatedLinks(params.type);
    for (const slug of curated) {
      if (params.currentFilters.some((f) => f.slug === slug)) continue;
      const f = await this.prisma.queryFilter.findFirst({
        where: { type: params.type, slug },
        select: { title: true },
      });
      links.push({ title: f?.title ?? slug, url: `${baseUrl}/${slug}` });
    }

    const city = await this.prisma.city.findUnique({ where: { slug: params.citySlug }, select: { id: true } });
    if (!city) return links.slice(0, params.limit);

    const filtered = await this.filterLinksByCount(city.id, params.type, params.citySlug, links, this.THRESHOLD_L1);
    const uniq = new Map<string, RelatedLink>();
    for (const l of filtered) uniq.set(l.url, l);
    return Array.from(uniq.values()).slice(0, params.limit);
  }

  private curatedLinks(type: SeoCatalogType) {
    if (type === 'excursion') return ['walking', 'history', 'night', 'with-children', 'boat'];
    if (type === 'venue') return ['art', 'history', 'interactive', 'with-guide', 'family'];
    return ['concert', 'theatre', 'festival', 'rock', 'classical'];
  }

  private async filterLinksByCount(
    cityId: string,
    type: SeoCatalogType,
    citySlug: string,
    links: RelatedLink[],
    threshold: number,
  ) {
    const basePath = `/${citySlug}/${this.typeToPath(type)}`;
    const out: RelatedLink[] = [];

    for (const link of links) {
      try {
        const u = new URL(link.url);
        const path = u.pathname.replace(/\/$/, '');
        if (path === basePath) {
          out.push(link);
          continue;
        }
        const parts = path.split('/').filter(Boolean);
        const filterSlug = parts[2];
        if (!filterSlug) continue;
        const filter = await this.prisma.queryFilter.findFirst({
          where: { type, slug: filterSlug, isSeo: true },
          select: { id: true },
        });
        if (!filter) continue;
        const stats = await this.getOfferStats({ cityId, type, filterSlugs: [filterSlug] });
        if (stats.count >= threshold) out.push(link);
      } catch {
        // ignore
      }
    }
    return out;
  }
}
