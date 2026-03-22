/**
 * T10 — типобезопасные Prisma where builders.
 * Вместо where: any в сервисах.
 */

import { DateMode, EventSource, EventSubcategory, Prisma } from '@prisma/client';

export interface EventWhereDto {
  city?: string;
  cityIds?: string[];
  category?: string;
  subcategory?: string;
  audience?: string;
  tag?: string;
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
    ...(subcategory &&
      (subcategory === 'RIVER'
        ? {
            AND: [
              { subcategories: { has: 'RIVER' as EventSubcategory } },
              { NOT: { subcategories: { has: 'BUS' as EventSubcategory } } },
            ],
          }
        : { subcategories: { has: subcategory as EventSubcategory } })),
    ...(audience === 'KIDS'
      ? { audience: { in: ['KIDS', 'FAMILY'] } }
      : audience
        ? { audience: audience as Prisma.EnumEventAudienceFilter }
        : {}),
    ...(tag && { tags: { some: { tag: { slug: tag } } } }),
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
