import { Prisma } from '@/prisma-client';

import type { VenueAdminReadinessStatus } from './venue-admin-readiness.util';

/**
 * Условие «есть непустая строка локации» (как venueDisplayAddress: address → raw → normalized).
 */
function hasLocationLineWhere(): Prisma.VenueWhereInput {
  return {
    OR: [
      { AND: [{ address: { not: null } }, { NOT: { address: { equals: '' } } }] },
      { AND: [{ rawAddress: { not: null } }, { NOT: { rawAddress: { equals: '' } } }] },
      { AND: [{ normalizedAddress: { not: null } }, { NOT: { normalizedAddress: { equals: '' } } }] },
    ],
  };
}

function hasDescriptionWhere(): Prisma.VenueWhereInput {
  return {
    OR: [
      { AND: [{ shortDescription: { not: null } }, { NOT: { shortDescription: { equals: '' } } }] },
      { AND: [{ description: { not: null } }, { NOT: { description: { equals: '' } } }] },
    ],
  };
}

function hasCoverWhere(): Prisma.VenueWhereInput {
  return {
    AND: [{ imageUrl: { not: null } }, { NOT: { imageUrl: { equals: '' } } }],
  };
}

/** Как в computeVenueAdminReadiness: при наличии адреса отсутствие lat/lng даёт warning → не READY. */
function coordsMissingWhileHasAddressWhere(): Prisma.VenueWhereInput {
  return {
    AND: [hasLocationLineWhere(), { OR: [{ lat: null }, { lng: null }] }],
  };
}

const NOT_END_STATES: Prisma.EnumVenueLifecycleStatusFilter = { notIn: ['MERGED', 'REJECTED'] };

/**
 * Фильтр списка по readinessStatus, согласованный с {@link computeVenueAdminReadiness} (SQL-аппроксимация).
 * Граничные кейсы (только пробелы в строках) могут отличаться от пост-маппера на строке.
 */
export function venueReadinessListWhere(status: VenueAdminReadinessStatus): Prisma.VenueWhereInput {
  switch (status) {
    case 'BLOCKED':
      return { lifecycleStatus: { in: ['MERGED', 'REJECTED'] } };

    case 'NEEDS_REVIEW':
      return {
        lifecycleStatus: NOT_END_STATES,
        needsReview: true,
      };

    case 'READY':
      return {
        lifecycleStatus: NOT_END_STATES,
        needsReview: false,
        AND: [
          { NOT: { title: { equals: '' } } },
          hasLocationLineWhere(),
          hasDescriptionWhere(),
          hasCoverWhere(),
          { mergeTargetId: null },
          {
            OR: [{ confidenceScore: null }, { confidenceScore: { gte: 0.45 } }],
          },
          {
            NOT: {
              AND: [
                { lifecycleStatus: 'ACTIVE' },
                { isPublished: true },
                { isVenuePageWhitelisted: false },
              ],
            },
          },
          { NOT: coordsMissingWhileHasAddressWhere() },
        ],
      };

    case 'NEEDS_WORK':
      return {
        lifecycleStatus: NOT_END_STATES,
        needsReview: false,
        OR: [
          { title: { equals: '' } },
          { NOT: hasLocationLineWhere() },
          { NOT: hasDescriptionWhere() },
          {
            OR: [{ imageUrl: null }, { imageUrl: { equals: '' } }],
          },
          { mergeTargetId: { not: null } },
          {
            AND: [{ confidenceScore: { not: null } }, { confidenceScore: { lt: 0.45 } }],
          },
          {
            AND: [{ lifecycleStatus: 'ACTIVE' }, { isPublished: true }, { isVenuePageWhitelisted: false }],
          },
          coordsMissingWhileHasAddressWhere(),
        ],
      };

    default:
      return {};
  }
}

export function parseVenueReadinessStatusQuery(raw: string | undefined): VenueAdminReadinessStatus | null {
  if (!raw?.trim()) return null;
  const u = raw.trim().toUpperCase();
  if (u === 'READY' || u === 'NEEDS_WORK' || u === 'NEEDS_REVIEW' || u === 'BLOCKED') {
    return u as VenueAdminReadinessStatus;
  }
  return null;
}
