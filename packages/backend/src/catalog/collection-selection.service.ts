import { Injectable } from '@nestjs/common';
import { DateMode, EventAudience, EventCategory, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { SubcategoryPolicyService } from '../subcategories/subcategory-policy.service';

type AdditionalFilters = {
  citySlugs?: string[];
  maxDuration?: number;
  minDuration?: number;
  dateMode?: string;
};

export type SelectionRankingPreset = 'popularity' | 'availability' | 'balanced';
export type SelectionSortMode = SelectionRankingPreset | 'score';
export type ScoringWeights = {
  popularity: number;
  conversion: number;
  quality: number;
  availability: number;
};

export type SelectionInput = {
  cityId?: string | null;
  citySlug?: string;
  filterTags?: string[];
  filterCategory?: string | null;
  filterSubcategory?: string | null;
  filterAudience?: string | null;
  additionalFilters?: unknown;
  ranking?: { preset?: SelectionRankingPreset } | null;
  sort?: SelectionSortMode;
  debugScore?: boolean;
  pinnedEventIds?: string[];
  excludedEventIds?: string[];
  page?: number;
  limit?: number;
};

@Injectable()
export class CollectionSelectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subcategoryPolicy: SubcategoryPolicyService,
  ) {}

  getWeights(): ScoringWeights {
    return {
      popularity: Number(process.env.COLLECTION_WEIGHT_POPULARITY ?? 0.35),
      conversion: Number(process.env.COLLECTION_WEIGHT_CONVERSION ?? 0.2),
      quality: Number(process.env.COLLECTION_WEIGHT_QUALITY ?? 0.25),
      availability: Number(process.env.COLLECTION_WEIGHT_AVAILABILITY ?? 0.2),
    };
  }

  buildWhere(input: SelectionInput): Prisma.EventWhereInput {
    const where: Prisma.EventWhereInput = {
      isActive: true,
      isDeleted: false,
      canonicalOfId: null,
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

    if (input.cityId) where.cityId = input.cityId;
    else if (input.citySlug) where.city = { slug: input.citySlug, isActive: true };

    const hasTags = Boolean(input.filterTags && input.filterTags.length > 0);
    const tagWhere: Prisma.EventWhereInput | null = hasTags
      ? { tags: { some: { tag: { slug: { in: input.filterTags! } } } } }
      : null;
    if (input.filterCategory) where.category = input.filterCategory as EventCategory;

    const subWhere: Prisma.EventWhereInput | null = input.filterSubcategory
      ? this.subcategoryPolicy.buildEventSubcategoryFilter(input.filterSubcategory)
      : null;

    if (tagWhere && subWhere) {
      const existingAnd = where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : [];
      where.AND = [...existingAnd, { OR: [tagWhere, subWhere] }];
    } else if (tagWhere && input.filterTags?.length) {
      where.tags = { some: { tag: { slug: { in: input.filterTags } } } };
    } else if (subWhere) {
      const existingAnd = where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : [];
      where.AND = [...existingAnd, subWhere];
    }
    if (input.filterAudience) {
      if (input.filterAudience === 'KIDS') where.audience = { in: [EventAudience.KIDS, EventAudience.FAMILY] };
      else where.audience = input.filterAudience as EventAudience;
    }

    const additional = (input.additionalFilters as AdditionalFilters | null) ?? null;
    if (additional) {
      if (Array.isArray(additional.citySlugs) && additional.citySlugs.length > 0) {
        where.city = { slug: { in: additional.citySlugs }, isActive: true };
      }
      if (additional.maxDuration) {
        const prev = (where.durationMinutes ?? {}) as Prisma.IntFilter;
        where.durationMinutes = { ...prev, lte: additional.maxDuration };
      }
      if (additional.minDuration) {
        const prev = (where.durationMinutes ?? {}) as Prisma.IntFilter;
        where.durationMinutes = { ...prev, gte: additional.minDuration };
      }
      if (additional.dateMode) {
        delete where.OR;
        if (additional.dateMode === 'OPEN_DATE') {
          where.dateMode = DateMode.OPEN_DATE;
        } else {
          where.dateMode = DateMode.SCHEDULED;
          where.sessions = { some: { isActive: true, startsAt: { gte: new Date() } } };
        }
      }
    }
    return where;
  }

  resolveOrderBy(ranking?: { preset?: SelectionRankingPreset } | null, sort?: SelectionSortMode): Prisma.EventOrderByWithRelationInput[] {
    const preset = sort && sort !== 'score' ? sort : (ranking?.preset ?? 'balanced');
    if (preset === 'availability') {
      return [{ sessions: { _count: 'desc' } }, { rating: 'desc' }, { reviewCount: 'desc' }];
    }
    if (preset === 'popularity') {
      return [{ reviewCount: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }];
    }
    return [{ rating: 'desc' }, { reviewCount: 'desc' }, { createdAt: 'desc' }];
  }

  scoreEvent(
    event: { reviewCount: number; rating: unknown; sessions?: Array<{ availableTickets: number | null }> },
    weights: ScoringWeights,
  ): number {
    const rating = typeof event.rating === 'number' ? event.rating : Number(event.rating ?? 0);
    const popularity = Math.min(1, event.reviewCount / 300);
    const conversion = Math.min(1, (rating * Math.log1p(event.reviewCount)) / 50);
    const quality = Math.min(1, rating / 5);
    const availabilityCount = (event.sessions ?? []).filter((session) => (session.availableTickets ?? 0) > 0).length;
    const availability = Math.min(1, availabilityCount / 3);
    return (
      popularity * weights.popularity +
      conversion * weights.conversion +
      quality * weights.quality +
      availability * weights.availability
    );
  }

  async resolveSelection(input: SelectionInput) {
    const where = this.buildWhere(input);
    const pinnedIds = input.pinnedEventIds ?? [];
    const excludedIds = [...(input.excludedEventIds ?? []), ...pinnedIds];
    const page = Math.max(1, input.page ?? 1);
    const limit = Math.min(100, Math.max(1, input.limit ?? 20));

    const [pinnedEvents, totalFiltered] = await Promise.all([
      pinnedIds.length
        ? this.prisma.event.findMany({
            where: { id: { in: pinnedIds }, isActive: true, isDeleted: false },
            include: { city: { select: { slug: true, name: true } }, tags: { include: { tag: true } } },
          })
        : Promise.resolve([]),
      this.prisma.event.count({ where: { ...where, id: { notIn: excludedIds } } }),
    ]);

    const orderMap = new Map(pinnedIds.map((id, index) => [id, index]));
    pinnedEvents.sort((a, b) => (orderMap.get(a.id) ?? 99999) - (orderMap.get(b.id) ?? 99999));

    const skip = (page - 1) * limit;
    const adjustedLimit = page === 1 ? Math.max(1, limit - pinnedEvents.length) : limit;
    const adjustedSkip = page === 1 ? 0 : Math.max(0, skip - pinnedEvents.length);

    const events = await this.prisma.event.findMany({
      where: { ...where, id: { notIn: excludedIds } },
      orderBy: this.resolveOrderBy(input.ranking, input.sort),
      skip: adjustedSkip,
      take: adjustedLimit,
      include: {
        city: { select: { slug: true, name: true } },
        tags: { include: { tag: true } },
        sessions: {
          where: { isActive: true, startsAt: { gte: new Date() } },
          orderBy: { startsAt: 'asc' },
          take: 3,
          select: { startsAt: true, availableTickets: true },
        },
      },
    });

    const weights = this.getWeights();
    const merged = page === 1 ? [...pinnedEvents, ...events] : events;
    const scored = merged.map((event) => ({ event, score: this.scoreEvent(event, weights) }));
    if (input.sort === 'score') {
      scored.sort((a, b) => b.score - a.score);
    }
    const items = input.debugScore
      ? scored.map(({ event, score }) => ({ ...event, _selectionScore: score }))
      : scored.map(({ event }) => event);
    return {
      items,
      total: totalFiltered + pinnedEvents.length,
      page,
      totalPages: Math.ceil((totalFiltered + pinnedEvents.length) / limit),
      preview: {
        generatedAt: new Date(),
        eventCount: totalFiltered + pinnedEvents.length,
        weights,
      },
    };
  }
}
