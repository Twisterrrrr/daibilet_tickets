import { Injectable } from '@nestjs/common';
import { DateMode } from '@/prisma-client';

import { CATALOG_CONSISTENCY_CACHE_KEY } from '../catalog/catalog-consistency.service';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Быстрые агрегаты для GET /admin/ops/diagnostics (без тяжёлых обходов подборок).
 * Числа empty* при наличии свежего кэша consistency берутся из него.
 */
@Injectable()
export class AdminDiagnosticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getFastDiagnostics() {
    const now = new Date();
    const baseListable = {
      isActive: true,
      isDeleted: false,
      canonicalOfId: null,
    } as const;

    const [
      totalEvents,
      withoutSubcategories,
      withoutLocation,
      withoutOffers,
      withoutSessions,
    ] = await Promise.all([
      this.prisma.event.count({ where: baseListable }),
      this.prisma.event.count({
        where: {
          ...baseListable,
          subcategoryLinks: { none: {} },
          subcategories: { isEmpty: true },
        },
      }),
      this.prisma.event.count({
        where: {
          ...baseListable,
          venueId: null,
          startLocationId: null,
          OR: [{ address: null }, { address: '' }],
          lat: null,
          lng: null,
        },
      }),
      this.prisma.event.count({
        where: { ...baseListable, offers: { none: {} } },
      }),
      this.prisma.event.count({
        where: {
          ...baseListable,
          dateMode: DateMode.SCHEDULED,
          sessions: { none: { isActive: true, startsAt: { gte: now } } },
        },
      }),
    ]);

    type ConsistencyPayload = {
      selection?: {
        activeCollectionsWithZeroEligibleEvents?: number;
        activeLandingsWithZeroEligibleEvents?: number;
      };
    };

    const cached = await this.cache.get<ConsistencyPayload>(CATALOG_CONSISTENCY_CACHE_KEY);
    const fromCache = cached != null && cached.selection != null;

    const emptyCollections = fromCache
      ? Number(cached.selection?.activeCollectionsWithZeroEligibleEvents ?? 0)
      : null;
    const emptyLandings = fromCache
      ? Number(cached.selection?.activeLandingsWithZeroEligibleEvents ?? 0)
      : null;

    return {
      catalog: {
        totalEvents,
        withoutSubcategories,
        withoutLocation,
        withoutOffers,
        withoutSessions,
      },
      collections: {
        emptyCollections,
      },
      landings: {
        emptyLandings,
      },
      meta: {
        emptyFromConsistencyCache: fromCache,
        hint: fromCache
          ? null
          : 'emptyCollections/emptyLandings заполнены после прогона GET /admin/catalog/consistency (кэш)',
      },
    };
  }
}
