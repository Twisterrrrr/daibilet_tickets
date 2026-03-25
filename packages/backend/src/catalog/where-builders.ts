/**
 * T10 — типобезопасные Prisma where builders.
 * Вместо where: any в сервисах.
 *
 * Tag-fallback (read-path): при одновременном `subcategory` и фильтрах по тегам условия объединяются OR —
 * см. `Catalog-Classification-Policy.md` §11. Для страницы тега — `CatalogService.getTagBySlug`.
 */

import { EventSource, Prisma } from '@prisma/client';
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

/**
 * Базовые условия публичной витрины для Event (как в каталоге): активность, не дубль, правила импорта.
 * Без фильтров по городу/сеансам — для переиспользования (venue program и т.д.).
 */
export function buildCatalogPublishableCoreWhere(): Prisma.EventWhereInput {
  const importsEnabled = process.env.IMPORT_SOURCES_ENABLED !== '0';
  return {
    isActive: true,
    isDeleted: false,
    canonicalOfId: null,
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
  };
}

/** T10: Собрать EventWhereInput из DTO. sessionFilter — дата/сеансы из catalog.fetchEvents (обязателен для выдачи). */
export function buildEventWhere(
  dto: EventWhereDto,
  sessionFilter?: Prisma.EventWhereInput,
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
    dateMode: _dateMode,
    isOpenDateOnly: _isOpenDateOnly,
  } = dto;

  const where: Prisma.EventWhereInput = {
    ...buildCatalogPublishableCoreWhere(),
    ...(cityIds?.length ? { cityId: { in: cityIds } } : {}),
    city: {
      isActive: true,
      ...(city && !cityIds?.length && { slug: city }),
    },
    ...(category && { category: category as Prisma.EnumEventCategoryFilter }),
    ...(audience === 'KIDS'
      ? { audience: { in: ['KIDS', 'FAMILY'] } }
      : audience
        ? { audience: audience as Prisma.EnumEventAudienceFilter }
        : {}),
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

  const andParts: Prisma.EventWhereInput[] = [];

  if (hasPhoto === true) {
    andParts.push({ AND: [{ imageUrl: { not: null } }, { imageUrl: { not: '' } }] });
  }

  const subcategoryPolicy = new SubcategoryPolicyService();
  const subFilter: Prisma.EventWhereInput | null = subcategory
    ? subcategoryPolicy.buildEventSubcategoryFilter(subcategory)
    : null;

  const tagClauses: Prisma.EventWhereInput[] = [];
  if (tag?.trim()) {
    tagClauses.push({ tags: { some: { tag: { slug: tag.trim() } } } });
  }
  if (structuralTags?.length) {
    for (const slug of structuralTags) {
      tagClauses.push({ tags: { some: { tag: { slug, tagKind: TagKind.STRUCTURAL } } } });
    }
  }
  if (popularTags?.length) {
    for (const slug of popularTags) {
      tagClauses.push({ tags: { some: { tag: { slug, tagKind: TagKind.POPULAR } } } });
    }
  }

  const tagBlob: Prisma.EventWhereInput | null =
    tagClauses.length === 0 ? null : tagClauses.length === 1 ? tagClauses[0]! : { AND: tagClauses };

  if (subFilter && tagBlob) {
    andParts.push({ OR: [subFilter, tagBlob] });
  } else if (subFilter) {
    andParts.push(subFilter);
  } else if (tagBlob) {
    andParts.push(tagBlob);
  }

  if (sessionFilter && Object.keys(sessionFilter).length > 0) {
    andParts.push(sessionFilter);
  }

  if (andParts.length) {
    where.AND = andParts;
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
