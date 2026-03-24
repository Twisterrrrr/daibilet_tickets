/**
 * T10 — типобезопасные Prisma where builders.
 * Вместо where: any в сервисах.
 */

import { DateMode, EventSource, EventSubcategory, Prisma } from '@prisma/client';
import { TagKind } from '@prisma/client';
import { SubcategoryPolicyService } from '../subcategories/subcategory-policy.service';

export interface EventWhereDto {
  city?: string;
  cityIds?: string[];
  category?: string;
  subcategory?: string;
  audience?: string;
  tag?: string;
  structuralTags?: string[];
  popularTags?: string[];
  pier?: string;
  maxDuration?: number;
  minDuration?: number;
  maxMinAge?: number;
  venueId?: string;
  priceMin?: number;
  priceMax?: number;
  hasPhoto?: boolean;
  slugs?: string;
  timeOfDay?: string; // обрабатывается отдельно в catalog.service (raw SQL)
  dateMode?: string;
  isOpenDateOnly?: boolean;
}

export interface VenueWhereDto {
  city?: string;
  q?: string;
}

/** Базовый фильтр сессий: SCHEDULED с будущими сеансами ИЛИ OPEN_DATE. */
function _sessionFilter(isOpenDateOnly?: boolean): Prisma.EventWhereInput {
  const now = new Date();
  if (isOpenDateOnly) {
    return {
      dateMode: DateMode.OPEN_DATE,
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    };
  }
  return {
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
  };
}

/** T10: Собрать EventWhereInput из DTO. sessionFilterOverride — для date-aware фильтров (dateFrom, dateTo, departing_soon). */
export function buildEventWhere(
  dto: EventWhereDto,
  _sessionFilterOverride?: Prisma.EventWhereInput,
): Prisma.EventWhereInput {
  const {
    city,
    cityIds,
    category,
    subcategory,
    audience,
    tag,
    structuralTags,
    popularTags,
    pier,
    maxDuration,
    minDuration,
    maxMinAge,
    venueId,
    priceMin,
    priceMax,
    hasPhoto,
    slugs,
    timeOfDay: _timeOfDay,
    dateMode,
    isOpenDateOnly: _isOpenDateOnly,
  } = dto;

  const importsEnabled = process.env.IMPORT_SOURCES_ENABLED !== '0';

  const where: Prisma.EventWhereInput = {
    isActive: true,
    isDeleted: false,
    canonicalOfId: null,
    // В прод-каталоге: MANUAL — всегда, TC/TEPLOHOD — только с override.editorStatus=PUBLISHED.
    // IMPORT_SOURCES_ENABLED=0 — скрыть импорт полностью (только MANUAL).
    ...(process.env.NODE_ENV === 'production'
      ? importsEnabled
        ? {
            OR: [
              { source: EventSource.MANUAL },
              {
                source: { in: [EventSource.TC, EventSource.TEPLOHOD] },
                override: { editorStatus: 'PUBLISHED', suppressLowQuality: { not: true } },
              },
            ],
          }
        : { source: EventSource.MANUAL }
      : {}),
    ...(cityIds?.length ? { cityId: { in: cityIds } } : {}),
    city: {
      isActive: true,
      ...(city && !cityIds?.length && { slug: city }),
    },
    ...(category && { category: category as Prisma.EnumEventCategoryFilter }),
    ...(subcategory ? new SubcategoryPolicyService().buildEventSubcategoryFilter(subcategory) : {}),
    ...(audience === 'KIDS'
      ? { audience: { in: ['KIDS', 'FAMILY'] } }
      : audience
        ? { audience: audience as Prisma.EnumEventAudienceFilter }
        : {}),
    ...(tag && { tags: { some: { tag: { slug: tag } } } }),
    // NOTE: структурные/популярные теги обрабатываются ниже через AND-логику
    ...(pier && { startLocationId: pier }),
    ...(maxDuration != null || minDuration != null
      ? {
          durationMinutes: {
            ...(maxDuration != null && { lte: maxDuration }),
            ...(minDuration != null && { gte: minDuration }),
          },
        }
      : {}),
    ...(maxMinAge != null && { minAge: { lte: maxMinAge } }),
    ...(venueId && { venueId }),
    ...(priceMin != null || priceMax != null
      ? {
          priceFrom: {
            ...(priceMin != null && { gte: priceMin }),
            ...(priceMax != null && { lte: priceMax }),
          },
        }
      : {}),
    ...(hasPhoto === true
      ? { AND: [{ imageUrl: { not: null } }, { imageUrl: { not: '' } }] }
      : {}),
    ...(slugs?.trim()
      ? {
          slug: {
            in: slugs
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          },
        }
      : {}),
  };

  if (dateMode === 'OPEN_DATE') {
    (where as Record<string, unknown>).dateMode = DateMode.OPEN_DATE;
    (where as Record<string, unknown>).OR = [{ endDate: null }, { endDate: { gte: new Date() } }];
  } else if (dateMode === 'SCHEDULED') {
    (where as Record<string, unknown>).dateMode = DateMode.SCHEDULED;
    (where as Record<string, unknown>).sessions = {
      some: { isActive: true, startsAt: { gte: new Date() } },
    };
  }

  // timeOfDay требует raw SQL (EXTRACT HOUR) — обрабатывается отдельно в catalog.service

  // structuralTags/popularTags: AND по всем тегам внутри списка,
  // и AND между structuralTags и popularTags.
  const andFilters: Prisma.EventWhereInput[] = [];
  if (structuralTags?.length) {
    for (const slug of structuralTags) {
      andFilters.push({ tags: { some: { tag: { slug, tagKind: TagKind.STRUCTURAL } } } });
    }
  }
  if (popularTags?.length) {
    for (const slug of popularTags) {
      andFilters.push({ tags: { some: { tag: { slug, tagKind: TagKind.POPULAR } } } });
    }
  }
  if (andFilters.length) {
    const existingAnd = where.AND
      ? Array.isArray(where.AND)
        ? where.AND
        : [where.AND]
      : [];
    where.AND = [...existingAnd, ...andFilters];
  }

  return where;
}

/** T10: Собрать VenueWhereInput из DTO. */
export function buildVenueWhere(dto: VenueWhereDto): Prisma.VenueWhereInput {
  const { city, q } = dto;
  return {
    isActive: true,
    isDeleted: false,
    ...(city && { city: { slug: city } }),
    ...(q &&
      q.trim() && {
        OR: [
          { title: { contains: q.trim(), mode: 'insensitive' } },
          { shortTitle: { contains: q.trim(), mode: 'insensitive' } },
        ],
      }),
  };
}
