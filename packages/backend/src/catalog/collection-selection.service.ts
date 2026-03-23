import { Injectable } from '@nestjs/common';
import { DateMode, EventAudience, EventCategory, EventSubcategory, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

type AdditionalFilters = {
  citySlugs?: string[];
  maxDuration?: number;
  minDuration?: number;
  dateMode?: string;
};

export type SelectionRankingPreset = 'popularity' | 'availability' | 'balanced';

export type SelectionInput = {
  cityId?: string | null;
  citySlug?: string;
  filterTags?: string[];
  filterCategory?: string | null;
  filterSubcategory?: string | null;
  filterAudience?: string | null;
  additionalFilters?: unknown;
  ranking?: { preset?: SelectionRankingPreset } | null;
  pinnedEventIds?: string[];
  excludedEventIds?: string[];
  page?: number;
  limit?: number;
};

@Injectable()
export class CollectionSelectionService {
  constructor(private readonly prisma: PrismaService) {}

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

    if (input.filterTags && input.filterTags.length > 0) {
      where.tags = { some: { tag: { slug: { in: input.filterTags } } } };
    }
    if (input.filterCategory) where.category = input.filterCategory as EventCategory;
    if (input.filterSubcategory) where.subcategories = { has: input.filterSubcategory as EventSubcategory };
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

  resolveOrderBy(ranking?: { preset?: SelectionRankingPreset } | null): Prisma.EventOrderByWithRelationInput[] {
    const preset = ranking?.preset ?? 'balanced';
    if (preset === 'availability') {
      return [{ sessions: { _count: 'desc' } }, { rating: 'desc' }, { reviewCount: 'desc' }];
    }
    if (preset === 'popularity') {
      return [{ reviewCount: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }];
    }
    return [{ rating: 'desc' }, { reviewCount: 'desc' }, { createdAt: 'desc' }];
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
      orderBy: this.resolveOrderBy(input.ranking),
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

    const items = page === 1 ? [...pinnedEvents, ...events] : events;
    return {
      items,
      total: totalFiltered + pinnedEvents.length,
      page,
      totalPages: Math.ceil((totalFiltered + pinnedEvents.length) / limit),
      preview: {
        generatedAt: new Date(),
        eventCount: totalFiltered + pinnedEvents.length,
      },
    };
  }
}
