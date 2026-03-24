import { DateMode, EventCategory, EventSource, Prisma } from '@prisma/client';

import { SubcategoryPolicyService } from '../subcategories/subcategory-policy.service';

/**
 * Единый отбор событий для лендинга: (тег) OR (подкатегории из additionalFilters),
 * плюс category/source/duration из additionalFilters и окно дат (сеансы / OPEN_DATE).
 * Если ни тега, ни подкатегорий — null (пустая выдача).
 */
export function buildLandingEventsWhere(params: {
  cityId: string;
  now: Date;
  tag: { id: string } | null;
  additionalFilters: unknown;
  subcategoryPolicy: SubcategoryPolicyService;
}): Prisma.EventWhereInput | null {
  const { cityId, now, tag, additionalFilters, subcategoryPolicy } = params;
  const af = (additionalFilters ?? {}) as Record<string, unknown>;

  const extraWhere: Prisma.EventWhereInput = {};
  if (typeof af.category === 'string') {
    extraWhere.category = af.category as EventCategory;
  }
  if (typeof af.source === 'string') {
    extraWhere.source = af.source as EventSource;
  }
  const minD = typeof af.minDuration === 'number' ? af.minDuration : undefined;
  const maxD = typeof af.maxDuration === 'number' ? af.maxDuration : undefined;
  if (minD !== undefined || maxD !== undefined) {
    extraWhere.durationMinutes = {
      ...(minD !== undefined && { gte: minD }),
      ...(maxD !== undefined && { lte: maxD }),
    };
  }

  const rawSubs = Array.isArray(af.subcategories) ? af.subcategories : [];
  const subcategorySlugs = rawSubs.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  const subcategoryClauses = subcategorySlugs.map((s) => subcategoryPolicy.buildEventSubcategoryFilter(s));

  const branches: Prisma.EventWhereInput[] = [];
  if (tag) {
    branches.push({ tags: { some: { tagId: tag.id } } });
  }
  for (const clause of subcategoryClauses) {
    branches.push(clause);
  }

  if (branches.length === 0) {
    return null;
  }

  const eligibility: Prisma.EventWhereInput = branches.length === 1 ? branches[0]! : { OR: branches };

  return {
    isActive: true,
    isDeleted: false,
    cityId,
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
    ...extraWhere,
    AND: [eligibility],
  };
}
