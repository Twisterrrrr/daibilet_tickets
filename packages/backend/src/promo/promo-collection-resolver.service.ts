import { Injectable } from '@nestjs/common';
import { DateMode, EventCategory, Prisma, PromoSortMode } from '@/prisma-client';

import { PrismaService } from '../prisma/prisma.service';
import { SubcategoryPolicyService } from '../subcategories/subcategory-policy.service';

export interface ResolvedEvent {
  id: string;
  slug: string;
  title: string;
  category: string;
  imageUrl: string | null;
  priceFrom: number | null;
  rating: number;
  city?: { slug: string; name: string };
}

export interface ResolvedVenue {
  id: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  priceFrom: number | null;
  rating: number;
  city?: { slug: string; name: string };
}

@Injectable()
export class PromoCollectionResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subcategoryPolicy: SubcategoryPolicyService,
  ) {}

  private get activeEventWhere(): Prisma.EventWhereInput {
    const now = new Date();
    return {
      isActive: true,
      isDeleted: false,
      canonicalOfId: null,
      OR: [{ override: null }, { override: { editorStatus: 'PUBLISHED' } }],
      AND: [
        {
          OR: [
            {
              dateMode: DateMode.SCHEDULED,
              sessions: { some: { isActive: true, startsAt: { gte: now } } },
            },
            {
              dateMode: DateMode.OPEN_DATE,
              OR: [{ endDate: null }, { endDate: { gte: now } }],
            },
          ],
        },
      ],
    };
  }

  private get activeVenueWhere(): Prisma.VenueWhereInput {
    return {
      isActive: true,
      isDeleted: false,
    };
  }

  async resolveEvents(collectionId: string): Promise<ResolvedEvent[]> {
    const collection = await this.prisma.promoCollection.findUniqueOrThrow({
      where: { id: collectionId },
      include: { items: true, rule: true },
    });

    if (collection.selectionMode === 'MANUAL') {
      const items = collection.items
        .filter((i) => i.itemType === 'EVENT' && i.eventId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      if (items.length === 0) return [];
      const events = await this.prisma.event.findMany({
        where: {
          id: { in: items.map((i) => i.eventId!).filter(Boolean) },
          ...this.activeEventWhere,
        },
        include: {
          city: { select: { slug: true, name: true } },
        },
      });
      const orderMap = new Map(items.map((i, idx) => [i.eventId!, idx]));
      return events
        .sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999))
        .map((e) => ({
          id: e.id,
          slug: e.slug,
          title: e.title,
          category: e.category,
          imageUrl: e.imageUrl,
          priceFrom: e.priceFrom,
          rating: Number(e.rating),
          city: e.city,
        }));
    }

    const rule = collection.rule;
    if (!rule) return [];

    const tagOrSubcategory =
      rule.tagSlugs?.length
        ? ({
            OR: [
              { tags: { some: { tag: { slug: { in: rule.tagSlugs } } } } },
              {
                OR: rule.tagSlugs.map((slug) => this.subcategoryPolicy.buildEventSubcategoryFilter(slug)),
              },
            ],
          } as Prisma.EventWhereInput)
        : {};

    const where: Prisma.EventWhereInput = {
      ...this.activeEventWhere,
      city: { isActive: true, ...(rule.citySlug && { slug: rule.citySlug }) },
      ...(rule.categorySlug && { category: rule.categorySlug as EventCategory }),
      ...tagOrSubcategory,
      ...(rule.isKids === true && { audience: { in: ['KIDS', 'FAMILY'] } }),
      ...(rule.isIndoor === true && { indoor: true }),
    };

    const orderBy: Prisma.EventOrderByWithRelationInput[] = (() => {
      switch (rule.sortMode) {
        case PromoSortMode.RATING:
          return [{ rating: 'desc' }, { reviewCount: 'desc' }, { createdAt: 'desc' }];
        case PromoSortMode.SOONEST:
          return [{ sessions: { _count: 'desc' } }, { createdAt: 'desc' }];
        case PromoSortMode.RANDOM:
          return [{ id: 'asc' }];
        case PromoSortMode.POPULAR:
        default:
          return [{ reviewCount: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }];
      }
    })();

    const events = await this.prisma.event.findMany({
      where,
      orderBy: rule.sortMode === 'RANDOM' ? [{ id: 'asc' }] : orderBy,
      take: Math.min(Math.max(rule.limit, 1), 50),
      include: {
        city: { select: { slug: true, name: true } },
      },
    });

    if (rule.sortMode === 'RANDOM' && events.length > 1) {
      const shuffled = [...events];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled.slice(0, rule.limit).map((e) => ({
        id: e.id,
        slug: e.slug,
        title: e.title,
        category: e.category,
        imageUrl: e.imageUrl,
        priceFrom: e.priceFrom,
        rating: Number(e.rating),
        city: e.city,
      }));
    }

    return events.map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      category: e.category,
      imageUrl: e.imageUrl,
      priceFrom: e.priceFrom,
      rating: Number(e.rating),
      city: e.city,
    }));
  }

  async resolveVenues(collectionId: string): Promise<ResolvedVenue[]> {
    const collection = await this.prisma.promoCollection.findUniqueOrThrow({
      where: { id: collectionId },
      include: { items: true, rule: true },
    });

    if (collection.selectionMode === 'MANUAL') {
      const items = collection.items
        .filter((i) => i.itemType === 'VENUE' && i.venueId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      if (items.length === 0) return [];
      const venues = await this.prisma.venue.findMany({
        where: {
          id: { in: items.map((i) => i.venueId!).filter(Boolean) },
          ...this.activeVenueWhere,
        },
        include: {
          city: { select: { slug: true, name: true } },
        },
      });
      const orderMap = new Map(items.map((i, idx) => [i.venueId!, idx]));
      return venues
        .sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999))
        .map((v) => ({
          id: v.id,
          slug: v.slug,
          title: v.title,
          imageUrl: v.imageUrl,
          priceFrom: v.priceFrom,
          rating: Number(v.rating),
          city: v.city,
        }));
    }

    const rule = collection.rule;
    if (!rule) return [];

    const where: Prisma.VenueWhereInput = {
      ...this.activeVenueWhere,
      city: { isActive: true, ...(rule.citySlug && { slug: rule.citySlug }) },
    };

    if (rule.onlyBookable || rule.onlyActive) {
      const tagOrSubVenueEvents =
        rule.tagSlugs?.length
          ? {
              OR: [
                { tags: { some: { tag: { slug: { in: rule.tagSlugs } } } } },
                {
                  OR: rule.tagSlugs.map((slug) => this.subcategoryPolicy.buildEventSubcategoryFilter(slug)),
                },
              ],
            }
          : {};

      const eventFilter: Prisma.EventWhereInput = {
        isActive: true,
        isDeleted: false,
        canonicalOfId: null,
        OR: [{ override: null }, { override: { editorStatus: 'PUBLISHED' } }],
        ...tagOrSubVenueEvents,
        ...(rule.categorySlug && { category: rule.categorySlug as EventCategory }),
        ...(rule.isKids === true && { audience: { in: ['KIDS', 'FAMILY'] } }),
      };
      (where as Prisma.VenueWhereInput).events = { some: eventFilter };
    }

    const venues = await this.prisma.venue.findMany({
      where,
      orderBy:
        rule.sortMode === 'RATING'
          ? [{ rating: 'desc' }, { reviewCount: 'desc' }]
          : [{ reviewCount: 'desc' }, { rating: 'desc' }],
      take: Math.min(Math.max(rule.limit, 1), 50),
      include: {
        city: { select: { slug: true, name: true } },
      },
    });

    return venues.map((v) => ({
      id: v.id,
      slug: v.slug,
      title: v.title,
      imageUrl: v.imageUrl,
      priceFrom: v.priceFrom,
      rating: Number(v.rating),
      city: v.city,
    }));
  }
}
